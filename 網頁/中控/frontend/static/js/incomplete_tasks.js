const app = Vue.createApp({
  // ==================== 數據 ====================
  data() {
    return {
      loading: true,
      websiteData: null,
      currentTime: new Date(),
      timer: null,
      userId: "",
      username: "",
      role: "",
      isDarkMode: false,

      // 任務編輯相關
      showTaskModal: false,
      isEditMode: false,
      currentTask: {
        title: "",
        description: "",
        dueDate: "",
        priority: "medium",
      },
      editingIndex: null,
    };
  },

  // ==================== 計算屬性 ====================
  computed: {
    totalTasks() {
      if (!this.websiteData) return 0;

      // 正確處理 completedTasks,可能是陣列或數字
      let completed = 0;
      if (Array.isArray(this.websiteData.completedTasks)) {
        completed = this.websiteData.completedTasks.length;
      } else if (typeof this.websiteData.completedTasks === "number") {
        completed = this.websiteData.completedTasks;
      }

      const incomplete = this.websiteData.incompleteTasks
        ? this.websiteData.incompleteTasks.length
        : 0;
      return completed + incomplete;
    },

    // 判斷是否為編輯者
    isEditor() {
      return this.role === "編輯者";
    },
  },

  // ==================== 生命週期鉤子 ====================
  mounted() {
    // ✅ 檢查登入狀態
    const loginUsername =
      localStorage.getItem("username") || localStorage.getItem("工號");
    if (!loginUsername) {
      console.warn("⚠️ 未登入，導向登入頁面");
      window.location.href = "../login.html";
      return;
    }

    // 讀取用戶資訊
    this.userId = loginUsername; // 工號，用於 API 請求
    this.username = localStorage.getItem("姓名") || "訪客"; // 姓名，用於顯示
    this.role =
      localStorage.getItem("role") ||
      localStorage.getItem("chataster") ||
      "使用者";

    // 讀取暗色模式設定
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode !== null) {
      this.isDarkMode = savedDarkMode === "true";
      console.log("載入暗色模式設定:", this.isDarkMode);
    }

    console.log("當前用戶:", this.username, "角色:", this.role);

    // 啟動時間更新
    this.timer = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);

    // 初始化圖標
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }

    // 載入網站數據
    this.loadWebsiteData();
  },

  beforeUnmount() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  },

  // ==================== 方法 ====================
  methods: {
    // -------------------- 暗色模式 --------------------
    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode;
      localStorage.setItem("darkMode", this.isDarkMode);
      console.log("暗色模式已切換:", this.isDarkMode ? "開啟" : "關閉");

      this.$nextTick(() => {
        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }
      });
    },

    // -------------------- 數據載入 --------------------
    loadWebsiteData() {
      setTimeout(() => {
        try {
          const params = new URLSearchParams(window.location.search);
          const id = params.get("id");

          const storedData = localStorage.getItem("currentWebsiteData");
          if (storedData) {
            const website = JSON.parse(storedData);

            if (!id || id == website.id) {
              this.websiteData = website;

              // 確保 completedTasks 是陣列格式
              if (!Array.isArray(this.websiteData.completedTasks)) {
                const count = Number(this.websiteData.completedTasks) || 0;
                this.websiteData.completedTasks = [];
                console.log(
                  `completedTasks 原本是數字: ${count},已轉換為空陣列`
                );
              }

              if (!Array.isArray(this.websiteData.incompleteTasks)) {
                this.websiteData.incompleteTasks = [];
              }

              // 重新計算百分比(以實際任務數量為準)
              this.recalculateProgress();

              console.log("已載入網站資料:", this.websiteData);
            } else {
              console.warn("URL 的 id 跟 localStorage 資料不符");
            }
          } else {
            console.warn("找不到 localStorage 資料");
          }
        } catch (error) {
          console.error("載入數據時發生錯誤:", error);
        }

        this.loading = false;

        this.$nextTick(() => {
          if (typeof lucide !== "undefined") {
            lucide.createIcons();
          }
        });
      }, 800);
    },

    // -------------------- 樣式相關 --------------------
    getRoleBadgeClass() {
      if (this.role === "管理員")
        return "bg-purple-100 text-purple-700 border border-purple-200";
      if (this.role === "編輯者")
        return "bg-blue-100 text-blue-700 border border-blue-200";
      return "bg-gray-100 text-gray-700 border border-gray-200";
    },

    getPriorityColor(priority) {
      switch (priority) {
        case "high":
          return "text-red-600";
        case "medium":
          return "text-yellow-600";
        case "low":
          return "";
        default:
          return "";
      }
    },

    getPriorityText(priority) {
      switch (priority) {
        case "high":
          return "高優先級";
        case "medium":
          return "中優先級";
        case "low":
          return "低優先級";
        default:
          return "一般";
      }
    },

    getPriorityBadgeColor(priority) {
      switch (priority) {
        case "high":
          return "bg-red-100 text-red-700 border border-red-200";
        case "medium":
          return "bg-yellow-100 text-yellow-700 border border-yellow-200";
        case "low":
          return "bg-gray-100 text-gray-700 border border-gray-200";
        default:
          return "bg-gray-100 text-gray-700 border border-gray-200";
      }
    },

    getPriorityCardColor(priority) {
      switch (priority) {
        case "high":
          return "bg-red-50 border border-red-200 hover:bg-red-100";
        case "medium":
          return "bg-yellow-50 border border-yellow-200 hover:bg-yellow-100";
        case "low":
          return "bg-white border border-gray-200 hover:bg-gray-100";
        default:
          return "bg-white border border-gray-200 hover:bg-gray-100";
      }
    },

    // -------------------- 導航 --------------------
    goBack() {
      window.location.href = "./../dashboard.html";
    },

    openOriginalSite() {
      if (
        this.websiteData &&
        this.websiteData.url &&
        this.websiteData.url !== "#"
      ) {
        window.open(this.websiteData.url, "_blank");
      }
    },

    // -------------------- 任務管理：新增 --------------------
    openAddTaskModal() {
      this.isEditMode = false;
      this.currentTask = {
        title: "",
        description: "",
        dueDate: "",
        priority: "medium",
      };
      this.showTaskModal = true;
      this.$nextTick(() => {
        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }
      });
    },

    // -------------------- 任務管理：編輯 --------------------
    openEditTaskModal(task, index) {
      this.isEditMode = true;
      this.editingIndex = index;
      this.currentTask = { ...task };
      this.showTaskModal = true;
      this.$nextTick(() => {
        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }
      });
    },

    // -------------------- 任務管理：關閉模態框 --------------------
    closeTaskModal() {
      this.showTaskModal = false;
      this.isEditMode = false;
      this.editingIndex = null;
      this.currentTask = {
        title: "",
        description: "",
        dueDate: "",
        priority: "medium",
      };
    },

    // -------------------- 任務管理：保存 --------------------
    async saveTask() {
      if (!this.currentTask.title || !this.currentTask.description) {
        Swal.fire({
          icon: "warning",
          title: "資料不完整",
          text: "請填寫任務標題和描述",
          confirmButtonColor: "#fb923c",
        });
        return;
      }

      if (this.isEditMode) {
        // 編輯現有任務
        this.websiteData.incompleteTasks[this.editingIndex] = {
          ...this.currentTask,
        };
        console.log(`✅ ${this.username} 修改了任務:${this.currentTask.title}`);
      } else {
        // 新增任務
        this.websiteData.incompleteTasks.push({ ...this.currentTask });
        console.log(`✅ ${this.username} 新增了任務:${this.currentTask.title}`);
      }

      // 重新計算百分比
      this.recalculateProgress();

      // 更新 localStorage
      localStorage.setItem(
        "currentWebsiteData",
        JSON.stringify(this.websiteData)
      );

      // 同步到後端
      await this.syncToBackend();

      this.closeTaskModal();

      this.$nextTick(() => {
        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }
      });
    },

    // -------------------- 任務管理：刪除 --------------------
    async deleteTask(index) {
      if (confirm("確定要刪除這個任務嗎?")) {
        const deletedTask = this.websiteData.incompleteTasks[index];
        this.websiteData.incompleteTasks.splice(index, 1);

        // 重新計算百分比
        this.recalculateProgress();

        // 更新 localStorage
        localStorage.setItem(
          "currentWebsiteData",
          JSON.stringify(this.websiteData)
        );

        console.log(`✅ ${this.username} 刪除了任務:${deletedTask.title}`);

        // 同步到後端
        await this.syncToBackend();

        this.$nextTick(() => {
          if (typeof lucide !== "undefined") {
            lucide.createIcons();
          }
        });
      }
    },

    // -------------------- 任務管理：標記為已完成 --------------------
    async markAsCompleted(task, index) {
      const { value: completedDate } = await Swal.fire({
        title: "請輸入完成日期",
        input: "text",
        inputLabel: "日期格式: YYYY/MM/DD",
        inputValue: new Date().toISOString().split("T")[0].replace(/-/g, "/"),
        inputPlaceholder: "例如: 2025/01/15",
        showCancelButton: true,
        confirmButtonText: "確認",
        cancelButtonText: "取消",
        confirmButtonColor: "#f97316",
        cancelButtonColor: "#6b7280",
        inputValidator: (value) => {
          if (!value) {
            return "請輸入日期!";
          }
          const datePattern = /^\d{4}\/\d{2}\/\d{2}$/;
          if (!datePattern.test(value)) {
            return "日期格式錯誤!請使用 YYYY/MM/DD 格式(例如:2025/01/15)";
          }
        },
      });

      if (!completedDate) {
        return; // 用戶取消
      }

      const completedBy = this.username || "未知";

      // 從未完成列表中移除
      this.websiteData.incompleteTasks.splice(index, 1);

      // 添加到已完成列表
      if (!Array.isArray(this.websiteData.completedTasks)) {
        this.websiteData.completedTasks = [];
      }

      this.websiteData.completedTasks.push({
        title: task.title,
        description: task.description,
        completedDate: completedDate,
        completedBy: completedBy,
      });

      // 重新計算百分比
      this.recalculateProgress();

      // 更新 localStorage
      localStorage.setItem(
        "currentWebsiteData",
        JSON.stringify(this.websiteData)
      );

      console.log(`✅ ${this.username} 將任務標記為已完成:${task.title}`);
      console.log(
        `📊 新的進度: 已完成 ${100 - this.websiteData.percentage}%, 未完成 ${
          this.websiteData.percentage
        }%`
      );

      // 同步到後端
      await this.syncToBackend();

      this.$nextTick(() => {
        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }
      });

      // 顯示成功訊息
      await Swal.fire({
        icon: "success",
        title: "完成!",
        text: `任務「${task.title}」已標記為完成!`,
        confirmButtonText: "確定",
        confirmButtonColor: "#f97316",
        timer: 2000,
      });
    },

    // -------------------- 進度計算 --------------------
    recalculateProgress() {
      const completedCount = Array.isArray(this.websiteData.completedTasks)
        ? this.websiteData.completedTasks.length
        : 0;
      const incompleteCount = Array.isArray(this.websiteData.incompleteTasks)
        ? this.websiteData.incompleteTasks.length
        : 0;
      const totalCount = completedCount + incompleteCount;

      if (totalCount === 0) {
        // 沒有任何任務,視為 100% 完成
        this.websiteData.percentage = 0;
        this.websiteData.incompletePercentage = 0;
      } else {
        // 計算未完成百分比(四捨五入到整數)
        const incompletePercentage = Math.round(
          (incompleteCount / totalCount) * 100
        );
        this.websiteData.percentage = incompletePercentage;
        this.websiteData.incompletePercentage = incompletePercentage;
      }

      console.log(
        `📊 重新計算進度: 已完成 ${completedCount} 項, 未完成 ${incompleteCount} 項, 總計 ${totalCount} 項`
      );
      console.log(
        `📊 百分比: 已完成 ${100 - this.websiteData.percentage}%, 未完成 ${
          this.websiteData.percentage
        }%`
      );
    },

    // -------------------- 後端同步 --------------------
    async syncToBackend() {
      try {
        const response = await fetch(
          `http://10.11.104.247:5001/api/websites/${this.websiteData.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              website: this.websiteData,
              username: this.userId, // 使用工號而不是姓名
            }),
          }
        );

        const result = await response.json();

        if (result.success) {
          console.log("✅ 資料已同步到後端");
        } else {
          console.error("❌ 同步失敗:", result.message);
          alert("資料同步失敗,請稍後再試");
        }
      } catch (error) {
        console.error("❌ 同步到後端時發生錯誤:", error);
        alert("無法連接到伺服器,資料僅保存在本地");
      }
    },
  },
});

app.mount("#app");
