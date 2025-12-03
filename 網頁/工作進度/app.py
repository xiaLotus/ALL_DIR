from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import sqlite3
import json, base64
from datetime import datetime
from uuid import uuid4
from ldap3 import Server, Connection, ALL, NTLM # type: ignore
from ldap3.core.exceptions import LDAPException, LDAPBindError # type: ignore
from waitress import serve

app = Flask(__name__)

CORS(app)

DATA_FOLDER = 'data'
os.makedirs(DATA_FOLDER, exist_ok=True)


def authenticate_user(username, password):
    try:
        server = Server('ldap://KHADDC02.kh.asegroup.com', get_info = ALL)
        # 使用 NTLM
        user = f'kh\\{username}'
        password = f'{password}'

        # 建立連接
        conn = Connection(server, user = user, password = password, authentication = NTLM)

        # 嘗試綁定
        if conn.bind():
            # app.logger.info(f"User {username} login successful.")
            return True
        else:
            # app.logger.warning(f"Login failed for user {username}: {conn.last_error}")
            return False
    except Exception as e:
        # app.logger.error(f"Error during authentication for user {username}: {e}")
        return False



def get_user_db(username):
    safe_name = username.replace("/", "_").replace("\\", "_")
    return os.path.join(DATA_FOLDER, f"user_{safe_name}.db")

def init_user_db(db_path):
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY,
            title TEXT,
            sort_order INTEGER
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS timeline (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER,
            html TEXT,
            raw_html TEXT,
            timestamp TEXT,
            FOREIGN KEY(task_id) REFERENCES tasks(id)
        )
    ''')
    conn.commit()
    conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    # 從資料中提取用戶名和密碼
    username = data.get('username')
    password = data.get('password')
    print("username: ", username, "password: ", password)
    
    if authenticate_user(username, password):
        db_path = get_user_db(username)
        init_user_db(db_path)
        return jsonify({"success": True})
    else:
        return jsonify({"success": False})


    

@app.route('/api/load/<username>', methods=['GET'])
def load_data(username):
    db_path = get_user_db(username)
    if not os.path.exists(db_path):
        return jsonify([])

    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    # c.execute('SELECT id, title FROM tasks')
    c.execute('SELECT id, title FROM tasks ORDER BY sort_order ASC')
    tasks = []
    for task_id, title in c.fetchall():
        c.execute('''
            SELECT html, raw_html, timestamp
            FROM timeline
            WHERE task_id = ?
            ORDER BY rowid DESC
        ''', (task_id,))
        timeline = [
            {
                "html": html,
                "rawHtml": raw_html,
                "timestamp": timestamp,
                "isEditing": False,
                "editRef": None
            }
            for html, raw_html, timestamp in c.fetchall()
        ]
        tasks.append({"id": task_id, "title": title, "timeline": timeline})
    conn.close()
    return jsonify(tasks)


@app.route('/api/save/<username>', methods=['POST'])
def save_data(username):
    db_path = get_user_db(username)
    data = request.get_json()
    init_user_db(db_path)

    conn = sqlite3.connect(db_path, timeout=5)
    c = conn.cursor()
    c.execute('DELETE FROM timeline')
    c.execute('DELETE FROM tasks')

    for idx, task in enumerate(data):  # 👈 多了 idx 代表順序
        c.execute('INSERT INTO tasks (title, sort_order) VALUES (?, ?)', (task['title'], idx))
        task_id = c.lastrowid
        for entry in reversed(task.get('timeline', [])):
            c.execute('''
                INSERT INTO timeline (task_id, html, raw_html, timestamp)
                VALUES (?, ?, ?, ?)
            ''', (task_id, entry['html'], entry.get('rawHtml', entry['html']), entry['timestamp']))


    conn.commit()
    conn.close()
    return jsonify({"success": True})



@app.route('/api/delete/<username>', methods=['POST'])
def delete_data(username):
    db_path = get_user_db(username)
    if os.path.exists(db_path):
        os.remove(db_path)
        return jsonify({"success": True, "message": "資料庫已刪除"})
    return jsonify({"success": False, "message": "資料庫不存在"}), 404

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

if __name__ == '__main__':
    app.run(debug=True)
