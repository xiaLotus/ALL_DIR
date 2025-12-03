from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
from ldap3 import Server, Connection, ALL, NTLM # type: ignore
from ldap3.core.exceptions import LDAPException, LDAPBindError # type: ignore

app = Flask(__name__)
CORS(app)  # 允許所有來源跨域請求

DATA_FILE = f"Backend_data.json"

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

# 取得AD帳號
@app.route('/api/login', methods=['POST'])
def get_current_user():
    data = request.get_json()
    
    # 從資料中提取用戶名和密碼
    username = data.get('username')
    password = data.get('password')
    print(username, password)
    
    if authenticate_user(username, password):
        return jsonify({"success": True, "message": "登入成功!"})
    else:
        return jsonify({"success": False, "message": "帳號或密碼錯誤，請重新輸入"})




@app.route('/api/data', methods=['GET'])
def get_employees():
    try:
        with open(DATA_FILE, 'r', encoding='utf-8-sig') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route("/api/data/<id>", methods=["PUT"])
def update_data(id):
    try:
        # 讀入新資料
        new_data = request.get_json()
        print(f"收到 PUT：id={id}")
        print("新資料內容：", new_data)

        # 檢查 JSON 檔案是否存在
        if not os.path.exists(DATA_FILE):
            return jsonify({"error": "找不到 Backend.json 檔案"}), 500

        # 讀取 JSON 資料
        with open(DATA_FILE, "r", encoding="utf-8-sig") as f:
            data = json.load(f)

        # 尋找並更新目標資料
        found = False
        for i, item in enumerate(data):
            if item.get("工號") == id:
                data[i] = new_data
                found = True
                break

        if not found:

            return jsonify({"error": f"找不到工號 {id}"}), 404

        # 寫回 JSON
        with open(DATA_FILE, "w", encoding="utf-8-sig") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return jsonify({"message": "更新成功"}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500



@app.route("/api/add_data/<id>", methods=["PUT"])
def add_data(id):
    new_item = request.get_json()

    new_item['Notes_ID'] = f"{new_item['Notes_ID']}@aseglobal.com"

    try:
        with open(DATA_FILE, "r", encoding="utf-8-sig") as f:
            data = json.load(f)

        data.append(new_item)

        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return jsonify({"message": "新增成功"}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500



if __name__ == '__main__':
    app.run(debug=True)