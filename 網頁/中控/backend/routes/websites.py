from flask import Blueprint, jsonify, request
from loguru import logger
from utils.website_service import website_service
from utils.session_manager import require_session

websites_bp = Blueprint("websites_bp", __name__)


@websites_bp.route("/websites", methods=["GET"])
def get_websites():
    """
    取得所有網站列表
    """
    try:
        websites = website_service.get_all_websites()
        return jsonify(websites), 200
    
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 500
    except Exception as e:
        logger.error(f"取得網站列表時發生錯誤: {str(e)}")
        return jsonify({"success": False, "message": "伺服器錯誤"}), 500


@websites_bp.route("/websites/<int:website_id>", methods=["GET"])
def get_website(website_id):
    """
    取得指定網站資料
    """
    try:
        website = website_service.get_website_by_id(website_id)
        
        if website is None:
            return jsonify({"success": False, "message": f"找不到 ID 為 {website_id} 的網站"}), 404
        
        return jsonify({"success": True, "data": website}), 200
    
    except Exception as e:
        logger.error(f"取得網站資料時發生錯誤: {str(e)}")
        return jsonify({"success": False, "message": "伺服器錯誤"}), 500


@websites_bp.route("/websites", methods=["POST"])
@require_session
def create_website():
    """
    新增網站
    """
    try:
        data = request.get_json()
        website_data = data.get("website")
        meta = data.get("meta")
        created_by = meta.get("createdBy")

        if not website_data:
            return jsonify({"success": False, "message": "請提供網站資料"}), 400
        
        new_website = website_service.create_website(website_data, created_by)
        
        return jsonify({
            "success": True,
            "message": "網站新增成功",
            "data": new_website
        }), 201
    
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        logger.error(f"新增網站時發生錯誤: {str(e)}")
        return jsonify({"success": False, "message": "伺服器錯誤"}), 500


@websites_bp.route("/websites/<int:website_id>", methods=["PUT"])
@require_session
def update_website(website_id):
    """
    更新網站資料
    """
    try:
        data = request.get_json()
        # 支援兩種參數名稱：website 或 editingWebsite
        updated_data = data.get("website") or data.get("editingWebsite")
        username = data.get("username")

        
        if not updated_data:
            return jsonify({"success": False, "message": "請提供更新資料"}), 400
        
        updated_website = website_service.update_website(website_id, updated_data, username)
        
        if updated_website is None:
            return jsonify({"success": False, "message": f"找不到 ID 為 {website_id} 的網站"}), 404
        
        return jsonify({
            "success": True,
            "message": "網站更新成功",
            "data": updated_website
        }), 200
    
    except Exception as e:
        logger.error(f"更新網站時發生錯誤: {str(e)}")
        return jsonify({"success": False, "message": "伺服器錯誤"}), 500


@websites_bp.route("/websites/<int:website_id>", methods=["DELETE"])
@require_session
def delete_website(website_id):
    """
    刪除網站
    """
    try:
        deleted_website = website_service.delete_website(website_id)
        
        if deleted_website is None:
            return jsonify({"success": False, "message": f"找不到 ID 為 {website_id} 的網站"}), 404
        
        return jsonify({
            "success": True,
            "message": "網站刪除成功",
            "data": deleted_website
        }), 200
    
    except Exception as e:
        logger.error(f"刪除網站時發生錯誤: {str(e)}")
        return jsonify({"success": False, "message": "伺服器錯誤"}), 500