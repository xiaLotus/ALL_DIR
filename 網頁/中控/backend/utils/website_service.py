import os
import json
from typing import List, Dict, Optional
from loguru import logger
from utils.config import config  # ✅ 匯入配置


class WebsiteService:
    """網站資料管理服務"""
    
    def __init__(self, json_path: str = "static/websites.json"):
        self.json_path = config.get_path('Paths', 'web_json')
    
    def _read_websites(self) -> List[Dict]:
        """讀取網站資料"""
        if not os.path.exists(self.json_path): # type: ignore
            logger.warning(f"找不到檔案: {self.json_path}")
            return []
        
        try:
            with open(self.json_path, "r", encoding="utf-8-sig") as f: # type: ignore
                return json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"JSON 格式錯誤: {str(e)}")
            raise ValueError("JSON 格式錯誤")
        except Exception as e:
            logger.error(f"讀取檔案失敗: {str(e)}")
            raise
    
    def _write_websites(self, websites: List[Dict]) -> None:
        """寫入網站資料"""
        try:
            # 確保目錄存在
            os.makedirs(os.path.dirname(self.json_path), exist_ok=True) # type: ignore
            
            with open(self.json_path, "w", encoding="utf-8") as f: # type: ignore
                json.dump(websites, f, ensure_ascii=False, indent=4)
            
            logger.info(f"✅ 資料已寫入: {self.json_path}")
        except Exception as e:
            logger.error(f"寫入檔案失敗: {str(e)}")
            raise
    
    def get_all_websites(self) -> List[Dict]:
        """取得所有網站"""
        return self._read_websites()
    
    def get_website_by_id(self, website_id: int) -> Optional[Dict]:
        """根據 ID 取得網站"""
        websites = self._read_websites()
        for site in websites:
            if site.get("id") == website_id:
                return site
        return None
    
    def create_website(self, website_data: Dict, created_by) -> Dict:
        """新增網站"""
        # 驗證必要欄位
        required_fields = ["name", "url", "description"]
        for field in required_fields:
            if field not in website_data:
                raise ValueError(f"缺少必要欄位: {field}")
        
        websites = self._read_websites()
        
        # 生成新 ID
        max_id = max([site.get("id", 0) for site in websites], default=0)
        website_data["id"] = max_id + 1
        
        # 設定預設值
        website_data.setdefault("incompletePercentage", 0)
        website_data.setdefault("completedTasks", [])
        website_data.setdefault("incompleteTasks", [])
        website_data.setdefault("tags", [])
        
        # 加入新網站
        websites.append(website_data)
        
        # 寫入檔案
        self._write_websites(websites)

        logger.info(f"✅ {created_by} 新增網站: {website_data.get('name')} (ID: {website_data['id']})")
        
        return website_data
    
    def update_website(self, website_id: int, updated_data: Dict, username) -> Optional[Dict]:
        """更新網站資料"""
        websites = self._read_websites()
        
        # 尋找要更新的網站
        website_index = None
        for i, site in enumerate(websites):
            if site.get("id") == website_id:
                website_index = i
                break
        
        if website_index is None:
            logger.warning(f"找不到 ID 為 {website_id} 的網站")
            return None
        
        # 更新資料（保留 ID）
        website_id_backup = websites[website_index]["id"]
        websites[website_index].update(updated_data)
        websites[website_index]["id"] = website_id_backup
        
        # 寫入檔案
        self._write_websites(websites)
        # ✅ 顯示最新更新內容
        logger.info(f"🧩 更新後網站資料: {json.dumps(websites[website_index], ensure_ascii=False, indent=2)}")

        logger.info(f"✅ {username} 更新網站: {websites[website_index].get('name')} (ID: {website_id})")
        
        return websites[website_index]
    
    def delete_website(self, website_id: int) -> Optional[Dict]:
        """刪除網站"""
        websites = self._read_websites()
        
        # 尋找要刪除的網站
        website_to_delete = None
        new_websites = []
        
        for site in websites:
            if site.get("id") == website_id:
                website_to_delete = site
            else:
                new_websites.append(site)
        
        if website_to_delete is None:
            logger.warning(f"找不到 ID 為 {website_id} 的網站")
            return None
        
        # 寫入檔案
        self._write_websites(new_websites)
        
        logger.info(f"✅ 刪除網站: {website_to_delete.get('name')} (ID: {website_id})")
        
        return website_to_delete


# 建立全域實例
website_service = WebsiteService()