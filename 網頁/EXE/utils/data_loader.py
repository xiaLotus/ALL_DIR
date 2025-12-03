import json
import os
from typing import Dict, List, Any
import glob

class DataLoader:
    def __init__(self, data_directory='data'):
        self.data_directory = data_directory
        self.data_cache = {}
        self.load_all_data()
    
    def load_all_data(self):
        """載入所有樓層的JSON數據"""
        self.data_cache = {}
        
        # 確保數據目錄存在
        if not os.path.exists(self.data_directory):
            os.makedirs(self.data_directory)
            print(f"Created directory: {self.data_directory}")
            return
        
        # 讀取所有JSON檔案
        json_files = glob.glob(os.path.join(self.data_directory, "*.json"))
        
        for json_file in json_files:
            try:
                filename = os.path.basename(json_file)
                building_name = filename.replace('.json', '').replace('.Json', '')
                
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.data_cache[building_name] = data
                    print(f"Loaded {building_name}: {len(data)} IP addresses")
            
            except Exception as e:
                print(f"Error loading {json_file}: {str(e)}")
        
        print(f"Total buildings loaded: {len(self.data_cache)}")
    
    def get_all_buildings(self) -> List[str]:
        """獲取所有建築樓層名稱，按照正確順序排序"""
        buildings = list(self.data_cache.keys())
        return self.sort_buildings(buildings)
    
    def sort_buildings(self, buildings: List[str]) -> List[str]:
        """按照建築名稱排序：先按K後的數字，再按F前的數字"""
        def parse_building_name(building: str):
            try:
                # 解析格式如 K11_3F, K18_10F 等
                if 'K' in building and 'F' in building:
                    parts = building.split('K')[1]  # 獲取K後面的部分
                    if '_' in parts:
                        k_num_str, f_part = parts.split('_', 1)
                        f_num_str = f_part.replace('F', '')
                        k_num = int(k_num_str)
                        f_num = int(f_num_str)
                        return (k_num, f_num)
                return (999, 999)  # 無法解析的放最後
            except:
                return (999, 999)
        
        return sorted(buildings, key=parse_building_name)
    
    def get_building_data(self, building_name: str) -> Dict[str, List[str]]:
        """獲取特定建築的數據"""
        return self.data_cache.get(building_name, {})
    
    def get_all_data(self) -> Dict[str, Dict[str, List[str]]]:
        """獲取所有數據"""
        return self.data_cache
    
    def add_device(self, building_name: str, ip_address: str, device_name: str) -> bool:
        """新增設備"""
        try:
            if building_name not in self.data_cache:
                self.data_cache[building_name] = {}
            
            if ip_address not in self.data_cache[building_name]:
                self.data_cache[building_name][ip_address] = []
            
            if device_name not in self.data_cache[building_name][ip_address]:
                self.data_cache[building_name][ip_address].append(device_name)
                self.save_building_data(building_name)
                return True
            
            return False  # 設備已存在
        except Exception as e:
            print(f"Error adding device: {str(e)}")
            return False
    
    def remove_device(self, building_name: str, ip_address: str, device_name: str) -> bool:
        """刪除設備，但保留IP項目"""
        try:
            if (building_name in self.data_cache and 
                ip_address in self.data_cache[building_name] and 
                device_name in self.data_cache[building_name][ip_address]):
                
                self.data_cache[building_name][ip_address].remove(device_name)
                
                # 保留IP項目，即使沒有設備了也不刪除
                # 如果需要保留空的IP項目，可以設為空列表
                # if not self.data_cache[building_name][ip_address]:
                #     self.data_cache[building_name][ip_address] = []
                
                self.save_building_data(building_name)
                return True
            
            return False
        except Exception as e:
            print(f"Error removing device: {str(e)}")
            return False
    
    def save_building_data(self, building_name: str):
        """保存特定建築的數據到JSON檔案"""
        try:
            filename = f"{building_name}.json"
            filepath = os.path.join(self.data_directory, filename)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(self.data_cache[building_name], f, ensure_ascii=False, indent=2)
            
            print(f"Saved {building_name} data to {filepath}")
        except Exception as e:
            print(f"Error saving {building_name}: {str(e)}")
    
    def save_all_data(self):
        """保存所有數據"""
        for building_name in self.data_cache:
            self.save_building_data(building_name)
    
    def search_devices(self, query: str) -> Dict[str, Dict[str, List[str]]]:
        """搜尋設備或IP"""
        results = {}
        query = query.lower()
        
        for building_name, building_data in self.data_cache.items():
            building_results = {}
            
            for ip_address, devices in building_data.items():
                # 搜尋IP地址
                if query in ip_address.lower():
                    building_results[ip_address] = devices
                else:
                    # 搜尋設備名稱
                    matching_devices = [device for device in devices if query in device.lower()]
                    if matching_devices:
                        building_results[ip_address] = matching_devices
            
            if building_results:
                results[building_name] = building_results
        
        return results
    
    def get_statistics(self) -> Dict[str, Any]:
        """獲取統計信息"""
        total_ips = 0
        total_devices = 0
        building_stats = {}
        
        for building_name, building_data in self.data_cache.items():
            ip_count = len(building_data)
            device_count = sum(len(devices) for devices in building_data.values())
            
            building_stats[building_name] = {
                'ip_count': ip_count,
                'device_count': device_count
            }
            
            total_ips += ip_count
            total_devices += device_count
        
        return {
            'total_buildings': len(self.data_cache),
            'total_ips': total_ips,
            'total_devices': total_devices,
            'building_stats': building_stats
        }