from flask import Flask, request, jsonify
from flask_cors import CORS
import json


app = Flask(__name__)
CORS(app)   # 允許跨來源（必要）

# 讀取 emoinfo.json
with open(rf"D:\Data\WindowsAD_Login\emoinfo.json", "r", encoding="utf-8-sig") as f:
    user_list = json.load(f)

# 將 JSON 轉成 dict {工號: {...}}
users = {item["工號"]: item for item in user_list}


@app.route('/api/check_user', methods=['GET'])
def check_user():
    user = request.args.get("user", "")

    if user in users:
        return jsonify({
            "status": "ok",
            "工號": users[user]["工號"],
            "姓名": users[user]["姓名"]
        })
    else:
        return jsonify({"status": "not_found"})

if __name__ == '__main__':
    app.run(host='10.11.104.247', port=8089)
