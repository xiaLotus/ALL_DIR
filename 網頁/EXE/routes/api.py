from flask import Blueprint, request, jsonify, current_app
from functools import wraps

api_bp = Blueprint('api', __name__)

def get_data_loader():
    """獲取數據加載器實例"""
    return current_app.data_loader

@api_bp.route('/buildings', methods=['GET'])
def get_buildings():
    """獲取所有建築樓層"""
    try:
        data_loader = get_data_loader()
        buildings = data_loader.get_all_buildings()
        return jsonify({
            'success': True,
            'data': buildings
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/buildings/<building_name>', methods=['GET'])
def get_building_data(building_name):
    """獲取特定建築的數據"""
    try:
        data_loader = get_data_loader()
        building_data = data_loader.get_building_data(building_name)
        
        if not building_data:
            return jsonify({
                'success': False,
                'error': 'Building not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': building_data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/data/all', methods=['GET'])
def get_all_data():
    """獲取所有數據"""
    try:
        data_loader = get_data_loader()
        all_data = data_loader.get_all_data()
        return jsonify({
            'success': True,
            'data': all_data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/device/add', methods=['POST'])
def add_device():
    """新增設備"""
    try:
        data = request.get_json()
        
        # 驗證必要參數
        required_fields = ['building', 'ip', 'device']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        building_name = data['building']
        ip_address = data['ip']
        device_name = data['device']
        
        # 驗證IP地址格式
        if not is_valid_ip(ip_address):
            return jsonify({
                'success': False,
                'error': 'Invalid IP address format'
            }), 400
        
        data_loader = get_data_loader()
        success = data_loader.add_device(building_name, ip_address, device_name)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Device added successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Device already exists'
            }), 409
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/device/remove', methods=['DELETE'])
def remove_device():
    """刪除設備"""
    try:
        data = request.get_json()
        
        # 驗證必要參數
        required_fields = ['building', 'ip', 'device']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        building_name = data['building']
        ip_address = data['ip']
        device_name = data['device']
        
        data_loader = get_data_loader()
        success = data_loader.remove_device(building_name, ip_address, device_name)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Device removed successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Device not found'
            }), 404
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/search', methods=['GET'])
def search_devices():
    """搜尋設備"""
    try:
        query = request.args.get('q', '').strip()
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Search query is required'
            }), 400
        
        data_loader = get_data_loader()
        results = data_loader.search_devices(query)
        
        return jsonify({
            'success': True,
            'data': results,
            'query': query
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/statistics', methods=['GET'])
def get_statistics():
    """獲取統計信息"""
    try:
        data_loader = get_data_loader()
        stats = data_loader.get_statistics()
        
        return jsonify({
            'success': True,
            'data': stats
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/reload', methods=['POST'])
def reload_data():
    """重新載入數據"""
    try:
        data_loader = get_data_loader()
        data_loader.load_all_data()
        
        return jsonify({
            'success': True,
            'message': 'Data reloaded successfully'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def is_valid_ip(ip):
    """驗證IP地址格式"""
    try:
        parts = ip.split('.')
        if len(parts) != 4:
            return False
        
        for part in parts:
            if not part.isdigit():
                return False
            num = int(part)
            if num < 0 or num > 255:
                return False
        
        return True
    except:
        return False

@api_bp.errorhandler(404)
def api_not_found(error):
    return jsonify({
        'success': False,
        'error': 'API endpoint not found'
    }), 404

@api_bp.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        'success': False,
        'error': 'Method not allowed'
    }), 405