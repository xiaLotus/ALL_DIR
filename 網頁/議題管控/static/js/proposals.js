const draggable = vuedraggable;
const { Plus, Delete } = ElementPlusIconsVue;

const app = Vue.createApp({
  components: { draggable },
  data() {
      // 
      return {
          username: '',
          loadingDots: '',
          proposals: [],
          columnOrder: [
              "總表項次", "提案日期", '距今', "棟別", "樓層", "站點","類別", 
              "提案人", "案件分類", "問題描述", "PDCA", "距截止日", "StatusOwner", "Due", "項目Owner", "項目 Due Date", "進度紀錄", "後端確認"
          ],
          showSelect: true,
          isButtonClicked: true,
          newItem: {
            // '總表項次': '',
            '提案日期': '',
            '棟別': 'ALL',
            '樓層': 'ALL',
            '站點': '',
            '類別': '',
            '提案人': '',
            '案件分類': '',
            '問題描述': '',
            "PDCA": '',
            'StatusOwner': '',
            'Owner部門': 'FT01',
            'Due': '',
            '進度紀錄': '',
            '後端確認': 'On Going',
            '項目Owner': '',
            '項目 Due Date': ''
          },
          showAddNewCard: false,
          loading: true,
          dropdownOpen: null, // 目前開啟的篩選標題
          selectedFilters: {}, // 存儲篩選條件
          pendingFilters: {},  // ✅ 這是暫存篩選條件，只有按下「套用」才會更新
          searchQuery: {}, // 搜索框的輸入值
          dropdownPosition: { top: 0, left: 0 }, // 記錄篩選卡片的位置
          sortOrder: null, // 排序狀態 ('asc', 'desc', null)
          sortOrderField: '',  
          daysInput: '', // 針對多少天以內的可輸入框
          isDueFilterActive: false, // 新增的 flag 用來判斷是否啟用 Due 篩選
          filteredProposalsWithDue: [], // 用來儲存篩選後的資料
          editingRow: null, // 存放當前正在編輯的行
          progressText: '',  // 儲存進度文本
          placeholderText: '',  // 用來設置 textarea 的 placeholder
          fullTodayDate: new Date(),  // 完整的日期物件
          todayDate: this.getTodayDate(),  // 今天的日期
          isEditing: false,  // 是否處於編輯狀態
          editedRecord: "",  // 編輯後的內容
          editingIndex: null,   // 當前正在編輯的進度紀錄的索引
      };
  },

  computed: {
      reversedProgress() {
          // 確保只有在有進度紀錄時才進行反轉
          if (this.editingRow && this.editingRow['進度紀錄']) {
              
              return this.editingRow['進度紀錄'].slice().reverse();
          }
          return [];
      },
      // 取得篩選後仍然可選的唯一選項
      filteredUniqueOptions() {
          const options = {};
          const filteredData = this.filteredProposals;
          
          if (filteredData.length > 0) {
              Object.keys(filteredData[0]).forEach((key) => {
                  options[key] = [...new Set(filteredData.map(p => p[key]))];
              });
          }
          return options;
      },
      filteredDropdownOptions() {
          // console.log(this.dropdownOpen)
          if (!this.dropdownOpen || !this.searchQuery[this.dropdownOpen]) {
              // 过滤空值并进行排序
              return (this.filteredUniqueOptions[this.dropdownOpen] || [])
                  .filter(option => option !== '')  // 排除空值
                  .sort((a, b) => a.localeCompare(b));  // 字母排序
          }
      
          // 搜索條件
          const searchQuery = this.searchQuery[this.dropdownOpen].toLowerCase();
      
          // 过滤并排序
          return this.filteredUniqueOptions[this.dropdownOpen]
              .filter(option => {
                  // 忽略空值
                  if (option === '') return false;
      
                  // 返回包含搜索字串的選項
                  return option.toLowerCase().includes(searchQuery);
              })
              .sort((a, b) => a.localeCompare(b));  // 排序选项
      },
      
      // 是否 "ALL" 被選擇
      isAllSelected() {
          if (!this.dropdownOpen || !this.filteredDropdownOptions.length) return false;
          return this.pendingFilters[this.dropdownOpen]?.length === this.filteredDropdownOptions.length;
      },
      // 根據篩選條件過濾數據
      filteredProposals() { 

          // 先處理 Due 篩選邏輯，如果有篩選條件，就篩選
          let filtered = this.proposals;

          // 如果有 'filteredProposalsWithDue' 篩選條件，先進行篩選
          if (this.isDueFilterActive && this.filteredProposalsWithDue.length > 0) {
              return this.filteredProposalsWithDue
          }

          return this.proposals.filter(proposal => {
              return Object.keys(this.selectedFilters).every(key => {
                  // 如果 `selectedFilters[key]` 為空，則不進行篩選
                  if (!this.selectedFilters[key] || this.selectedFilters[key].length === 0) return true;

                  // **允許多選篩選條件**
                  return this.selectedFilters[key].includes(proposal[key]);
              });
          });
      },

      sortedProposals() {
          if (!this.sortOrder || !this.sortOrderField) return this.filteredProposals;
      
          return [...this.filteredProposals].sort((a, b) => {
              // 提取日期部分
              const extractDate = (str) => {
                  const dateMatch = str.match(/^(\d{8})/); // 匹配前8個數字部分作為日期 (YYYYMMDD)
                  return dateMatch ? new Date(dateMatch[1].slice(0, 4), dateMatch[1].slice(4, 6) - 1, dateMatch[1].slice(6, 8)) : null;
              };
      
              // 判斷有無日期
              const hasDate = (str) => extractDate(str) !== null;
      
              // 根據日期進行排序，若無日期則排到後面
              if (this.sortOrderField === '提案日期') {
                  const dateA = extractDate(a["提案日期"]);
                  const dateB = extractDate(b["提案日期"]);
                  if (dateA && dateB) {
                      return this.sortOrder === "asc" ? dateA - dateB : dateB - dateA;
                  } else if (dateA) {
                      return this.sortOrder === "asc" ? -1 : 1; // 有日期的排前面
                  } else if (dateB) {
                      return this.sortOrder === "asc" ? 1 : -1; // 有日期的排前面
                  }
                  // 若兩者都無日期則按字母順序
                  return this.sortOrder === "asc" ? a["提案日期"].localeCompare(b["提案日期"]) : b["提案日期"].localeCompare(a["提案日期"]);
              } else if (this.sortOrderField === 'Due') {
                  const dateA = extractDate(a["Due"]);
                  const dateB = extractDate(b["Due"]);
                  if (dateA && dateB) {
                      return this.sortOrder === "asc" ? dateB - dateA : dateA - dateB;
                  } else if (dateA) {
                      return this.sortOrder === "asc" ? -1 : 1; // 有日期的排前面
                  } else if (dateB) {
                      return this.sortOrder === "asc" ? 1 : -1; // 有日期的排前面
                  }
                  // 若兩者都無日期則按字母順序
                  return this.sortOrder === "asc" ? a["Due"].localeCompare(b["Due"]) : b["Due"].localeCompare(a["Due"]);
              } else if (this.sortOrderField === '距截止日') {
                  // 解析 "距截止日" 的數字（例如 "78天"）
                  // 計算 Due 的天數
                  const calculateDays = (proposal) => {
                      // 使用 calculateDueDays 函數計算距截止日的天數
                      return this.calculateDueDays(proposal["後端確認"], proposal["Due"]);
                  };
                  
                  const daysA = calculateDays(a);
                  const daysB = calculateDays(b);

                  // 根據天數大小排序
                  if (daysA === daysB) return 0;
                  return this.sortOrder === "asc" ? daysA - daysB : daysB - daysA;
              
              }
              
      
              return 0;
          });
      },

      Proposal_Date(){
          const year = this.fullTodayDate.getFullYear()
          const month = (this.fullTodayDate.getMonth() + 1).toString().padStart(2, '0')
          const day = this.fullTodayDate.getDate().toString().padStart(2, '0')
          return `${year}${month}${day}`;  
      },
  },
  created() {
      this.newItem['提案日期'] = this.Proposal_Date;

  },

  methods: {

      async fetchData() {
          try {
              const response = await axios.get("http://127.0.0.1:5000/api/proposals");
              this.proposals = response.data;
              console.log(this.proposals)
              
          } catch (error) {
              console.error("無法獲取數據:", error);
          } finally {
              this.loading = false;
          }
      },


      openCard() {
          this.newItem['提案日期'] = this.Proposal_Date;
          this.newItem['提案人'] = this.username;
          this.newItem['StatusOwner'] = this.username;
          this.newItem['Owner部門'] = 'FT01';
          this.newItem['Due'] = this.Proposal_Date;

          this.showAddNewCard = true;
      },

        closeCard() {
            this.showAddNewCard = false;
            this.newItem = {
                // '總表項次': '',
                '提案日期': '',
                '棟別': 'ALL',
                '樓層': 'ALL',
                '站點': '',
                '類別': '',
                '提案人': '',
                '案件分類': '',
                '問題描述': '',
                "PDCA": '',
                'StatusOwner': '',
                'Owner部門': 'FT01',
                'Due': '',
                '進度紀錄': '',
                '後端確認': 'On Going',
                '項目Owner': '',
                '項目 Due Date': ''
            }
        },

      setDefaultProgressRecord() {
          // 如果輸入框目前是空的，則設置預設進度紀錄
          if (!this.newItem['進度紀錄']) {
            this.newItem['進度紀錄'] = `${this.todayDate}: `
          }
      },

      async submitForm() {
          if (!/^\d{8}$/.test(this.newItem['提案日期'])) {
              alert("無法提交，提案日期 必須為 YYYYMMDD");
              return;
          }

          if (this.newItem['Due'] !== 'TBD' && this.newItem['Due'] !== 'waiting' && !/^\d{8}$/.test(this.newItem['Due'])) {
            alert("無法提交，提案日期 必須為 TBD / waiting / YYYYMMDD");
            return;
          }

          if (!(this.newItem['棟別'].startsWith('K') || this.newItem['棟別'] === 'ALL')) {
            alert("棟別必须以 K 開頭 或者是 ALL");
            return;
          }

          if (!(this.newItem['樓層'].endsWith('F') || this.newItem['樓層'] === 'ALL')) {
              alert("樓層必须以 F 結尾 或者是 ALL");
              return;
          }

          if (!(this.newItem['進度紀錄'].startsWith(`${this.todayDate}`))) {
              alert(`請已 ${this.todayDate}: 為開頭`);
              return;
          }

          // 發送 POST 請求到後端
          axios.post(`http://127.0.0.1:5000/api/submit`, this.newItem)
              .then((response) => {
                  console.log('資料提交成功', response.data);
                  alert('提交成功');
                  this.fetchData();
                  // 根據回應處理，例如關閉表單
                  this.closeCard();
              })
              .catch((error) => {
                  console.error('提交資料失敗', error);
                  alert('提交失敗，請稍後再試');
                  this.showAddNewCard = false
          });

          this.newItem = {
              // '總表項次': '',
            '提案日期': '',
            '棟別': 'ALL',
            '樓層': 'ALL',
            '站點': '',
            '類別': '',
            '提案人': '',
            '案件分類': '',
            '問題描述': '',
            "PDCA": '',
            'StatusOwner': '',
            'Owner部門': 'FT01',
            'Due': '',
            '進度紀錄': '',
            '後端確認': '',
            '項目Owner': '',
            '項目 Due Date': ''
          }
      },


      splitItems(item) {
          // 首先，檢查是否包含日期行（例如 10/23:），如果有，將其單獨提取
          const dateLineRegex = /(\d{1,2}\/\d{1,2}):/;
          let dateLine = '';
          
          // 如果包含日期，將其單獨處理並移除
          if (dateLineRegex.test(item)) {
            const match = item.match(dateLineRegex);
            dateLine = match ? match[0] : '';
            item = item.replace(dateLineRegex, '');  // 移除日期行
          }

          // 接下來，使用換行符拆分剩餘部分，處理條目
          const lines = item.split('\n').filter(Boolean);
          
          const result = [];
          
          lines.forEach((line) => {
            // 根據數字+句點來拆分每一行（如 1., 2. 等）
            const parts = line.split(/(\d+\.\s)/).filter(Boolean);
            
            let temp = '';
            
            parts.forEach((part) => {
              if (/\d+\.\s/.test(part)) {
                if (temp) result.push(temp.trim());
                result.push(part);  // 這是數字項目，如 '1.', '2.'
                temp = '';  // 清空暫存
              } else {
                temp += part;  // 拼接剩餘文本
              }
            });
            
            if (temp) result.push(temp.trim());  // 處理最後的部分
          });
          
          // 如果有日期行，將其加回並返回
          if (dateLine) {
            result.unshift(dateLine.trim());  // 日期行放在最前面
          }

          // 把所有分段組合並加上換行符 <br> 來顯示
          return result.join('<br>');
      },


      splitDescription(description) {
          return description || '';  // 直接返回整個描述，不進行分割
      },

      toggleFilterOption(option) {
          if (!this.pendingFilters[this.dropdownOpen]) {
              this.pendingFilters[this.dropdownOpen] = [];
          }

          const index = this.pendingFilters[this.dropdownOpen].indexOf(option);

          if (index > -1) {
              this.pendingFilters[this.dropdownOpen].splice(index, 1);
          } else {
              this.pendingFilters[this.dropdownOpen].push(option);
          }
      },

      toggleDropdown(key, event) {
          if (key === "距今" || key === "問題描述" || key === "距截止日" || key === "進度紀錄") return; 

          if (this.dropdownOpen === key) {
              this.dropdownOpen = null;
              return;
          }

          this.dropdownOpen = key;
          this.searchQuery[key] = ""; 

          // ✅ 確保 `pendingFilters` 是 `selectedFilters` 的複製品
          this.pendingFilters[key] = [...(this.selectedFilters[key] || [])];

          this.$nextTick(() => {
              const rect = event.currentTarget.getBoundingClientRect();
              // 預設偏移量
              let offsetTop = 10;
              let offsetLeft = 0;

              const leftShiftMap = {
                  '後端確認': -200,
                  'PDCA': -140,
              };
              if (leftShiftMap[key]) {
                  offsetLeft = leftShiftMap[key];
              }

              this.dropdownPosition = {
                  top: rect.bottom + window.scrollY + offsetTop,
                  left: rect.left + window.scrollX + offsetLeft
                };
          });

          document.addEventListener("click", this.closeDropdownOnClickOutside);
          event.stopPropagation();
      },

      applyFilters() {
          if (this.dropdownOpen) {
              this.selectedFilters[this.dropdownOpen] = [...(this.pendingFilters[this.dropdownOpen] || [])];
              
              if (this.dropdownOpen === 'Due' && this.daysInput) {
                  const maxDays = parseInt(this.daysInput, 10); // 轉換為數字
                  if (!isNaN(maxDays)) {
                      // 創建篩選後的結果，避免直接修改 readonly 的 computed 屬性
                      this.filteredProposalsWithDue = this.filteredProposals.filter(proposal => {
                          const daysLeft = this.calculateDueDays(proposal["Due"]);
                          if (daysLeft === 0) return false;
                          return daysLeft <= maxDays && daysLeft > 0;
                      });
                      console.log(this.filteredProposalsWithDue) // <- 這邊有資料
                      this.daysInput = '';
                  }
                  this.isDueFilterActive = true;
              }
              
              this.dropdownOpen = null; // ✅ 關閉篩選選單
          }
      },
      handleReset(dropdownOpen){
          if (dropdownOpen === 'Due') {
              this.resetAllFilters(dropdownOpen);  // 如果是 'Due' 調用 resetAllFilters 方法
          } else {
              this.resetFilter(dropdownOpen);  // 否则调用 resetFilter 方法并传入 dropdownOpen
          }
      },
      resetFilter(key) {
          if (key) {
              // ✅ 只清除當前篩選選單的條件
              this.pendingFilters[key] = [];
              this.selectedFilters[key] = [];
              this.filteredProposalsWithDue = [];
              this.daysInput = ''; // 也可以清空用戶輸入的天數
          } else {
              // ✅ 如果沒有指定 key，清除所有篩選條件
              this.pendingFilters = {};
              this.selectedFilters = {};
          }
      },

      closeDropdownOnClickOutside(event) {
          if (!event.target.closest(".fixed")) {
              this.dropdownOpen = null;
              document.removeEventListener("click", this.closeDropdownOnClickOutside);
          }
      },

      calculateUpdateDaysAgo(proposalDate) {
          const formattedDate = proposalDate.substring(0, 4) + '-' + proposalDate.substring(4, 6) + '-' + proposalDate.substring(6, 8);
          // console.log(formattedDate);
          // 轉換提案日期為 Date 對象
          const proposalDateObj = new Date(formattedDate);
          const currentDate = new Date();
  
          // 計算兩者之間的時間差（毫秒）
          const timeDifference = currentDate - proposalDateObj;
  
          // 將時間差轉換為天數（毫秒轉換為天數）
          const daysAgo = Math.floor(timeDifference / (1000 * 3600 * 24));
  
          return daysAgo;
      },

      calculateDueDays(proposalStatus, proposalDate){
          const isValidDate = /^\d{8}$/.test(proposalDate);  // 正規表達式檢查是否是 8 位數字（如 20250320）

          if (!isValidDate) {
              // 如果是英文字或其他格式，返回 0
              return 0;
          }
          const formattedDate = proposalDate.substring(0, 4) + '-' + proposalDate.substring(4, 6) + '-' + proposalDate.substring(6, 8);
          // 轉換提案日期為 Date 對象
          const proposalDateObj = new Date(formattedDate);
           // 設定 proposalDateObj 的時間部分為 00:00:00
          proposalDateObj.setHours(0, 0, 0, 0);

          // 設定 currentDate 的時間部分為 00:00:00，這樣只比較日期
          const currentDate = new Date(); 
          currentDate.setHours(0, 0, 0, 0);
          // console.log('currentDate: ', currentDate);
  
          // 計算兩者之間的時間差（毫秒）
          const timeDifference = proposalDateObj - currentDate;
          // console.log("timeDifference: ", timeDifference)
  
          // 將時間差轉換為天數（毫秒轉換為天數）
          const daysAgo = Math.floor(timeDifference / (1000 * 3600 * 24));
          // console.log('daysAgo: ', daysAgo)

          if (proposalStatus === 'Done') return 0;

          return daysAgo;
      },

      toggleSortOrder(field) {
          if (this.sortOrderField === field) {
              // 如果當前欄位已經被選中，則切換排序方式
              this.sortOrder = this.sortOrder === 'asc' ? 'desc' : this.sortOrder === 'desc' ? null : 'asc';
          } else {
              // 如果選擇了新的欄位，則設置該欄位為排序欄位，並默認排序為升序
              this.sortOrderField = field;
              this.sortOrder = 'asc';
          }
      },

  
      toggleAllSelection() {
          if (this.isAllSelected) {
              this.pendingFilters[this.dropdownOpen] = [];
          } else {
              this.pendingFilters[this.dropdownOpen] = [...this.filteredDropdownOptions];
          }
      },
      getLastRemark(remarks) {
          // console.log(remarks)
          // console.log(typeof(remarks))
          if (!Array.isArray(remarks) || remarks.length === 0) return "無回覆";
          let text = remarks[remarks.length - 1]
              .replace(/\r/g, " ")  
              .replace(/\n/g, " ")  
              .replace(/<br>/g, " ") 
          // **每 20 個字插入換行**
          return text;
      },
      resetAllFilters(data) {
          this.pendingFilters = {};  // 清除暫存篩選條件
          this.selectedFilters = {}; // 清除已套用的篩選條件
          this.sortOrder = null; // 取消排序
          this.filteredProposalsWithDue = [];
          this.daysInput = ''; // 也可以清空用戶輸入的天數
          if(data === "NoneData"){ 
              this.dropdownOpen = null;  // 確保篩選選單關閉
          }
      },

      cancalFilterCard(){
          this.dropdownOpen = null;
      },



      // 獲取今天的日期，格式化為 MM/DD
      getTodayDate() {
        const today = new Date();
        const month = today.getMonth() + 1;  // getMonth() 是從0開始，所以加1
        const day = today.getDate();
        return `${month}/${day}`;
      },

      // 設定 placeholder
      setPlaceholder() {
        this.placeholderText = `${this.todayDate}: 點我，在游標後打上今日的會議紀錄即可`;
      },

      // 在 textarea 聚焦時插入今天的日期
      insertTodayDate(event) {
        this.clearProgress()
        // 檢查當前是否已經插入過日期
        const currentValue = this.progressText
        if (!currentValue.startsWith(this.todayDate)) {
          this.progressText = `${this.todayDate}: `;
          // 設置光標位置到冒號後面
          this.$nextTick(() => {
            const textArea = event.target;
            textArea.setSelectionRange(textArea.value.length, textArea.value.length); 
          });
        }
      },

      // 清空 textarea 的內容，保留底下的默認資訊
      clearProgress() {
          this.progressText = '';
          this.setPlaceholder();
          
      },

      // 新增進度的處理方法
      async addProgress() {
          if (this.progressText.trim() === '') {
              alert('進度內容不能為空');
              return;
          }
          // 去除前後空白
          const content = this.progressText.trim(); 

          // 正則表達式，檢查是否符合 "數字/數字:" 的格式
          const regex = /^\d{1,2}\/\d{1,2}:/;

          if (!regex.test(content)) {
              // 如果不符合格式，顯示警告並返回
              alert("進度紀錄必須以 '數字/數字:' 格式開頭！");
              return; 
          }
          // 傳送到後端
          try {
          const response = await axios.post(`http://127.0.0.1:5000/api/proposals_new_progress/${this.editingRow["總表項次"]}`, {
              progress: this.progressText,
          });
          
          if (response.status === 200) {
                  this.editingRow['進度紀錄'].push(this.progressText);                   
              }  
          } catch (error) {
              console.error('新增進度時發生錯誤:', error);
              alert('新增進度失敗');
          }
          this.clearProgress();  // 清空內容
      },

      handleButtonClick(row, index){
          this.isButtonClicked = false;  // 按鈕被點擊後設為 true
          this.editRow(row, index);
      },


      editRow(row, index) {
          console.log("row", row, " + index: ", index);
          this.isEditing = true; // 啟動編輯模式
          this.editingIndex = index; // 設定正在編輯的行索引
          this.editedRecord = row
          this.fetchData()
      },

      async saveEdit(row, index) {
          // 保存編輯後的進度紀錄
          // 顯示確認框詢問是否儲存
          const isConfirmed = window.confirm('確定要儲存修正嗎？');

          if (!isConfirmed) {
              console.log('修改已取消');
              this.isEditing = false; // 啟動編輯模式
              this.isButtonClicked = true;  // 按鈕被點擊後設為 true
              return; // 如果用戶選擇取消，則不執行保存操作
          }

          console.log("儲存修改:", this.editedRecord);

      
          try{
              const response = await axios.post(`http://127.0.0.1:5000/api/update_lastest_status_report`, 
                  {
                      總表項次: this.editingRow['總表項次'],   
                      LastOldProcess: this.editedRecord    // 使用更新後的進度紀錄
                  }, 
                  {
                      headers: {
                          'Content-Type': 'application/json'  // 設置 Content-Type 為 application/json
                      }
                  }
              );

              // 判斷後端是否成功更新
              if (response.status === 200) {
                  console.log('進度紀錄已更新');
                  console.log(this.editingRow['進度紀錄'])
                  this.editingRow['進度紀錄'][this.editingRow['進度紀錄'].length - 1] = this.editedRecord;
              } else {
                  console.error('更新進度紀錄失敗', response);
              }
              
          }catch(error){
              console.log("該資訊更新失敗")
          }
          
          // 重置編輯狀態
          this.isEditing = false;
          this.editingIndex = null;
          this.editedRecord = "";
          setTimeout(() => {
              this.isButtonClicked = true; // 恢復按鈕顯示
          }, 200);  // 假設 0.2 秒後顯示修正完成提示並恢復按鈕
          await this.fetchData()
      },

      // 刪除該條記錄
      async deleteRow(item, row, editingRow) {
          // 顯示確認框詢問是否儲存
          const isConfirmed = window.confirm('您確定要儲存修改嗎？');

          if (!isConfirmed) {
              console.log('修改已取消');
              return; // 如果用戶選擇取消，則不執行保存操作
          }
          this.editingRow['進度紀錄'].pop();
          try{
              const response = await axios.post(`http://127.0.0.1:5000/api/del_process_end`, 
                  {
                      總表項次: editingRow['總表項次'],   // 使用 row['總表項次'] 來直接取得正確的項次
                  }, 
                  {
                      headers: {
                          'Content-Type': 'application/json'  // 設置 Content-Type 為 application/json
                      }
                  }
              );
              // 判斷後端是否成功更新
              if (response.status === 200) {
                  console.log('進度紀錄已更新');
              } else {
                      console.error('更新進度紀錄失敗', response);
              }
              }catch(error){
              console.log("該資訊更新失敗")
            }
              this.isEditing = false;  // 退出編輯模式
              this.editingIndex = null; // 清除編輯索引
              this.fetchData();
      },



      async saveChanges() {
          try {
              await axios.put(`http://127.0.0.1:5000/api/proposals/${this.editingRow["總表項次"]}`, this.editingRow);
              alert("修改成功！");

              this.editingRow = null;
          
              this.fetchData(); // 重新獲取資料
          } catch (error) {
              console.error("更新失敗:", error);
              alert("修改失敗，請重試");
          }
      },

      async openEditModal(proposal) {
        this.editingRow = { ...proposal }; // 深拷貝，避免影響原始資料
      },

      closeEditModal() {
          this.editingRow = null; // 取消編輯
          this.progressText = '';
          this.setPlaceholder();
      },

      async deleteEditModal(proposal){
          console.log(proposal)  
          if (proposal['提案日期'] === this.Proposal_Date){
              
              try{
                  const response = await axios.post(`http://127.0.0.1:5000/api/del_proposal`, 
                      {
                          總表項次: proposal['總表項次'],   // 使用 row['總表項次'] 來直接取得正確的項次
                      }, 
                      {
                          headers: {
                              'Content-Type': 'application/json'  // 設置 Content-Type 為 application/json
                          }
                      }
                  );
                  // 判斷後端是否成功更新
                  if (response.status === 200) {
                      console.log('已刪除該列');
                  } else {
                          console.error('刪除失敗', response);
                  }
                  }catch(error){
                  console.log("該資訊更新失敗")
              }
              alert('已刪除完畢')
          }else{
              alert('本刪除不起作用喔！')
          }
          this.fetchData();
      },
      // 回上一頁
      returnSecondPage(){
          localStorage.setItem('username', this.username);
          window.location.href = "DataPage.html"; // 頁面跳轉
      },
      async downloadFile() {
          const filename = '專案匯出_(Security C).xlsx';  // 使用網頁端顯示的檔案名稱
          const encodedFilename = encodeURIComponent(filename);  // 編碼檔案名稱以處理特殊字符
      
          // 構建下載連結
          const link = document.createElement('a');
          link.href = `http://127.0.0.1:5000/api/download/${encodedFilename}`;  // 使用編碼過的檔案名稱
          document.body.appendChild(link); // 必須先將連結加到 DOM
          link.click();  // 模擬點擊來觸發下載
          document.body.removeChild(link);  // 刪除連結
          await this.fetchData();
      },

      async setSupervisorNode(){
        console.log(this.editingRow)
        localStorage.setItem('username', this.username);
        localStorage.setItem('editingRowData', JSON.stringify(this.editingRow));
        window.location.href = 'supervisor_node.html';

      },

  },
  mounted() {
    var userAccount = localStorage.getItem('username');
    if (userAccount) {
      this.username = userAccount;
      console.log("User account:", userAccount);
    } else {
      console.log("No user account found in sessionStorage.");
    }
  
    this.showLoading = true; 
  
    // 畫面淡入
    document.body.classList.add('opacity-100');
  
    // 頁面淡入完成後，關掉Loading
    setTimeout(() => {
      const loading = document.getElementById('loadingOverlay');
      if (loading) {
        loading.style.display = 'none';
      }
      this.showLoading = false; // 🚀 Loading結束後要關掉
    }, 700);
  
    // 啟動點點點動畫
    setInterval(() => {
      if (this.showLoading) {
        if (this.loadingDots.length >= 3) {
          this.loadingDots = '';
        } else {
          this.loadingDots += '.';
        }
      } else {
        this.loadingDots = '';
      }
    }, 100); 
  
    this.fetchData();
    this.setPlaceholder();
  }
});


app.use(ElementPlus);
app.component("plus", Plus);
app.component("delete", Delete);
app.mount("#app");