import os
import shutil
from datetime import datetime

# 取得今天日期
today = datetime.today()
yyyy_mm = today.strftime("%Y%m")   # e.g., '202508'
mmdd = today.strftime("%m%d")      # e.g., '0818'

# 檔名
filename = f"MySQL_{mmdd}.csv"

# 原始來源檔案
src_file = rf"D:\kh\CIM\OVENLog\MySQLLog\{yyyy_mm}\{filename}"

# 目的地資料夾與檔案路徑
dst_folder = rf"\\20220530-W03\Data\K11_5F_BAKE\{yyyy_mm}"
dst_file = os.path.join(dst_folder, filename)

# 建立目的地資料夾（如果不存在）
os.makedirs(dst_folder, exist_ok=True)

# 複製
try:
    shutil.copy2(src_file, dst_file)
    print(f"✅ 成功複製到：{dst_file}")
except FileNotFoundError:
    print(f"❌ 找不到來源檔案：{src_file}")
except Exception as e:
    print(f"❌ 發生錯誤：{e}")