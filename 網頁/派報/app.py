from flask import Flask, request, jsonify
import json
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATA_FILE = r'static\data\data.json'

def load_data_file():
    if not os.path.exists(DATA_FILE):
        return { 'groups': [] }
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if 'groups' not in data or not isinstance(data['groups'], list):
                return { 'groups': [] }
            return data
    except:
        return { 'groups': [] }

def save_data_file(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

@app.route('/load', methods=['GET'])
def load_data():
    data = load_data_file()
    return jsonify(data)

@app.route('/add_group', methods=['POST'])
def add_group():
    group = request.json
    data = load_data_file()
    data['groups'].append(group)
    save_data_file(data)
    return jsonify({'message': '群組新增成功'})

@app.route('/add_record', methods=['POST'])
def add_record():
    req = request.json
    if not req:
        return jsonify({'message': '出現異常錯誤'})
    groupId = req['groupId'] 
    record = req['record'] 
    data = load_data_file()
    for group in data['groups']:
        if group['id'] == groupId:
            group['submittedData'].insert(0, record)
            break
    save_data_file(data)
    return jsonify({'message': '資料新增成功'})

@app.route('/update_order', methods=['POST'])
def update_order():
    req = request.json
    if not req:
        return jsonify({'message': '出現異常錯誤'})
    groupId = req['groupId'] 
    newOrder = req['newOrder']
    data = load_data_file()
    for group in data['groups']:
        if group['id'] == groupId:
            group['submittedData'] = newOrder
            break
    save_data_file(data)
    return jsonify({'message': '順序更新成功'})

@app.route('/delete_record', methods=['POST'])
def delete_record():
    req = request.json
    if not req:
        return jsonify({'message': '出現異常錯誤'})
    groupId = req['groupId'] 
    recordIndex = req['recordIndex'] 
    data = load_data_file()
    for group in data['groups']:
        if group['id'] == groupId:
            if 0 <= recordIndex < len(group['submittedData']):
                group['submittedData'].pop(recordIndex)
            break
    save_data_file(data)
    return jsonify({'message': '單筆資料刪除成功'})

@app.route('/clear_group_records', methods=['POST'])
def clear_group_records():
    req = request.json
    if not req:
        return jsonify({'message': '出現異常錯誤'})
    groupId = req['groupId']
    data = load_data_file()
    for group in data['groups']:
        if group['id'] == groupId:
            group['submittedData'] = []
            break
    save_data_file(data)
    return jsonify({'message': '該群組已清空'})

@app.route('/delete_group', methods=['POST'])
def delete_group():
    req = request.json
    if not req:
        return jsonify({'message': '出現異常錯誤'})
    groupId = req['groupId']
    data = load_data_file()
    data['groups'] = [g for g in data['groups'] if g['id'] != groupId]
    save_data_file(data)
    return jsonify({'message': '群組刪除成功'})

if __name__ == '__main__':
    app.run(debug=True)
