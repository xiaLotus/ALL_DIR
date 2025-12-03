"""
主應用程式 - 完整版
放置位置: app.py
"""

import json
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import os
from loguru import logger
from routes.auth import auth_bp  
from routes.websites import websites_bp
from utils.config import config
from utils.session_manager import start_cleanup_task  # ← 新增
import logging

def create_app():
    app = Flask(__name__)
    
    # 設定 CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type"]
        }
    })

    # === Logger 設定（loguru 自動保留 7 天） ===
    log_file = config.get_path('Paths', 'log_file')
    log_dir = os.path.dirname(log_file) # type: ignore
    if log_dir:
        os.makedirs(log_dir, exist_ok=True)

    logger.remove()  # 移除預設 handler
    logger.add(
        log_file, # type: ignore
        rotation="00:00",        # 每天凌晨檢查一次
        retention="7 days",      # ✅ 只保留最近 7 天的紀錄
        encoding="utf-8",
        enqueue=True,
        format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}"
    )

    logger.info("🚀 FT01 資訊管理組系統啟動")
        
    # 註冊藍圖
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(websites_bp, url_prefix="/api")
    
    # ✅ 啟動定期清理過期會話
    start_cleanup_task(app)
    logger.info("✅ 會話管理系統已啟動")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="10.11.104.247", port=5001, debug=False)

