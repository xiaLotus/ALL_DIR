# 📌 待做清單 (區分版)

## 🔷 360 表單介面
- [x] 新增欄位：驗收狀態、PO NO.  
- [ ] (待複審) 增加欄位：代簽核人員 (叔叔提)  
- [ ] 表單新增區間開單匯出  
- [ ] 新增備註不能超過 132 字元 (中文字=2)  
- [ ] 新增退件件數，以及退件當件背景換色  
- [ ] 退件(Status) 額外拉出一個格子  
- [ ] 如果開單與驗收狀態皆為 V → 整行變灰色 (Done)  
- [ ] **360 篩選新增**：  
  - ePR No. 欄位 + 搜尋框  
  - PO No. 欄位 + 篩選 + 模糊搜尋  
  - 備註欄位 + 模糊搜尋  

---

## 🔷 eRT 總表介面
- [x] 新增欄位：驗收確認、RT 金額、RT 總金額  
- [ ] 新增下載驗收按鈕 `https://khwfap.kh.asegroup.com/ert/eRT_web/eRT_Apply.aspx`，以及額外上傳網頁  
- [ ] eRT Download → 排除以下狀態才可進入總表：  
  - 已取消 / 已駁回 / 回轉取消 / 草稿  
- [ ] 保留上次上傳的 Download Reload 資料  
- [ ] 資訊爬蟲與自動下載 `https://khwfap.kh.asegroup.com/ert/eRT_web/eRT_Search.aspx`  
- [ ] **eRT 總表** → 全欄位下拉式過濾  
- [ ] eRT 總表 → 管理者可直接修正異常欄位  
- [ ] 給管理者使用，如果有異常可以直接對這幾個欄位直接做修正
---

## 🔷 共用 / 系統相關
### 篩選 & 顯示相關
- [ ] 品項不得超過 40 字元（英文/數字=1，中文=2）  
- [ ] 需求日支援倒敘排序  
- [ ] 預算管制線判斷修正 (150W)  
- [ ] 已開單日期格式修正 (強制 yyyy/mm/dd)  
- [x] 篩選顯示顏色提示  
- [x] F5 保留過濾狀態  

### 財務規則
- [x] 尚未入帳金額 RULE (交期 ≤ 今日、未有發票月份)  
- [ ] 下個月轉檔給副理的專用格子轉移資訊
- [ ] MHTML新增一個模糊比對

### 修正小卡
- [x] 新增欄位：驗收確認、RT 金額、RT 總金額  
- [ ] 驗收路徑需有內容才能打勾  
- [ ] 新增時需檢查報告路徑有效性  
- [ ] 有 RT 金額就自動勾交貨驗證  
- [ ] 複製功能（品項 / 規格 / 數量 / 單價）  
- [ ] ePR No. 強制刷新 function  
- [ ] 三個按鈕換位置，轉移到另一個網頁  

### 錯誤處理
- [ ] 登入未請購數據錯誤 (`EmptyDataError`) → 需安全讀取機制  
```bat
  Traceback (most recent call last):
    File "C:\inetpub\預計請購\Planned_Purchase_Request_List.py", line 358, in get_unordered_count
      df = pd.read_csv(CSV_FILE, encoding="utf-8-sig", dtype=str)
    File "C:\Users\A3cim\AppData\Local\Programs\Python\Python39\lib\site-packages\pandas\io\parsers\readers.py", line 1026, in read_csv
      return _read(filepath_or_buffer, kwds)
    File "C:\Users\A3cim\AppData\Local\Programs\Python\Python39\lib\site-packages\pandas\io\parsers\readers.py", line 620, in _read
      parser = TextFileReader(filepath_or_buffer, **kwds)
    File "C:\Users\A3cim\AppData\Local\Programs\Python\Python39\lib\site-packages\pandas\io\parsers\readers.py", line 1620, in __init__
      self._engine = self._make_engine(f, self.engine)
    File "C:\Users\A3cim\AppData\Local\Programs\Python\Python39\lib\site-packages\pandas\io\parsers\readers.py", line 1898, in _make_engine
      return mapping[engine](f, **self.options)
    File "C:\Users\A3cim\AppData\Local\Programs\Python\Python39\lib\site-packages\pandas\io\parsers\c_parser_wrapper.py", line 93, in __init__
      self._reader = parsers.TextReader(src, **kwds)
    File "parsers.pyx", line 581, in pandas._libs.parsers.TextReader.__cinit__
  pandas.errors.EmptyDataError: No columns to parse from file
```

## 寄信功能
- [ ] 驗收寄信功能(分批寄出)

## 其他
 - [ ] 上傳 報告路徑 以及 驗收路徑，這兩個區塊是否保留？
