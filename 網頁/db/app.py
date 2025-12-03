import random
import shutil
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from loguru import logger
import pandas as pd
import os
import pandas as pd
from sqlalchemy import create_engine, text
from loguru import logger
import shutil
from datetime import datetime, timedelta

# === 資料庫連線設定 ===
db_config = {
    'host': '10.11.104.247',
    'port': 3306,
    'user': 'A3CIM',
    'password': 'A3CIM',
    'database': 'information_schema',  # 查整體資訊
    'charset': 'utf8mb4'
}

engine = create_engine(
    f"mysql+pymysql://{db_config['user']}:{db_config['password']}@"
    f"{db_config['host']}:{db_config['port']}/{db_config['database']}?charset={db_config['charset']}",
    pool_pre_ping=True
)

# === 查詢每個資料庫與表格的大小 ===
sql = """
SELECT 
    table_schema AS Database_Name,
    table_name AS Table_Name,
    ROUND(data_length / 1024 / 1024, 2) AS Data_MB,
    ROUND(index_length / 1024 / 1024, 2) AS Index_MB,
    ROUND((data_length + index_length) / 1024 / 1024, 2) AS Total_MB,
    table_rows AS Rows_Count
FROM information_schema.TABLES
WHERE table_schema NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
ORDER BY Database_Name, Total_MB DESC;
"""
df = pd.read_sql(sql, engine)

app = Flask(__name__, static_folder='.')
CORS(app)


@app.route('/api/database-data')
def get_database_data():
    """API - 取得資料庫資料"""
    # === 從 MySQL 取得 datadir ===
    datadir = r"\\KHA3CIMSEN1\Data\MYSQL_DB"

    # === 取得磁碟空間 ===
    total, used, free = shutil.disk_usage(datadir)
    logger.info(f"💽 磁碟總容量：{total / (1024**3):.2f} GB")
    logger.info(f"🟢 剩餘可用空間：{free / (1024**3):.2f} GB")

    try:
        # 轉換為字典列表
        data = df.to_dict('records')
        
        return jsonify({
            'success': True,
            'message': '資料載入成功',
            'data': data
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'錯誤: {str(e)}',
            'data': []
        }), 500
    

# 🔧 更新 API 端點，從資料庫撈取真實數據
@app.route('/api/daily-growth/<db_name>/<table_name>')
def get_daily_growth(db_name, table_name):
    """
    API - 從指定資料庫的資料表中，取得近 7 天的每日新增筆數。
    會自動嘗試多個常見的時間欄位名稱。
    """
    try:
        dynamic_engine = create_engine(
            f"mysql+pymysql://{db_config['user']}:{db_config['password']}@"
            f"{db_config['host']}:{db_config['port']}/{db_name}?charset={db_config['charset']}"
        )
    except Exception as e:
        logger.error(f"無法連線到資料庫 '{db_name}': {e}")
        return jsonify({'success': False, 'message': f"無法連線到資料庫: {db_name}"}), 500

    # --- 1. 🆕 定義一個可能的日期/時間欄位列表 ---
    # 您可以根據您的實際情況增加或修改這個列表
    possible_time_columns = [
        'created_at',
        'CREATED_AT',
        'CREATE_AT',
        'Created_At',
        'create_time',
        'ACCOUNT_DAY'
        'TimeStamp',
        'timestamp',
        'insert_time',
        'update_time',
        'record_time',
        'received_at'
    ]
    
    seven_days_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d 00:00:00')
    result_df = None
    used_column = None

    # --- 2. 🆕 迴圈嘗試每個可能的欄位名稱 ---
    for time_column in possible_time_columns:
        query = f"""
        SELECT
            DATE(`{time_column}`) AS entry_date,
            COUNT(*) AS daily_count
        FROM
            `{table_name}`
        WHERE
            `{time_column}` >= '{seven_days_ago}'
        GROUP BY
            entry_date
        ORDER BY
            entry_date ASC;
        """
        try:
            with dynamic_engine.connect() as connection:
                result_df = pd.read_sql(text(query), connection)
            
            # 如果查詢成功，記錄使用的欄位名稱並跳出迴圈
            used_column = time_column
            logger.info(f"✅ 在 {db_name}.{table_name} 中成功使用欄位 '{used_column}' 進行查詢。")
            break
        except Exception as e:
            # 如果是因為欄位不存在而失敗，則繼續嘗試下一個
            if "Unknown column" in str(e):
                logger.warning(f"欄位 '{time_column}' 在 {db_name}.{table_name} 中不存在，嘗試下一個...")
                continue
            else:
                # 如果是其他錯誤，則直接拋出
                raise e

    # --- 3. 處理查詢結果 ---
    if result_df is None:
        # 如果所有可能的欄位都嘗試失敗
        msg = f"在資料表 '{table_name}' 中找不到任何可用的時間欄位。"
        logger.error(msg + f" 已嘗試: {possible_time_columns}")
        empty_labels = [(datetime.now() - timedelta(days=i)).strftime('%m/%d') for i in range(6, -1, -1)]
        return jsonify({
            'success': False,
            'message': msg,
            'labels': empty_labels,
            'data': [0] * 7
        })

    # --- 4. 格式化數據以符合圖表需求 (與之前相同) ---
    try:
        date_map = {}
        today = datetime.now()
        for i in range(7):
            d = today - timedelta(days=i)
            date_map[d.strftime('%Y-%m-%d')] = 0
        
        for index, row in result_df.iterrows():
            date_str = pd.to_datetime(row['entry_date']).strftime('%Y-%m-%d')
            if date_str in date_map:
                date_map[date_str] = row['daily_count']
        
        sorted_dates = sorted(date_map.keys())
        labels = [datetime.strptime(d, '%Y-%m-%d').strftime('%m/%d') for d in sorted_dates]
        data = [date_map[d] for d in sorted_dates]

        return jsonify({
            'success': True,
            'labels': labels,
            'data': data
        })
    except Exception as e:
        logger.error(f"處理查詢結果時發生錯誤: {e}")
        return jsonify({'success': False, 'message': '處理數據時發生錯誤'}), 500



if __name__ == '__main__':
    # 啟動 Flask 應用
    print("🚀 啟動 Flask 伺服器...")
    print("📊 資料庫檢視器: http://127.0.0.1:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)