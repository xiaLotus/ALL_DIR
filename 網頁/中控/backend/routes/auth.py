"""
認證路由 - 完整版
放置位置: routes/auth.py
"""

from flask import Blueprint, request, jsonify
from utils.config import config
from utils.session_manager import SessionManager
from utils.auth import authenticate_user
import logging

logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth', __name__)

def get_users():
    """讀取用戶配置"""
    import json
    import os
    
    users = {}
    
    # 讀取員工資料
    emoinfo_path = config.get_path('Paths', 'emoinfo')
    admin_list_path = config.get_path('Paths', 'admin_list')
    editor_list_path = config.get_path('Paths', 'editor_list')
    
    try:
        # 讀取所有員工資料
        with open(emoinfo_path, 'r', encoding='utf-8-sig') as f: # type: ignore
            emoinfo = json.load(f)
        
        # 讀取管理員列表
        with open(admin_list_path, 'r', encoding='utf-8-sig') as f: # type: ignore
            admin_data = json.load(f)
            admin_list = admin_data.get('管理員', [])
        
        # 讀取編輯者列表
        with open(editor_list_path, 'r', encoding='utf-8-sig') as f: # type: ignore
            editor_data = json.load(f)
            editor_list = editor_data.get('編輯者', [])
        
        # 建立用戶字典
        for emp in emoinfo:
            emp_id = emp.get('工號', '')
            emp_name = emp.get('姓名', '')
            
            # 判斷角色
            if emp_id in admin_list:
                role = '管理員'
            elif emp_id in editor_list:
                role = '編輯者'
            else:
                role = '使用者'
            
            # 不儲存密碼，由 authenticate_user 處理
            users[emp_id] = {
                'role': role,
                '工號': emp_id,
                '姓名': emp_name
            }
        
        logger.info(f"✅ 已載入 {len(users)} 個用戶")
        
    except Exception as e:
        logger.error(f"❌ 讀取用戶資料時發生錯誤: {str(e)}")
    
    return users


@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        loginpage = data.get('loginpage', '')
        logger.info(f"loginpage：{loginpage}")

        users = get_users()   # ⭐ 兩邊都需要 user 資料

        if loginpage == 'loginpage':
            # 使用 login.html，需要密碼驗證
            # 密碼驗證
            if not authenticate_user(username, password):
                return jsonify({
                    'success': False,
                    'message': '用戶名或密碼錯誤'
                }), 401

            if not username or not password:
                return jsonify({
                    'success': False,
                    'message': '請輸入用戶名和密碼'
                }), 400

            if username not in users:
                return jsonify({
                    'success': False,
                    'message': '用戶名或密碼錯誤'
                }), 401

        else:
            # ⭐ dashboard 自動登入、AD 自動登入不需要密碼
            if username not in users:
                return jsonify({
                    'success': False,
                    'message': '用戶不存在'
                }), 401
                logger.info(f"{username} 已經登入")

        # ⭐ 無論哪種登入模式，都需要 user 資料
        user = users[username]

        # 建立會話
        session_info = SessionManager.create_session(username)

        logger.info(f"✅ {username} ({user['姓名']}) 登入成功")

        return jsonify({
            'success': True,
            'message': '登入成功',
            'username': username,
            'chataster': user['role'],
            'role': user['role'],
            '工號': user['工號'],
            '姓名': user['姓名'],
            'session': session_info
        }), 200

    except Exception as e:
        logger.error(f"❌ 登入錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'message': '伺服器錯誤'
        }), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """用戶登出"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        
        if not username:
            return jsonify({
                'success': False,
                'message': '缺少用戶名'
            }), 400
        
        SessionManager.remove_session(username)
        
        logger.info(f"🚪 {username} 已登出")
        
        return jsonify({
            'success': True,
            'message': '登出成功'
        }), 200
        
    except Exception as e:
        logger.error(f"❌ 登出錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'message': '伺服器錯誤'
        }), 500


@auth_bp.route('/check-session', methods=['POST', 'GET'])
def check_session():
    """檢查會話狀態"""
    try:
        # 支援 GET 和 POST
        if request.method == 'POST':
            data = request.get_json()
            username = data.get('username', '').strip()
        else:
            username = request.args.get('username', '').strip()
        
        if not username:
            return jsonify({
                'success': False,
                'message': '缺少用戶名'
            }), 400
        
        # 檢查會話
        session_status = SessionManager.check_session(username)
        
        return jsonify({
            'success': True,
            **session_status
        }), 200
        
    except Exception as e:
        logger.error(f"❌ 檢查會話錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'message': '伺服器錯誤'
        }), 500