from flask import Flask, jsonify, request, send_from_directory
import os
import json
import re
from collections import defaultdict
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
DATA_DIR = './configs'

@app.route("/api/machine-configs", methods=["GET"])
def get_machine_configs():
    # 正則，取得棟別和樓層
    pattern = re.compile(r"^(K\d+)-(\d+F)-.*\.json$")
    building_floors = defaultdict(set)

    for filename in os.listdir(DATA_DIR):
        if filename.endswith(".json"):
            match = pattern.match(filename)
            if not match:
                continue
            building, floor = match.groups()
            building_floors[building].add(floor)

    result = {
        building: sorted(floors, key=lambda f: int(f.rstrip('F')))
        for building, floors in building_floors.items()
    }

    return jsonify(result)

# 默認data
@app.route("/api/load_all_data", methods=["GET"])
def load_all_data():
    try:
        with open(f'{DATA_DIR}/Kall-all-3LED.json', "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, list):
                return jsonify({"error": "JSON 格式錯誤，應為陣列"}), 400
            return jsonify(data)
    except FileNotFoundError:
        return jsonify({"error": "找不到 all.json"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/<building>/<floor>")
def get_building_floor_data(building, floor):
    filepath = f"{DATA_DIR}/{building}-{floor}-3LED.json"
    try:
        with open(filepath, 'r', encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/add-machine", methods=["POST"])
def add_machine():
    data = request.get_json()

    try:
        # 整體增加
        with open(f'{DATA_DIR}/Kall-all-3LED.json', "r", encoding="utf-8") as f:
            all_data = json.load(f)
        all_data.append(data)
        with open(f"{DATA_DIR}/Kall-all-3LED.json", "w", encoding="utf-8") as f:
            json.dump(all_data, f, ensure_ascii=False, indent=2)

        # 資料清空
        all_data = []

        site_file = os.path.join(DATA_DIR, f'{data["Site"]}-3LED.json')
        if not os.path.exists(site_file):
            with open(site_file, "w", encoding="utf-8") as f:
                json.dump([], f, ensure_ascii=False, indent=2)

        # 個別資訊導入
        with open(f'{DATA_DIR}/{data["Site"]}-3LED.json', "r", encoding="utf-8") as f:
            all_data = json.load(f)

        all_data.append(data)

        with open(f'{DATA_DIR}/{data["Site"]}-3LED.json', "w", encoding="utf-8") as f:
            json.dump(all_data, f, ensure_ascii=False, indent=2)


        return jsonify({"message": "新增成功"}), 200
    except Exception as e:
        print("❌ 寫入失敗：", e)
        return jsonify({"error": str(e)}), 500




if __name__ == "__main__":
    app.run(debug=True)