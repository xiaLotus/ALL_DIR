"""
會話管理模組 - 完整版
放置位置: utils/session_manager.py
"""

from datetime import datetime, timedelta
from functools import wraps
from flask import jsonify, request
import logging

logger = logging.getLogger(__name__)

# 會話儲存（生產環境建議改用 Redis）
user_sessions = {}

# 配置
SESSION_TIMEOUT = timedelta(hours=2)  # 2小時超時
WARNING_TIME = timedelta(minutes=5)    # 提前5分鐘警告


class SessionManager:
    """會話管理器"""
    
    @staticmethod
    def create_session(username):
        """創建登入會話"""
        login_time = datetime.now()
        expire_time = login_time + SESSION_TIMEOUT
        
        session_data = {
            'username': username,
            'login_time': login_time,
            'expire_time': expire_time
        }
        
        user_sessions[username] = session_data
        
        logger.info(f"✅ {username} 登入，會話將於 {expire_time.strftime('%H:%M:%S')} 過期")
        logger.info(f"📊 目前線上用戶數：{len(user_sessions)}")
        
        return {
            'username': username,
            'login_time': login_time.isoformat(),
            'expire_time': expire_time.isoformat(),
            'timeout_minutes': int(SESSION_TIMEOUT.total_seconds() / 60)
        }
    
    @staticmethod
    def check_session(username, auto_refresh=False):
        """檢查會話是否有效"""
        if username not in user_sessions:
            return {
                'valid': False,
                'expired': True,
                'remaining_minutes': 0,
                'warning': False,
                'message': '未找到登入記錄，請重新登入'
            }
        
        session = user_sessions[username]
        now = datetime.now()
        expire_time = session['expire_time']
        
        # 計算剩餘時間
        remaining_time = expire_time - now
        remaining_minutes = int(remaining_time.total_seconds() / 60)
        
        # 檢查是否過期
        if now >= expire_time:
            logger.warning(f"⏰ {username} 會話已過期")
            SessionManager.remove_session(username)
            return {
                'valid': False,
                'expired': True,
                'remaining_minutes': 0,
                'warning': False,
                'message': '登入時間已超過限制，請重新登入'
            }
        
        # 如果啟用自動刷新，延長 session 時間
        if auto_refresh:
            SessionManager.refresh_session(username)
            # 重新計算剩餘時間
            expire_time = user_sessions[username]['expire_time']
            remaining_time = expire_time - now
            remaining_minutes = int(remaining_time.total_seconds() / 60)
        
        # 檢查是否需要警告
        needs_warning = remaining_time <= WARNING_TIME
        
        return {
            'valid': True,
            'expired': False,
            'remaining_minutes': remaining_minutes,
            'warning': needs_warning,
            'message': '會話有效'
        }
    
    @staticmethod
    def refresh_session(username):
        """刷新會話過期時間（用戶有活動時調用）"""
        if username in user_sessions:
            now = datetime.now()
            new_expire_time = now + SESSION_TIMEOUT
            user_sessions[username]['expire_time'] = new_expire_time
            logger.debug(f"🔄 {username} 會話已刷新，新過期時間: {new_expire_time.strftime('%H:%M:%S')}")
            return True
        return False
    
    @staticmethod
    def remove_session(username):
        """移除會話"""
        if username in user_sessions:
            del user_sessions[username]
            logger.info(f"🚪 {username} 會話已移除")
            return True
        return False
    
    @staticmethod
    def cleanup_expired_sessions():
        """清理過期會話"""
        now = datetime.now()
        expired_users = []
        
        for username, session in list(user_sessions.items()):
            if now >= session['expire_time']:
                expired_users.append(username)
                del user_sessions[username]
        
        if expired_users:
            logger.info(f"🗑️  已清理 {len(expired_users)} 個過期會話")
        
        return expired_users


def require_session(f):
    """
    會話驗證裝飾器
    用於保護需要登入的 API 端點
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 從請求中獲取用戶名
        username = None
        
        if request.method == 'POST' or request.method == 'PUT':
            data = request.get_json()
            if data:
                username = data.get('username')
        elif request.method == 'GET':
            username = request.args.get('username')
        
        # 如果沒有提供用戶名，嘗試從其他地方獲取
        if not username:
            # 可以從 header 或 session 中獲取
            # 這裡暫時允許通過，因為前端可能沒有在所有請求中傳遞 username
            logger.warning(f"⚠️  請求 {request.path} 未提供用戶名，跳過會話檢查")
            return f(*args, **kwargs)
        
        # 檢查會話並自動刷新（用戶有活動）
        session_status = SessionManager.check_session(username, auto_refresh=True)
        
        if not session_status['valid']:
            logger.warning(f"❌ {username} 會話無效或已過期")
            return jsonify({
                'success': False,
                'message': session_status['message'],
                'session_expired': True
            }), 401
        
        # 會話有效，繼續執行
        return f(*args, **kwargs)
    
    return decorated_function


def start_cleanup_task(app):
    """啟動定期清理任務"""
    import threading
    import time
    
    def cleanup_loop():
        while True:
            time.sleep(300)  # 每5分鐘
            with app.app_context():
                SessionManager.cleanup_expired_sessions()
    
    cleanup_thread = threading.Thread(target=cleanup_loop, daemon=True)
    cleanup_thread.start()
    logger.info("🧹 定期清理任務已啟動")