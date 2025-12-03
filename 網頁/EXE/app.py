from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from utils.data_loader import DataLoader
from routes.api import api_bp

def create_app():
    app = Flask(__name__)

    # 啟用CORS
    CORS(app)
    
    # 註冊藍圖
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # 初始化數據加載器
    data_loader = DataLoader()
    app.data_loader = data_loader # type: ignore
    
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)