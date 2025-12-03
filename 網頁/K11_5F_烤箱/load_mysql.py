import json
import os
import re

# 要尋找的行開頭字串
target_line_start = 'frmInputMsg.btn_Define_Click → cmdMySQL_Oven_QueryArea'

# 從檔案中讀取並解析 JSON
def parse_json_from_file(filename, target_string):
    with open(filename, 'r', encoding='utf-8-sig') as f:
        for line in f:
            if target_string in line:
                # 1. 擷取 SelectCommand 後面的 SQL 命令
                command = line.split('SelectCommand=')[1].strip()

                # 2. 從 SQL 命令中，擷取 JSON 字串
                # 找到 JSON 內容的起始與結束位置
                json_start_index = command.find('mach_remark=\'') + len('mach_remark=\'')
                json_end_index = command.rfind("' where mach_name=")
                json_string = command[json_start_index:json_end_index]

                try:
                    # 3. 解析 JSON 字串
                    json_data = json.loads(json_string)
                    return json_data
                except json.JSONDecodeError as e:
                    print(f"JSON 解析錯誤：{e}")
                    return None
    return None

# 根據 Remark 把 log 寫入對應的 KXX 節點的 history
def update_data_json(data_filename, logs):
    if not os.path.exists(data_filename):
        print(f"找不到 {data_filename}")
        return

    # 讀取原始 Bank 資料
    with open(data_filename, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 逐筆 log 寫入對應機構節點的 history
    for log in logs:
        remark = log.get("Remark", "")
        match = re.search(r"(K\d+)", remark)
        if match:
            kcode = match.group(1)
            found = False
            for bank_nodes in data.values():
                if kcode in bank_nodes:
                    bank_nodes[kcode]["history"].append(log)
                    found = True
                    break
            if not found:
                print(f"⚠️ 無法在 Bank 中找到對應機構 {kcode}")
        else:
            print(f"⚠️ 無法從 Remark 中擷取機構代號: {remark}")

    # 回寫回 data.json
    with open(data_filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✅ 已寫入 {data_filename}")

# 執行函式並印出結果
json_output = parse_json_from_file('MySQL_0807.csv', target_line_start)

if json_output:
    print("✅ 成功從檔案中解析出 JSON 內容")
    update_data_json("data.json", json_output)
else:
    print("❌ 無法找到或解析 JSON")