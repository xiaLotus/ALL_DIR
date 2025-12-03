import csv
from datetime import datetime, timedelta
import os
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import pandas as pd
import re
import numpy as np
import win32api
import json
from ldap3 import Server, Connection, ALL, NTLM # type: ignore
from ldap3.core.exceptions import LDAPException, LDAPBindError # type: ignore
import urllib.parse 
import quopri 
import os
import shutil
import io
from tabulate import tabulate  # ✅ 新增 tabulate

app = Flask(__name__)
CORS(app)

CSV_FILE = "static/data/Total_(Security C).csv"
# 為了下載多弄一個
csv_path = "CSV_File"
app.config['CSV_FILE'] = csv_path
file_mapping = {
    '專案匯出_(Security C).xlsx': f'Total_(Security C).csv',
}

# # 節點控制暫時使用
# SAVE_FOLDER = './saved_data'
# os.makedirs(SAVE_FOLDER, exist_ok=True)



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
    


def load_proposals_from_csv():
    # **手動讀取 CSV，確保 `進度紀錄` 欄位內部的 `\n` 不影響解析**
    with open(CSV_FILE, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f, skipinitialspace=True)
        rows = list(reader)

    # **解析標題**
    headers = [h.strip().replace("\r", "").replace("\n", "") for h in rows[0]]  # 清除空格與換行符
    data = []

    # **確保 "回覆備註" 欄位存在**
    if "進度紀錄" not in headers:
        raise KeyError(f"❌ 找不到 '進度紀錄' 欄位，當前 CSV 欄位名稱: {headers}")

    remarks_index = headers.index("進度紀錄")  # 找到 "回覆備註" 的索引

    # **處理數據**
    for row in rows[1:]:
        while len(row) < len(headers):  # **確保所有欄位長度一致**
            row.append("")  # 補齊缺少的值，避免 IndexError

        row_data = dict(zip(headers, row))  # **轉為字典結構**
        raw_remarks = row[remarks_index]  # 取得回覆備註內容

        def split_remarks(text):
            """解析回覆備註，確保日期格式完整保留"""
            if not text or text.strip() == "":
                return []
            text = text.strip().strip('"')

            # **使用正則表達式拆分回覆備註**
            # remarks = re.findall(r'(\d{1,2}/\d{1,2}: .*?)(?=\d{1,2}/\d{1,2}:|$)', text.replace("\n", " "), re.DOTALL)
            remarks = re.split(r'(\d{1,2}/\d{1,2}:)', text)
            # print(remarks)

            # return [remark.strip().replace("\n", "<br>") for remark in remarks]
                # 進行整理，合併日期與其後的內容
            result = []
            for i in range(1, len(remarks), 2):
                if i + 1 < len(remarks):
                    # 組合日期與內容，並去除多餘的空白字符
                    result.append(f"{remarks[i].strip()} {remarks[i + 1].strip()}")

            return result

        row_data["進度紀錄"] = split_remarks(raw_remarks)  # **解析回覆備註**
        data.append(row_data)
    for item in data:
    # 去除每個 key 開頭的 BOM 字符
        item = {key.replace('\ufeff', ''): value for key, value in item.items()}
    return data  # **回傳 JSON 格式的資料**



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


@app.route('/api/weekly-summary')
def weekly_summary():
    df = pd.read_csv("static/data/Total_(Security C).csv", encoding="utf-8-sig", parse_dates=["提案日期", "Due"])
    df["後端確認"] = df["後端確認"].str.lower().str.strip().replace({"tbd": "on going"})
    df["Due_有效"] = pd.to_datetime(df["Due"], errors="coerce")

    # 計算提案週起始日 (提案日那一週的禮拜一)
    df["提案週起始日"] = df["提案日期"].dt.to_period("W").apply(lambda p: p.start_time)
    df["提案週次"] = df["提案週起始日"].dt.strftime("%G-W%V")

    # 建立 Due 的週次 (如果有Due才算)
    df["Due週起始日"] = pd.NaT
    mask = df["Due_有效"].notna()
    df.loc[mask, "Due週起始日"] = df.loc[mask, "Due_有效"].dt.to_period("W").apply(lambda p: p.start_time)
    df["Due週次"] = df["Due週起始日"].dt.strftime("%G-W%V")

    # 建立今天的週起始日
    today = datetime.today()
    today_week_start = today - timedelta(days=today.weekday())

    # 最近8週的每週一
    weeks = pd.date_range(end=today_week_start, periods=8, freq="W-MON")
    weeks_label = weeks.strftime("%G-W%V").tolist()

    # 初始化結果
    summary = []

    for week_start in weeks:
        week_end = week_start + timedelta(days=7)
        week_label = week_start.strftime("%G-W%V")

        # 當週完成 (Due在這週範圍內且狀態是done)
        done = df[
            (df["後端確認"] == "done") &
            (df["Due_有效"] >= week_start) &
            (df["Due_有效"] < week_end)
        ]

        # 當週On Going (只要提案日<=本週結束且狀態不是done就算ongoing)
        ongoing = df[
            (df["提案日期"] <= week_end) &
            (df["後端確認"] != "done")
        ]

        # 累積逾期 (ongoing且Due有設定且Due小於這週週一)
        overdue = ongoing[
            (ongoing["Due_有效"].notna()) &
            (ongoing["Due_有效"] < week_start)
        ]

        summary.append({
            "週次": week_label,
            "週起始日": week_start.strftime("%Y-%m-%d"),
            "done": len(done),
            "on going": len(ongoing),
            "累積逾期數": len(overdue)
        })

    # 包成 dict list 輸出
    result = {key: [item[key] for item in summary] for key in summary[0].keys()}

    return jsonify(result)


@app.route('/api/weekly_work_detail')
def weekly_work_detail():
    df = pd.read_csv('static/data/Total_(Security C).csv', encoding='utf-8-sig', parse_dates=["提案日期", "Due"])
    df["後端確認"] = df["後端確認"].str.lower().str.strip().replace({"tbd": "on going"})
    df["Due_有效"] = pd.to_datetime(df["Due"], errors="coerce")

    today = datetime.today()
    today_week_start = today - timedelta(days=today.weekday())
    weeks = pd.date_range(end=today_week_start, periods=8, freq="W-MON")

    summary = []

    for week_start in weeks:
        week_end = week_start + timedelta(days=6)
        week_label = week_start.strftime("%G-W%V")

        # 新增案件
        weekly_new = df[(df["提案日期"] >= week_start) & (df["提案日期"] <= week_end)]

        # 完成案件
        weekly_done = df[
            (df["後端確認"] == "done") &
            (df["Due_有效"] >= week_start) &
            (df["Due_有效"] <= week_end)
        ]

        # 本週Due逾期案件
        overdue_in_this_week = df[
            ((df["Due_有效"] >= week_start) & (df["Due_有效"] <= week_end) & (df["後端確認"] != "done") & (df["Due_有效"] < today)) |
            ((df["Due_有效"] >= week_start) & (df["Due_有效"] <= week_end) & (df["後端確認"] == "TBD"))
        ]

        # # 每一週的結果漂亮列印
        # print(f"\n{'='*70}")
        # print(f"【{week_label}】")

        # print(f"\n👉 新增案件數: {len(weekly_new)}")
        # if not weekly_new.empty:
        #     print(tabulate(weekly_new[["總表項次", "提案日期", "Due", "後端確認"]], headers='keys', tablefmt='grid', showindex=False))

        # print(f"\n✅ 完成案件數: {len(weekly_done)}")
        # if not weekly_done.empty:
        #     print(tabulate(weekly_done[["總表項次", "提案日期", "Due", "後端確認"]], headers='keys', tablefmt='grid', showindex=False))

        # print(f"\n⏳ 本週Due逾期數: {len(overdue_in_this_week)}")
        # if not overdue_in_this_week.empty:
        #     print(tabulate(overdue_in_this_week[["總表項次", "提案日期", "Due", "問題描述", "後端確認"]], headers='keys', tablefmt='grid', showindex=False))

        # print(f"{'='*70}\n")

        summary.append({
            "週次": week_label,
            "新增案件數": len(weekly_new),
            "完成案件數": len(weekly_done),
            "本週Due逾期數": len(overdue_in_this_week)
        })

    return jsonify(summary)


# delay_detail/delaymsg.html 的表格區塊
@app.route('/api/delay-details')
def delay_details():
    proposals = load_proposals_from_csv()

    today = datetime.today()
    today_week_start = today - timedelta(days=today.weekday())

    overdue_list = []

    for item in proposals:
        due_str = item.get("Due")
        status = item.get("後端確認", "").lower()

        if due_str and status != "done":
            try:
                # ✅ 解析成日期
                due_date = pd.to_datetime(str(due_str), format="%Y%m%d", errors="coerce")
                if pd.notna(due_date) and due_date < today_week_start:
                    overdue_list.append(item)
            except Exception as e:
                print(f"❗ 解析 Due 日期錯誤: {due_str}，錯誤訊息: {e}")

    # ✅ 排序（按照 Due 原始字串順序）
    overdue_list.sort(key=lambda x: x.get("Due", ""))

    # print("✅ 最後上傳的逾期資料:", overdue_list)

    return jsonify(overdue_list)




@app.route('/api/proposals', methods=['GET'])
def get_proposals():
    proposals = load_proposals_from_csv()
    # print(proposals)
    return jsonify(proposals)


@app.route('/api/submit', methods=['POST'])
def submit_form():
    # global user, password
    # print(user, password)
    # if user not in USERNAME:
    #     return jsonify({"message": "權限不足"}), 502
    # 獲取前端提交的資料
    data = request.get_json()

    # 這裡可以將資料進行處理，例如儲存到資料庫
    print('接收到的資料:', data)

    try:
        df = pd.read_csv(f'{CSV_FILE}')
    except FileNotFoundError:
        df = pd.DataFrame(columns=data.keys())
    columns = [
        '總表項次', '提案日期', '棟別', '樓層', '站點', '類別', '提案人', '案件分類', '問題描述',
        'PDCA', 'StatusOwner', 'Owner部門', 'Due', '項目Owner', '項目 Due Date', '進度紀錄', '後端確認'
    ]
    today_date = datetime.now().strftime('%Y%m%d')
    # 加上時間
    today_count = len(df[df['總表項次'].str.startswith(today_date)])
    total_item = f"{today_date}_{today_count + 1:02d}"
    data['總表項次'] = total_item

    ordered_data = {col: data.get(col, '') for col in columns}  


    # 將新資料轉換為 DataFrame 並附加到現有的資料中
    # new_row = pd.DataFrame([data])
    new_row = pd.DataFrame([ordered_data])
    df = pd.concat([new_row, df], ignore_index=True)
    
    # 將更新後的資料寫回到 CSV 檔案中
    df.to_csv(f'{CSV_FILE}', index=False, encoding='utf-8-sig')

    # 假設資料儲存成功，返回一個成功訊息
    return jsonify({'message': '資料提交成功', 'data': data}), 200


@app.route('/api/del_proposal', methods=['POST'])
def del_proposal():
    # global user, password
    # print(user, password)
    # if user not in USERNAME:
    #     return jsonify({"message": "權限不足"}), 502
    data = request.get_json()
    total_item_id = data.get('總表項次')  
    try:
        df = pd.read_csv(f'{CSV_FILE}')
    except FileNotFoundError:
        df = pd.DataFrame(columns=data.keys())
    print(data)

    df = df[df['總表項次'] != total_item_id]
    df.to_csv(CSV_FILE, index=False)


    return jsonify({'message': '資料提交成功'}), 200



@app.route('/api/proposals/<item_id>', methods=['PUT'])
def update_proposal(item_id):
    """ 更新指定 `總表項次` 的提案資料 """

    updated_data = request.json
    # print(item_id)
    updated_data.pop('進度紀錄', None)  # 如果 '進度紀錄' 存在就删除它
    updated_item = {key: (value if value is not None else '') for key, value in updated_data.items()}
    try:
        df = pd.read_csv(f'{CSV_FILE}',  dtype=str)  
        df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
    except FileNotFoundError:
        return jsonify({"message": "文件未找到"}), 404
    
        # 强制将所有列的数据类型转换为字符串
    df = df.astype(str)
    index = df[df['總表項次'] == updated_item['總表項次']].index
    if not index.empty:
        # 在更新前，检查是否存在 "TBD" 或其他无效日期字段
        if '提案日期' in updated_item:
            if updated_item['提案日期'] != 'TBD':  # 排除无效日期
                updated_item['提案日期'] = pd.to_datetime(updated_item['提案日期'], format='%Y%m%d')
        if 'Due' in updated_item:
            # if updated_item['Due'] != 'TBD':  # 排除无效日期
            #     updated_item['Due'] = pd.to_datetime(updated_item['Due'], format='%Y%m%d')
            if updated_item['Due'] != 'TBD':  # 排除无效日期
                try:
                    updated_item['Due'] = pd.to_datetime(updated_item['Due'], format='%Y%m%d', errors='raise')
                except ValueError:
                    updated_item['Due'] = ''
        
        # 進度紀錄 該位置保持不動，但要處理回傳時的倒續
        # if '進度紀錄' in updated_item:
        #     progress_list = updated_item['進度紀錄']
        #     if isinstance(progress_list, list):
        #         updated_item['進度紀錄'] = ''.join(progress_list[::-1])


        # 确保目标列的类型为字符串类型，避免与 int64 类型冲突
        if '提案日期' in df.columns:
            df['提案日期'] = df['提案日期'].astype(str)
        if 'Due' in df.columns:
            df['Due'] = df['Due'].astype(str)
        if '站點' in df.columns:
            df['站點'] = df['站點'].astype(str)
        

        # 更新对应的行
        for key, value in updated_item.items():
            # 如果值为空字符串或None，处理为NaN
            if value == '' or value is None:
                value = np.nan  # 使用NaN代替空字符串，避免数据类型冲突

            # 如果是日期字段，确保将其转换为字符串后再更新
            if isinstance(value, pd.Timestamp):
                df.at[index[0], key] = value.strftime('%Y%m%d')  # 转换回字符串格式
            else:
                df.at[index[0], key] = str(value)  # 确保其他字段更新为字符串

        # 将更新后的 DataFrame 写回 CSV 文件
        df.to_csv(f'{CSV_FILE}', index=False, encoding='utf-8-sig')

        return jsonify({"message": "更新成功", "data": updated_item}), 200
    else:
        return jsonify({"message": "項次未找到"}), 404


# 針對更新進度，更新在末尾
@app.route('/api/proposals_new_progress/<item_id>', methods=['POST'])
def proposals_new_progress(item_id):
    updated_data = request.json
    new_progress = updated_data.get('progress')
    df = pd.read_csv(f"{CSV_FILE}")
    mask = df['總表項次'] == item_id

    # 如果找到對應的總表項次
    if mask.any():
            # 取得原來的進度紀錄
        existing_progress = df.loc[mask, '進度紀錄'].values[0]
        print(existing_progress)

            # 如果進度紀錄為空字符串，直接輸入新進度
        if existing_progress == "" or pd.isna(existing_progress):  
            updated_progress = new_progress
        else:
            # 檢查新進度是否已經存在於現有進度紀錄中
            if new_progress not in existing_progress:
                # 追加新進度到現有的進度紀錄，避免重複寫入
                updated_progress = existing_progress + '\n' + new_progress

            else:
                return jsonify({'message': '該進度紀錄已存在，無需重複更新'}), 200

            # 更新進度紀錄欄位
        df.loc[mask, '進度紀錄'] = updated_progress

            # 只將變更的部分寫回 CSV 檔案，避免重複資料
        df.to_csv(f"{CSV_FILE}", index=False, encoding='utf-8-sig')

        return jsonify({'message': '進度紀錄已成功更新'}), 200
    else:
        return jsonify({'message': '未找到對應的總表項次'}), 404


@app.route('/api/update_lastest_status_report', methods=['POST'])
def update_lastest_status_report():
    # global user, password
    # print(user, password)
    # if user not in USERNAME:
    #     return jsonify({"message": "權限不足"}), 502
    try:
        data = request.get_json()
        item = data['總表項次']
        new_process = data['LastOldProcess']
        df = pd.read_csv(f"{CSV_FILE}")
        mask = df['總表項次'] == item
        # Apply the mask to filter the dataframe for rows where '總表項次' matches the item
        filtered_df = df[mask]
        final_records = []
        current_record = ""
        # Check if any rows match the condition
        if not filtered_df.empty:
            filtered_df = filtered_df['進度紀錄'].iloc[0]
            records = re.split(r'(\d{1,2}/\d{1,2}:)', filtered_df)


            for item in records:
                # 檢查是否是日期（例如 10/23:）
                if re.match(r'\d{1,2}/\d{1,2}:', item):
                    if current_record:
                        final_records.append(current_record.strip())
                    # 開始新的紀錄，將日期與內容結合
                    current_record = item.strip()  
                else:
                    # 將其他進度條目合併進當前紀錄
                    current_record += " " + item.strip()

        # # 加入最後一條紀錄
        if current_record:
            final_records.append(current_record.strip())
  

            final_records[-1] = new_process.strip()
            combined_progress = "\n".join(final_records)

            # 更新該行的進度紀錄欄位
            df.loc[mask, '進度紀錄'] = combined_progress

            # 將更新後的 DataFrame 儲存回 CSV 檔案
            df.to_csv(f"{CSV_FILE}", index=False)

        else:
            print("No matching records found.")

        return jsonify({'message': '進度紀錄已成功更新'}), 200
    
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/del_process_end', methods=['POST'])
def del_process_end():
    # global user, password
    # print(user, password)
    # if user not in USERNAME:
    #     return jsonify({"message": "權限不足"}), 502
    try:
        data = request.get_json()
        df = pd.read_csv(f"{CSV_FILE}")
        mask = df['總表項次'] == data["總表項次"]
        matched_row = df[mask]
        if not matched_row.empty:
            # 提取 '進度紀錄' 字段
            matched_record = matched_row['進度紀錄'].iloc[0]
            records = re.split(r'(\d{1,2}/\d{1,2}:)', matched_record)
            
            final_records = []
            current_record = ""

            for item in records:
                # 檢查是否是日期（例如 10/23:）
                if re.match(r'\d{1,2}/\d{1,2}:', item):
                    if current_record:
                        final_records.append(current_record.strip())
                    # 開始新的紀錄，將日期與內容結合
                    current_record = item.strip()  
                else:
                    # 將其他進度條目合併進當前紀錄
                    current_record += " " + item.strip()

        # # 加入最後一條紀錄
        if current_record:
            final_records.append(current_record.strip())
  

            final_records.pop()
            combined_progress = "\n".join(final_records)

            # 更新該行的進度紀錄欄位
            df.loc[mask, '進度紀錄'] = combined_progress

            # 將更新後的 DataFrame 儲存回 CSV 檔案
            df.to_csv(f"{CSV_FILE}", index=False)

        return jsonify({'message': '進度紀錄已成功更新'}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

# 下載檔案的 API 路由
@app.route('/api/download/<filename>', methods=['GET'])
def download_file(filename):
    try:
        # 解碼URL中的特殊字符
        decoded_filename = urllib.parse.unquote(filename)

        # 打印來調試解碼結果
        print(f"Decoded filename: {decoded_filename}")

        # 如果映射中有對應的檔案
        if decoded_filename in file_mapping:
            # 根據顯示名稱取出對應的實際檔案名稱
            local_filename = file_mapping[decoded_filename]
            print(f"Local filename found: {local_filename}")
        else:
            return jsonify({'error': 'File not found in mapping'}), 404
        
        # 轉換 CSV 檔案為 Excel 檔案 (.xlsx)
        csv_file_path = os.path.join(app.config['CSV_FILE'], local_filename)
        copied_csv_file_path = os.path.join(app.config['CSV_FILE'], 'temp_' + local_filename)

        shutil.copy(csv_file_path, copied_csv_file_path)
        print(f"CSV file copied to: {copied_csv_file_path}")

        df = pd.read_csv(copied_csv_file_path)


        output = io.BytesIO()
        df.to_excel(output, index=False, engine='openpyxl')  

        output.seek(0)
        response = send_file(output, as_attachment=True, download_name=f'{decoded_filename.replace(".csv", ".xlsx")}', mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        os.remove(copied_csv_file_path)

        return response
    except FileNotFoundError:
        return jsonify({'error': 'File not found'}), 404




### 節點控制
@app.route('/load_json/<proposalPeople>/<problemDescription>', methods=['GET'])
def load_json(proposalPeople, problemDescription):
    try:
        node_path = f"static/data/{proposalPeople}"
        os.makedirs(node_path, exist_ok=True)

        filepath = os.path.join(node_path, f'{problemDescription}.json')

        # 如果檔案不存在，建立一個預設的
        if not os.path.exists(filepath):
            default_data = {
                "position": "",
                "title": f"{problemDescription}",
                "completed": False,
                "children": []
            }
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(default_data, f, ensure_ascii=False, indent=2)

            return jsonify({'status': 'success', 'data': default_data})

        # 如果有檔案，就讀取回傳
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        return jsonify({'status': 'success', 'data': data})
    except Exception as e:
        print('Load error:', e)
        return jsonify({'status': 'fail', 'message': str(e)}), 500



@app.route('/save_json/<proposalPeople>/<problemDescription>', methods=['POST'])
def save_json(proposalPeople, problemDescription):
    data = request.get_json()

    if data is None:
        return jsonify({'status': 'fail', 'message': 'No data received'}), 400

    try:
        node_path = f"static/data/{proposalPeople}"
        filepath = os.path.join(node_path, f'{problemDescription}.json')

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return jsonify({'status': 'success', 'message': 'Data saved successfully!'})
    except Exception as e:
        print('Save error:', e)
        return jsonify({'status': 'fail', 'message': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)