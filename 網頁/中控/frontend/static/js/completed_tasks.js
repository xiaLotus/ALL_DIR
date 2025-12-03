const app = Vue.createApp({
  // ==================== 數據 ====================
  data() {
    return {
      websiteData: null,
      loading: true,
      currentTime: new Date(),
      timer: null,
      userId: '',
      username: '',
      role: '',
      isDarkMode: false,
      showTaskModal: false,
      isEditMode: false,
      currentTask: {
        id: null,
        title: '',
        description: '',
        completedDate: '',
        completedBy: ''
      },
    };
  },

  // ==================== 計算屬性 ====================
  computed: {
    isEditor() {
      return this.role === '編輯者';
    },
    
    completedTasksCount() {
      if (!this.websiteData || !this.websiteData.completedTasks) return 0;
      return Array.isArray(this.websiteData.completedTasks) 
        ? this.websiteData.completedTasks.length 
        : 0;
    },

    reversedCompletedTasks() {
      if (!this.websiteData || !this.websiteData.completedTasks) return [];

      return [...this.websiteData.completedTasks].sort((a, b) => {
        // 將 "YYYY/MM/DD" 轉成 Date 物件
        const dateA = new Date(a.completedDate.replace(/\//g, '-'));
        const dateB = new Date(b.completedDate.replace(/\//g, '-'));
        // 由新到舊排序
        return dateB - dateA;
      });
    }
    
  },

  // ==================== 監聽器 ====================
  watch: {
    showTaskModal(newVal) {
      this.$nextTick(() => {
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
      });
    }
  },

  // ==================== 生命週期鉤子 ====================
  mounted() {
    // ✅ 檢查登入狀態
    const loginUsername = localStorage.getItem("username") || localStorage.getItem("工號");
    if (!loginUsername) {
      console.warn('⚠️ 未登入，導向登入頁面');
      window.location.href = '../login.html';
      return;
    }
    
    this.userId = loginUsername;  // 工號，用於 API 請求
    this.username = localStorage.getItem('姓名') || '訪客';  // 姓名，用於顯示
    this.role = localStorage.getItem('role') || localStorage.getItem('chataster') || '使用者';
    
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      this.isDarkMode = savedDarkMode === 'true';
      this.applyDarkMode(this.isDarkMode);
    }
    
    this.loadWebsiteData();
    
    this.timer = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
    
    this.$nextTick(() => {
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    });
  },

  updated() {
    this.$nextTick(() => {
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    });
  },

  beforeUnmount() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  },

  // ==================== 方法 ====================
  methods: {
    // -------------------- 暗色模式 --------------------
    applyDarkMode(isDark) {
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.body.classList.remove('bg-gradient-to-br', 'from-green-50', 'via-emerald-50', 'to-teal-50');
        document.body.classList.add('dark-mode-bg');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark-mode-bg');
        document.body.classList.add('bg-gradient-to-br', 'from-green-50', 'via-emerald-50', 'to-teal-50');
      }
    },

    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode;
      localStorage.setItem('darkMode', this.isDarkMode.toString());
      this.applyDarkMode(this.isDarkMode);
      this.$nextTick(() => {
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
      });
    },

    // -------------------- 樣式相關 --------------------
    getRoleBadgeClass() {
      const roles = {
        '管理員': this.isDarkMode ? 'bg-purple-900/50 text-purple-300 border-purple-700/50' : 'bg-purple-100 text-purple-700 border-purple-200',
        '編輯者': this.isDarkMode ? 'bg-blue-900/50 text-blue-300 border-blue-700/50' : 'bg-blue-100 text-blue-700 border-blue-200',
      };
      return roles[this.role] || (this.isDarkMode ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-700 border-gray-200');
    },

    // -------------------- 導航 --------------------
    goBack() {
      window.location.href = './../dashboard.html';
    },

    viewIncomplete() {
      const params = new URLSearchParams({
        name: this.websiteData.name,
        id: this.websiteData.id,
        percentage: this.websiteData.incompletePercentage
      });
      window.location.href = `./incomplete_tasks.html?${params.toString()}`;
    },

    // -------------------- 唯一 ID 生成器 --------------------
    generateUniqueId() {
      return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    },
    
    // -------------------- 數據載入 --------------------
    loadWebsiteData() {
      try {
        const data = localStorage.getItem('currentWebsiteData');
        if (data) {
          this.websiteData = JSON.parse(data);
          
          // 確保數據格式正確
          if (!Array.isArray(this.websiteData.completedTasks)) {
            this.websiteData.completedTasks = [];
          }
          if (!Array.isArray(this.websiteData.incompleteTasks)) {
            this.websiteData.incompleteTasks = [];
          }

          // 為舊數據生成 ID
          this.websiteData.completedTasks = this.websiteData.completedTasks.map(task => {
            if (!task.id) {
              return { ...task, id: this.generateUniqueId() };
            }
            return task;
          });

          this.recalculateProgress();
        }
      } catch (error) {
        console.error('載入資料時發生錯誤:', error);
      } finally {
        this.loading = false;
      }
    },

    // -------------------- 任務管理：新增 --------------------
    openAddTaskModal() {
      this.isEditMode = false;
      this.currentTask = {
        id: this.generateUniqueId(), // 新增時生成唯一 ID
        title: '',
        description: '',
        completedDate: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
        completedBy: this.username
      };
      this.showTaskModal = true;
    },

    // -------------------- 任務管理：編輯 --------------------
    openEditTaskModal(task) { // 移除 index 參數
      this.isEditMode = true;
      // this.editingIndex = index; // 不再需要 editingIndex
      this.currentTask = JSON.parse(JSON.stringify(task)); // ✅ 深拷貝
      this.showTaskModal = true;
      console.log(JSON.parse(JSON.stringify(this.currentTask)));
    },

    // -------------------- 任務管理：關閉模態框 --------------------
    closeTaskModal() {
      this.showTaskModal = false;
      this.isEditMode = false;
      // this.editingIndex = null; // 不再需要 editingIndex
      this.currentTask = {
        id: null, // 重置 ID
        title: '',
        description: '',
        completedDate: '',
        completedBy: ''
      };
    },

    // -------------------- 任務管理：保存 --------------------
    async saveTask() {
      if (!this.currentTask.title || !this.currentTask.description) {
        alert('請填寫任務標題和描述');
        return;
      }
      
      if (this.currentTask.completedDate && !/^\d{4}\/\d{2}\/\d{2}$/.test(this.currentTask.completedDate)) {
        alert('日期格式錯誤!請使用 YYYY/MM/DD 格式');
        return;
      }
      
      if (this.isEditMode) {
        // 根據 ID 查找並更新任務
        const index = this.websiteData.completedTasks.findIndex(task => task.id === this.currentTask.id);
        if (index !== -1) {
          this.websiteData.completedTasks.splice(index, 1, JSON.parse(JSON.stringify(this.currentTask)));
        } else {
          console.error('編輯模式下未找到任務 ID:', this.currentTask.id);
          alert('編輯失敗：未找到對應任務。');
        }
      } else {
        this.websiteData.completedTasks.push(JSON.parse(JSON.stringify(this.currentTask)));
      }      
      this.recalculateProgress();
      localStorage.setItem('currentWebsiteData', JSON.stringify(this.websiteData));
      await this.syncToBackend();
      this.closeTaskModal();
    },

    // -------------------- 任務管理：刪除 --------------------
    async deleteTask(taskId) { // 接收任務 ID 而不是 index
      if (confirm('確定要刪除這個任務嗎?')) {
        const index = this.websiteData.completedTasks.findIndex(task => task.id === taskId);
        if (index !== -1) {
          this.websiteData.completedTasks.splice(index, 1);
          this.recalculateProgress();
          localStorage.setItem('currentWebsiteData', JSON.stringify(this.websiteData));
          await this.syncToBackend();
        } else {
          console.error('刪除失敗：未找到任務 ID:', taskId);
          alert('刪除失敗：未找到對應任務。');
        }
      }
    },

    // -------------------- 進度計算 --------------------
    recalculateProgress() {
      const completedCount = this.websiteData.completedTasks?.length || 0;
      const incompleteCount = this.websiteData.incompleteTasks?.length || 0;
      const totalCount = completedCount + incompleteCount;
      const incompletePercentage = totalCount === 0 ? 0 : Math.round((incompleteCount / totalCount) * 100);
      this.websiteData.percentage = incompletePercentage;
      this.websiteData.incompletePercentage = incompletePercentage;
    },

    // -------------------- 後端同步 --------------------
    async syncToBackend() {
      try {
        const response = await fetch(`http://10.11.104.247:5001/api/websites/${this.websiteData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            website: this.websiteData,
            username: this.userId  // 使用工號而不是姓名
          })
        });
        
        const result = await response.json();
        
        if (!result.success) {
          console.error('❌ 同步失敗:', result.message);
          alert('資料同步失敗,請稍後再試');
        }
      } catch (error) {
        console.error('❌ 同步到後端時發生錯誤:', error);
        alert('無法連接到伺服器,資料僅保存在本地');
      }
    },

    // -------------------- 對於項次做修正 --------------------
    formatDescription(desc) {
      if (!desc) return '';
      // 把換行或數字開頭自動轉成 <br>
      return desc
        .replace(/\n/g, '<br>')                // 換行轉成 <br>
        .replace(/(\d+)\.\s?/g, '<br>$1. ');  // 讓 1. 2. 開頭的項目換行
    }
  }
});

app.mount('#app');