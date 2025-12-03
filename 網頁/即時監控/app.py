import os
import sys
import eventlet
import configparser
import threading
from loguru import logger
from datetime import datetime
from pathlib import Path

eventlet.monkey_patch()

from flask import Flask, jsonify, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import json

# ========================================
# 檔案鎖
# ========================================
tasks_file_lock = threading.RLock()
wip_file_lock = threading.RLock()
status_file_lock = threading.RLock()

# ========================================
# 載入配置檔
# ========================================
config = configparser.ConfigParser()
config.read('config.cfg', encoding='utf-8')

# 讀取路徑配置
TASKS_FILE = config.get('Paths', 'tasks_file', fallback='tasks.json')
WIP_FILE = config.get('Paths', 'wip_file', fallback='wip.json')
STATUS_FILE = config.get('Paths', 'status_file', fallback='status.json')
LOG_FILE = config.get('Paths', 'log_file', fallback='logs/app.log')

# 讀取伺服器配置
SERVER_HOST = config.get('Server', 'host', fallback='0.0.0.0')
SERVER_PORT = config.getint('Server', 'port', fallback=5000)
DEBUG_MODE = config.getboolean('Server', 'debug', fallback=False)

# 讀取特殊規則
TASK_START_STATION = config.get('TaskRules', 'start_station', fallback='F3_K11_8F_3800H')
TASK_END_STATION = config.get('TaskRules', 'end_station', fallback='F1_K22_9F_4730H')
WIP_START = config.get('WipRules', 'start_wip', fallback='F3_K11_8F_3390')
WIP_END = config.get('WipRules', 'end_wip', fallback='F3_K11_19F_3260')

# 讀取 Log 配置
LOG_ROTATION = config.get('Log', 'rotation', fallback='10 MB')
LOG_RETENTION = config.get('Log', 'retention', fallback='30 days')
LOG_COMPRESSION = config.get('Log', 'compression', fallback='zip')
LOG_LEVEL = config.get('Log', 'level', fallback='INFO')

# ========================================
# 設置 Logger
# ========================================
# 移除預設的 handler
logger.remove()

# 確保 log 目錄存在
log_dir = Path(LOG_FILE).parent
log_dir.mkdir(parents=True, exist_ok=True)

# 添加控制台輸出（彩色）
logger.add(
    sys.stderr,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
    level=LOG_LEVEL,
    colorize=True
)

# 添加檔案輸出
logger.add(
    LOG_FILE,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message}",
    level=LOG_LEVEL,
    rotation=LOG_ROTATION,
    retention=LOG_RETENTION,
    compression=LOG_COMPRESSION,
    encoding="utf-8"
)

logger.info("=" * 60)
logger.info("📋 配置檔載入完成")
logger.info(f"   Tasks File: {TASKS_FILE}")
logger.info(f"   WIP File: {WIP_FILE}")
logger.info(f"   Status File: {STATUS_FILE}")
logger.info(f"   Log File: {LOG_FILE}")
logger.info("=" * 60)

# ========================================
# Flask 應用程式初始化
# ========================================
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# ========================================
# 全域變數
# ========================================
# 任務資料
tasks_dict = {}
tasks_list = []

# WIP 資料
wip_dict = {}

# 進度追蹤
task_progress = {
    "current_index": 0,
    "total": 0,
    "current_task": None,
    "status": "idle",
    "last_update": None
}

wip_progress = {
    "current_index": 0,
    "total": 0,
    "current_task": None,
    "status": "idle",
    "last_update": None
}

# 輪次記錄
task_round_info = {
    "current_round": 0,
    "current_start": None,
    "current_end": None,
    "last_round": 0,
    "last_start": None,
    "last_end": None,
    "history": []
}

wip_round_info = {
    "current_round": 0,
    "current_start": None,
    "current_end": None,
    "last_round": 0,
    "last_start": None,
    "last_end": None,
    "history": []
}


# ========================================
# 狀態持久化（含鎖保護）
# ========================================
def load_status_from_file():
    """從 status.json 讀取狀態"""
    global task_progress, wip_progress, task_round_info, wip_round_info
    
    with status_file_lock:
        if os.path.exists(STATUS_FILE):
            try:
                with open(STATUS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                task_progress = data.get("task_progress", task_progress)
                wip_progress = data.get("wip_progress", wip_progress)
                task_round_info = data.get("task_round_info", task_round_info)
                wip_round_info = data.get("wip_round_info", wip_round_info)
                
                # 🧹 清理無效的歷史記錄（round = 0 或 start = null）
                if task_round_info.get("history"):
                    task_round_info["history"] = [
                        h for h in task_round_info["history"] 
                        if h.get("round", 0) > 0 and h.get("start") is not None
                    ]
                
                if wip_round_info.get("history"):
                    wip_round_info["history"] = [
                        h for h in wip_round_info["history"] 
                        if h.get("round", 0) > 0 and h.get("start") is not None
                    ]
                
                logger.info(f"✅ 已從 {STATUS_FILE} 載入狀態")
                logger.info(f"   Task: 第 {task_round_info['current_round']} 輪")
                logger.info(f"   WIP:  第 {wip_round_info['current_round']} 輪")
                
            except Exception as e:
                logger.error(f"❌ 讀取 {STATUS_FILE} 失敗: {e}")
        else:
            logger.info(f"💡 {STATUS_FILE} 不存在，將在首次更新時建立")


def save_status_to_file():
    """將狀態寫入 status.json"""
    with status_file_lock:
        try:
            data = {
                "task_progress": task_progress,
                "wip_progress": wip_progress,
                "task_round_info": task_round_info,
                "wip_round_info": wip_round_info,
                "last_saved": datetime.now().isoformat()
            }
            
            with open(STATUS_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            logger.debug(f"💾 狀態已保存到 {STATUS_FILE}")
            
        except Exception as e:
            logger.error(f"❌ 寫入 {STATUS_FILE} 失敗: {e}")


# ========================================
# 任務檔案管理（含鎖保護）
# ========================================
def load_tasks_from_file():
    """載入 tasks.json"""
    global tasks_dict, tasks_list
    
    with tasks_file_lock:
        if os.path.exists(TASKS_FILE):
            try:
                with open(TASKS_FILE, "r", encoding="utf-8") as f:
                    tasks_dict = json.load(f)
                tasks_list = [{"name": k, "done": v.get("done", False)} for k, v in tasks_dict.items()]
                logger.info(f"✅ 已載入 {TASKS_FILE}，共 {len(tasks_list)} 筆")
            except Exception as e:
                logger.error(f"❌ 讀取 {TASKS_FILE} 失敗: {e}")
                tasks_dict = {}
                tasks_list = []
        else:
            tasks_dict = {}
            tasks_list = []
            logger.info(f"💡 {TASKS_FILE} 不存在")


def save_tasks_to_file():
    """保存到 tasks.json"""
    with tasks_file_lock:
        try:
            updated_dict = {t["name"]: {"done": t["done"]} for t in tasks_list}
            with open(TASKS_FILE, "w", encoding="utf-8") as f:
                json.dump(updated_dict, f, ensure_ascii=False, indent=2)
            logger.debug(f"💾 已儲存 {TASKS_FILE}")
        except Exception as e:
            logger.error(f"❌ 寫入 {TASKS_FILE} 失敗: {e}")


def load_wip_from_file():
    """載入 wip.json"""
    global wip_dict
    
    with wip_file_lock:
        if os.path.exists(WIP_FILE):
            try:
                with open(WIP_FILE, "r", encoding="utf-8") as f:
                    wip_dict = json.load(f)
                logger.info(f"✅ 已載入 {WIP_FILE}，共 {len(wip_dict)} 筆")
            except Exception as e:
                logger.error(f"❌ 讀取 {WIP_FILE} 失敗: {e}")
                wip_dict = {}
        else:
            wip_dict = {}
            logger.info(f"💡 {WIP_FILE} 不存在")


def save_wip_to_file():
    """保存到 wip.json"""
    with wip_file_lock:
        try:
            with open(WIP_FILE, "w", encoding="utf-8") as f:
                json.dump(wip_dict, f, ensure_ascii=False, indent=2)
            logger.debug(f"💾 已儲存 {WIP_FILE}")
        except Exception as e:
            logger.error(f"❌ 寫入 {WIP_FILE} 失敗: {e}")


# ========================================
# Station/Task 上傳 API
# ========================================
@app.route('/api/upload_station/<station_name>', methods=['POST'])
def upload_station(station_name):
    """
    上傳 Station 完成狀態
    URL: POST /api/upload_station/F3_K11_8F_3800H
    
    特殊規則：
    - TASK_START_STATION: 新一輪的開始（重置所有Task，開始新輪次）
    - TASK_END_STATION: 一輪的結束（自動結束輪次）
    """
    global tasks_list, task_progress, task_round_info
    
    try:
        logger.info(f"📥 收到 Station: {station_name}")
        
        # 🔍 檢查：如果不是開始也不是結束，且還沒開始輪次或上一輪已結束，則開始新輪
        if station_name != TASK_START_STATION and station_name != TASK_END_STATION:
            # 情況1：從未開始過（round = 0）
            if task_round_info["current_round"] == 0:
                task_round_info["current_round"] = 1
                task_round_info["current_start"] = datetime.now().isoformat()
                task_round_info["current_end"] = None
                logger.info(f"🔄 Task 第 1 輪自動開始（觸發者：{station_name}）")
                socketio.emit('task_round_update', task_round_info)
            
            # 情況2：上一輪已結束（current_end 不是 None），需要開始新一輪
            elif task_round_info["current_end"] is not None:
                task_round_info["current_round"] += 1
                task_round_info["current_start"] = datetime.now().isoformat()
                task_round_info["current_end"] = None
                logger.info(f"🔄 Task 第 {task_round_info['current_round']} 輪自動開始（上輪已結束）")
                socketio.emit('task_round_update', task_round_info)
        
        # ✅ 特殊規則：開始站 = 新一輪開始
        if station_name == TASK_START_STATION:
            # 如果上一輪還沒結束，先結束它
            if task_round_info["current_round"] > 0 and task_round_info["current_end"] is None:
                task_round_info["current_end"] = datetime.now().isoformat()
                
                # 保存上一輪歷史記錄
                if task_round_info["current_start"]:
                    history_entry = {
                        "round": task_round_info["current_round"],
                        "start": task_round_info["current_start"],
                        "end": task_round_info["current_end"]
                    }
                    task_round_info["history"].insert(0, history_entry)
                    
                    if len(task_round_info["history"]) > 10:
                        task_round_info["history"] = task_round_info["history"][:10]
                
                # 更新上一輪資訊
                task_round_info["last_round"] = task_round_info["current_round"]
                task_round_info["last_start"] = task_round_info["current_start"]
                task_round_info["last_end"] = task_round_info["current_end"]
                
                logger.info(f"🏁 Task 第 {task_round_info['current_round']} 輪自動結束")
                socketio.emit('task_round_update', task_round_info)
            
            # 開始新一輪
            task_round_info["current_round"] += 1
            task_round_info["current_start"] = datetime.now().isoformat()
            task_round_info["current_end"] = None
            logger.info(f"🔄 Task 第 {task_round_info['current_round']} 輪開始")
            
            # 重置所有 Task 狀態為 false
            for task in tasks_list:
                task["done"] = False
            
            # 設置自己為 true
            found = False
            for task in tasks_list:
                if task["name"] == station_name:
                    task["done"] = True
                    found = True
                    break
            
            if not found:
                tasks_list.append({"name": station_name, "done": True})
            
            logger.info(f"🔄 重置所有 Task 狀態，{TASK_START_STATION} 標記為完成")
            socketio.emit('task_round_update', task_round_info)
        
        else:
            # 一般 Task：標記完成
            found = False
            for task in tasks_list:
                if task["name"] == station_name:
                    task["done"] = True
                    found = True
                    break
            
            # 不存在則自動添加
            if not found:
                tasks_list.append({"name": station_name, "done": True})
                logger.info(f"➕ 自動添加: {station_name}")

        # 計算進度
        total = len(tasks_list)
        completed = sum(1 for task in tasks_list if task["done"])
        
        # 更新進度追蹤
        task_progress["current_index"] = completed
        task_progress["total"] = total
        task_progress["current_task"] = station_name
        task_progress["status"] = "running" if completed < total else "completed"
        task_progress["last_update"] = datetime.now().isoformat()

        # ✅ 特殊規則：結束站 = 一輪結束
        if station_name == TASK_END_STATION:
            # 🔍 如果還沒開始輪次，先自動開始第一輪
            if task_round_info["current_round"] == 0:
                task_round_info["current_round"] = 1
                task_round_info["current_start"] = datetime.now().isoformat()
                logger.info(f"🔄 Task 第 1 輪自動開始（觸發者：結束信號）")
            
            # 如果開始時間還是 null，設置為當前時間
            if task_round_info["current_start"] is None:
                task_round_info["current_start"] = datetime.now().isoformat()
                logger.warning("⚠️ 開始時間為 null，使用當前時間")
            
            # 設置結束時間
            task_round_info["current_end"] = datetime.now().isoformat()
            
            # ✅ 保存到歷史記錄（確保有完整資訊）
            history_entry = {
                "round": task_round_info["current_round"],
                "start": task_round_info["current_start"],
                "end": task_round_info["current_end"]
            }
            task_round_info["history"].insert(0, history_entry)
            
            # 只保留最近 10 輪
            if len(task_round_info["history"]) > 10:
                task_round_info["history"] = task_round_info["history"][:10]
            
            # 更新上一輪資訊
            task_round_info["last_round"] = task_round_info["current_round"]
            task_round_info["last_start"] = task_round_info["current_start"]
            task_round_info["last_end"] = task_round_info["current_end"]
            
            logger.info(f"🏁 Task 第 {task_round_info['current_round']} 輪結束並記錄")
            logger.info(f"   開始: {task_round_info['current_start']}")
            logger.info(f"   結束: {task_round_info['current_end']}")
            
            socketio.emit('task_round_update', task_round_info)

        # 推播更新
        socketio.emit("task_update", tasks_list)
        socketio.emit("task_progress_update", task_progress)
        
        # 保存檔案（使用鎖保護）
        save_tasks_to_file()
        save_status_to_file()

        return jsonify({"success": True, "message": f"{station_name} 已完成"})

    except Exception as e:
        logger.error(f"❌ Station 更新錯誤: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ========================================
# WIP 上傳 API
# ========================================
@app.route('/api/upload_wip/<wip_name>', methods=['POST'])
def upload_wip(wip_name):
    """
    上傳 WIP 完成狀態
    URL: POST /api/upload_wip/F3_K11_8F_3390
    
    特殊規則：
    - WIP_START: 新一輪的開始（重置所有WIP，開始新輪次）
    - WIP_END: 一輪的結束（自動結束輪次）
    """
    global wip_dict, wip_progress, wip_round_info
    
    try:
        logger.info(f"📥 收到 WIP: {wip_name}")
        
        # 🔍 檢查：如果不是開始也不是結束，且還沒開始輪次或上一輪已結束，則開始新輪
        if wip_name != WIP_START and wip_name != WIP_END:
            # 情況1：從未開始過（round = 0）
            if wip_round_info["current_round"] == 0:
                wip_round_info["current_round"] = 1
                wip_round_info["current_start"] = datetime.now().isoformat()
                wip_round_info["current_end"] = None
                logger.info(f"🔄 WIP 第 1 輪自動開始（觸發者：{wip_name}）")
                socketio.emit('wip_round_update', wip_round_info)
            
            # 情況2：上一輪已結束（current_end 不是 None），需要開始新一輪
            elif wip_round_info["current_end"] is not None:
                wip_round_info["current_round"] += 1
                wip_round_info["current_start"] = datetime.now().isoformat()
                wip_round_info["current_end"] = None
                logger.info(f"🔄 WIP 第 {wip_round_info['current_round']} 輪自動開始（上輪已結束）")
                socketio.emit('wip_round_update', wip_round_info)
        
        # ✅ 特殊規則：開始 WIP = 新一輪開始
        if wip_name == WIP_START:
            # 如果上一輪還沒結束，先結束它
            if wip_round_info["current_round"] > 0 and wip_round_info["current_end"] is None:
                wip_round_info["current_end"] = datetime.now().isoformat()
                
                # 保存上一輪歷史記錄
                if wip_round_info["current_start"]:
                    history_entry = {
                        "round": wip_round_info["current_round"],
                        "start": wip_round_info["current_start"],
                        "end": wip_round_info["current_end"]
                    }
                    wip_round_info["history"].insert(0, history_entry)
                    
                    if len(wip_round_info["history"]) > 10:
                        wip_round_info["history"] = wip_round_info["history"][:10]
                
                # 更新上一輪資訊
                wip_round_info["last_round"] = wip_round_info["current_round"]
                wip_round_info["last_start"] = wip_round_info["current_start"]
                wip_round_info["last_end"] = wip_round_info["current_end"]
                
                logger.info(f"🏁 WIP 第 {wip_round_info['current_round']} 輪自動結束")
                socketio.emit('wip_round_update', wip_round_info)
            
            # 開始新一輪
            wip_round_info["current_round"] += 1
            wip_round_info["current_start"] = datetime.now().isoformat()
            wip_round_info["current_end"] = None
            logger.info(f"🔄 WIP 第 {wip_round_info['current_round']} 輪開始")
            
            # 重置所有 WIP 狀態為 false
            for k in wip_dict.keys():
                wip_dict[k]["done"] = False
            
            # 設置自己為 true
            wip_dict[wip_name] = {"done": True}
            logger.info(f"🔄 重置所有 WIP 狀態，{WIP_START} 標記為完成")
            
            socketio.emit('wip_round_update', wip_round_info)
        
        else:
            # 一般 WIP 任務：標記完成
            if wip_name in wip_dict:
                wip_dict[wip_name]["done"] = True
            else:
                wip_dict[wip_name] = {"done": True}
                logger.info(f"➕ 自動添加 WIP: {wip_name}")

        # 計算進度
        total = len(wip_dict)
        completed = sum(1 for info in wip_dict.values() if info.get("done", False))
        
        # 更新進度追蹤
        wip_progress["current_index"] = completed
        wip_progress["total"] = total
        wip_progress["current_task"] = wip_name
        wip_progress["status"] = "running" if completed < total else "completed"
        wip_progress["last_update"] = datetime.now().isoformat()

        # ✅ 特殊規則：結束 WIP = 一輪結束
        if wip_name == WIP_END:
            # 🔍 如果還沒開始輪次，先自動開始第一輪
            if wip_round_info["current_round"] == 0:
                wip_round_info["current_round"] = 1
                wip_round_info["current_start"] = datetime.now().isoformat()
                logger.info(f"🔄 WIP 第 1 輪自動開始（觸發者：結束信號）")
            
            # 如果開始時間還是 null，設置為當前時間
            if wip_round_info["current_start"] is None:
                wip_round_info["current_start"] = datetime.now().isoformat()
                logger.warning("⚠️ 開始時間為 null，使用當前時間")
            
            # 設置結束時間
            wip_round_info["current_end"] = datetime.now().isoformat()
            
            # ✅ 保存到歷史記錄（確保有完整資訊）
            history_entry = {
                "round": wip_round_info["current_round"],
                "start": wip_round_info["current_start"],
                "end": wip_round_info["current_end"]
            }
            wip_round_info["history"].insert(0, history_entry)
            
            # 只保留最近 10 輪
            if len(wip_round_info["history"]) > 10:
                wip_round_info["history"] = wip_round_info["history"][:10]
            
            # 更新上一輪資訊
            wip_round_info["last_round"] = wip_round_info["current_round"]
            wip_round_info["last_start"] = wip_round_info["current_start"]
            wip_round_info["last_end"] = wip_round_info["current_end"]
            
            logger.info(f"🏁 WIP 第 {wip_round_info['current_round']} 輪結束並記錄")
            logger.info(f"   開始: {wip_round_info['current_start']}")
            logger.info(f"   結束: {wip_round_info['current_end']}")
            
            socketio.emit('wip_round_update', wip_round_info)

        # 推播更新
        socketio.emit('wip_update', wip_dict)
        socketio.emit('wip_progress_update', wip_progress)
        
        # 保存檔案（使用鎖保護）
        save_wip_to_file()
        save_status_to_file()
        
        return jsonify({"success": True, "message": f"{wip_name} 已完成"})

    except Exception as e:
        logger.error(f"❌ WIP 更新錯誤: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ========================================
# 查詢 API
# ========================================
@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """取得任務列表"""
    with tasks_file_lock:
        return jsonify(tasks_list)


@app.route('/api/status', methods=['GET'])
def get_status():
    """取得完整狀態"""
    with status_file_lock:
        return jsonify({
            "task_progress": task_progress,
            "wip_progress": wip_progress,
            "task_round_info": task_round_info,
            "wip_round_info": wip_round_info,
            "timestamp": datetime.now().isoformat()
        })


# ========================================
# WebSocket 連線
# ========================================
@socketio.on('connect')
def on_connect():
    """前端連線時推送所有狀態"""
    logger.info("🔌 前端已連線")
    
    with tasks_file_lock:
        emit('task_update', tasks_list)
    
    with wip_file_lock:
        emit('wip_update', wip_dict)
    
    with status_file_lock:
        emit('task_progress_update', task_progress)
        emit('wip_progress_update', wip_progress)
        emit('task_round_update', task_round_info)
        emit('wip_round_update', wip_round_info)


@socketio.on('disconnect')
def on_disconnect():
    """前端斷線"""
    logger.info("🔌 前端已斷線")


# ========================================
# 主程式
# ========================================
if __name__ == '__main__':
    logger.info("=" * 60)
    logger.info("🟢 A3CIM_4000 監控伺服器啟動")
    logger.info("=" * 60)
    
    load_tasks_from_file()
    load_wip_from_file()
    load_status_from_file()
    
    logger.info("=" * 60)
    logger.info("📡 API 端點:")
    logger.info("   POST /api/upload_station/<station_name>")
    logger.info("   POST /api/upload_wip/<wip_name>")
    logger.info("   GET  /api/tasks")
    logger.info("   GET  /api/status")
    logger.info("=" * 60)
    logger.info("🎯 Task 特殊規則:")
    logger.info(f"   {TASK_START_STATION}  → 新一輪開始（重置所有 Task）")
    logger.info(f"   {TASK_END_STATION}  → 一輪結束")
    logger.info("=" * 60)
    logger.info("🎯 WIP 特殊規則:")
    logger.info(f"   {WIP_START}   → 新一輪開始（重置所有 WIP）")
    logger.info(f"   {WIP_END}  → 一輪結束")
    logger.info("=" * 60)
    logger.info(f"🌐 伺服器監聽: {SERVER_HOST}:{SERVER_PORT}")
    logger.info("🔒 檔案鎖保護: 已啟用（tasks/wip/status）")
    logger.info("=" * 60)
    
    socketio.run(app, host=SERVER_HOST, port=SERVER_PORT, debug=DEBUG_MODE)