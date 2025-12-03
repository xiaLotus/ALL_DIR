// ⭐ 解析 URL 的 ?user=xxxx
function getQueryParam(key) {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(key);
  } catch (err) {
    console.error("URL 解析失敗:", err);
    return null;
  }
}

// FT01 資訊管理組 - 中控室應用程式
const app = Vue.createApp({
  data() {
    return {
      // 網站列表數據 (包含標籤和未完成事項)
      websites: [],
      // 搜尋和界面狀態
      searchTerm: "",
      isAddModalOpen: false,
      isEditModalOpen: false,
      newWebsite: { name: "", url: "", description: "", tags: [] },
      editingWebsite: null,
      currentTag: "",
      currentTime: new Date(),
      timer: null,
      selectedTag: "",

      // 分頁設定
      currentPage: 1,
      itemsPerPage: 8,
      showTip: false,

      // 未完成事項明細
      showTaskDetail: false,
      selectedWebsite: null,

      // 暗色模式
      isDarkMode: false,
      userId: "",
      username: "",
      role: "",

      // password
      password: '',
    };
  },

  computed: {
    // 過濾網站列表 (支持名稱、描述、標籤搜尋)
    filteredWebsites() {
      let filtered = this.websites;

      // 先根據選中的標籤過濾
      if (this.selectedTag) {
        filtered = filtered.filter(
          (site) => site.tags && site.tags.includes(this.selectedTag)
        );
      }

      // 再根據搜尋詞過濾
      if (this.searchTerm) {
        const searchLower = this.searchTerm.toLowerCase();
        filtered = filtered.filter((site) => {
          const nameMatch = site.name.toLowerCase().includes(searchLower);
          const descMatch = site.description
            .toLowerCase()
            .includes(searchLower);
          const tagMatch =
            site.tags &&
            site.tags.some((tag) => tag.toLowerCase().includes(searchLower));
          return nameMatch || descMatch || tagMatch;
        });
      }

      return filtered;
    },

    // 計算總頁數
    totalPages() {
      return Math.ceil(this.filteredWebsites.length / this.itemsPerPage);
    },

    // 獲取當前頁面的網站
    paginatedWebsites() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.filteredWebsites.slice(start, end);
    },
  },

  watch: {
    // 搜尋時重置到第一頁
    searchTerm() {
      this.currentPage = 1;
    },
    // 標籤切換時重置到第一頁
    selectedTag() {
      this.currentPage = 1;
    },
    // 監聽暗色模式變化，保存到 localStorage
    isDarkMode(newValue) {
      localStorage.setItem("darkMode", newValue);
    },
  },

  methods: {
    // ✅ 重新計算進度百分比
    recalculateProgress(website) {
      const completedCount = Array.isArray(website.completedTasks)
        ? website.completedTasks.length
        : typeof website.completedTasks === "number"
        ? website.completedTasks
        : 0;

      const incompleteCount = Array.isArray(website.incompleteTasks)
        ? website.incompleteTasks.length
        : 0;

      const totalCount = completedCount + incompleteCount;

      if (totalCount === 0) {
        // 沒有任何任務，視為 100% 完成
        website.incompletePercentage = 0;
        website.percentage = 0;
      } else {
        // 計算未完成百分比（四捨五入到整數）
        const incompletePercentage = Math.round(
          (incompleteCount / totalCount) * 100
        );
        website.incompletePercentage = incompletePercentage;
        website.percentage = incompletePercentage;
      }

      return website;
    },

    // 切換暗色模式
    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode;
      console.log("暗色模式已切換:", this.isDarkMode ? "開啟" : "關閉");

      // 重新初始化圖標
      this.$nextTick(() => {
        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }
      });
    },

    // 標籤過濾
    filterByTag(tag) {
      this.selectedTag = tag;
      console.log("過濾標籤:", tag || "全部");
    },

    // 切換添加網站模態框
    toggleAddModal() {
      this.isAddModalOpen = !this.isAddModalOpen;
      if (!this.isAddModalOpen) {
        this.newWebsite = { name: "", url: "", description: "", tags: [] };
        this.currentTag = "";
      }
      this.$nextTick(() => {
        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }
      });
    },

    // 添加標籤
    addTag() {
      if (
        this.currentTag.trim() &&
        !this.newWebsite.tags.includes(this.currentTag.trim())
      ) {
        this.newWebsite.tags.push(this.currentTag.trim());
        this.currentTag = "";
        this.$nextTick(() => {
          if (typeof lucide !== "undefined") {
            lucide.createIcons();
          }
        });
      }
    },

    // 移除標籤
    removeTag(tag) {
      this.newWebsite.tags = this.newWebsite.tags.filter((t) => t !== tag);
      this.$nextTick(() => {
        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }
      });
    },

    // 添加網站
    async addWebsite() {
      if (this.newWebsite.name && this.newWebsite.url) {
        const colors = [
          "bg-gradient-to-r from-blue-400 to-blue-600",
          "bg-gradient-to-r from-purple-400 to-purple-600",
          "bg-gradient-to-r from-orange-400 to-orange-600",
          "bg-gradient-to-r from-green-400 to-green-600",
          "bg-gradient-to-r from-red-400 to-red-600",
          "bg-gradient-to-r from-pink-400 to-pink-600",
        ];

        const icons = [
          "activity",
          "bar-chart",
          "file-text",
          "database",
          "settings",
          "monitor",
        ];

        const newSite = {
          name: this.newWebsite.name,
          url: this.newWebsite.url,
          description: this.newWebsite.description,
          color: colors[Math.floor(Math.random() * colors.length)],
          icon: icons[Math.floor(Math.random() * icons.length)],
          tags: this.newWebsite.tags,
          incompletePercentage: 0,
          completedTasks: [],
          incompleteTasks: [],
        };

        try {
          const response = await fetch("http://10.11.104.247:5001/api/websites", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              website: newSite,
              meta: {
                createdBy: this.userId, // 使用工號
              },
            }),
          });

          const result = await response.json();

          if (result.success) {
            // 後端會回傳包含 ID 的完整資料
            this.websites.push(result.data);
            console.log(
              `✅ ${this.role} ${this.username} 新增了網站：${result.data.name} (ID: ${result.data.id})，完成度：100%`
            );

            // ✅ 關閉模態框
            this.toggleAddModal();

            // ✅ 檢查 SweetAlert2 是否載入
            if (typeof Swal !== "undefined") {
              Swal.fire({
                icon: "success",
                title: "新增成功！",
                html: `網站 <strong>${result.data.name}</strong> 已成功建立`,
                confirmButtonText: "確定",
                confirmButtonColor: "#fb923c",
                timer: 3000,
                timerProgressBar: true,
              });
            } else {
              console.error("❌ SweetAlert2 未載入");
              alert(`✅ 新增成功！\n網站「${result.data.name}」已成功建立`);
            }
          } else {
            console.error("❌ 新增失敗:", result.message);

            // ✅ 檢查 SweetAlert2 是否載入
            if (typeof Swal !== "undefined") {
              Swal.fire({
                icon: "error",
                title: "新增失敗",
                text: result.message,
                confirmButtonText: "確定",
                confirmButtonColor: "#ef4444",
              });
            } else {
              console.error("❌ SweetAlert2 未載入");
              alert(`❌ 新增失敗\n${result.message}`);
            }
          }
        } catch (error) {
          console.error("❌ 無法連接到伺服器:", error);

          // ✅ 檢查 SweetAlert2 是否載入
          if (typeof Swal !== "undefined") {
            Swal.fire({
              icon: "error",
              title: "連線錯誤",
              text: "無法連接到伺服器，請檢查後端是否運行",
              confirmButtonText: "確定",
              confirmButtonColor: "#ef4444",
            });
          } else {
            console.error("❌ SweetAlert2 未載入");
            alert("❌ 連線錯誤\n無法連接到伺服器，請檢查後端是否運行");
          }
        }
      }
    },

    // 檢查是否有編輯權限（管理員或編輯者）
    hasEditPermission() {
      return this.role === "管理員" || this.role === "編輯者";
    },

    // ⭐ 檢查是否有刪除權限（只有編輯者）
    hasDeletePermission() {
      return this.role === "編輯者";
    },

    // 開啟編輯網站模態框
    openEditModal(website) {
      this.editingWebsite = { ...website };
      this.isEditModalOpen = true;
      this.$nextTick(() => {
        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }
      });
    },

    // 關閉編輯網站模態框
    closeEditModal() {
      this.isEditModalOpen = false;
      this.editingWebsite = null;
    },

    // 保存編輯的網站
    async saveEditedWebsite() {
      if (!this.editingWebsite.name || !this.editingWebsite.url) {
        // ✅ 使用 SweetAlert2 顯示驗證錯誤
        if (typeof Swal !== "undefined") {
          Swal.fire({
            icon: "warning",
            title: "資料不完整",
            text: "請填寫網站名稱和網址",
            confirmButtonText: "確定",
            confirmButtonColor: "#f59e0b",
          });
        } else {
          alert("請填寫網站名稱和網址");
        }
        return;
      }

      // ✅ 保存前重新計算百分比
      this.recalculateProgress(this.editingWebsite);

      try {
        const response = await fetch(
          `http://10.11.104.247:5001/api/websites/${this.editingWebsite.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              editingWebsite: this.editingWebsite,
              username: this.userId, // 使用工號
            }),
          }
        );

        const result = await response.json();

        if (result.success) {
          // 更新前端列表
          const index = this.websites.findIndex(
            (w) => w.id === this.editingWebsite.id
          );
          if (index !== -1) {
            this.websites[index] = result.data;
          }
          console.log(
            `✅ ${this.role} ${this.username} 修改了網站：${
              result.data.name
            }，進度：${100 - result.data.incompletePercentage}% 完成`
          );

          // ✅ 關閉模態框
          this.closeEditModal();

          // ✅ 顯示修改成功訊息
          if (typeof Swal !== "undefined") {
            Swal.fire({
              icon: "success",
              title: "修改成功！",
              html: `網站 <strong>${result.data.name}</strong> 已更新`,
              confirmButtonText: "確定",
              confirmButtonColor: "#10b981",
              timer: 2000,
              timerProgressBar: true,
            });
          } else {
            alert(`✅ 修改成功！\n網站「${result.data.name}」已更新`);
          }
        } else {
          console.error("❌ 修改失敗:", result.message);

          // ✅ 顯示修改失敗訊息
          if (typeof Swal !== "undefined") {
            Swal.fire({
              icon: "error",
              title: "修改失敗",
              text: result.message,
              confirmButtonText: "確定",
              confirmButtonColor: "#ef4444",
            });
          } else {
            alert("❌ 修改網站失敗：" + result.message);
          }
        }
      } catch (error) {
        console.error("❌ 無法連接到伺服器:", error);

        // ✅ 顯示連線錯誤
        if (typeof Swal !== "undefined") {
          Swal.fire({
            icon: "error",
            title: "連線錯誤",
            text: "無法連接到伺服器，請檢查後端是否運行",
            confirmButtonText: "確定",
            confirmButtonColor: "#ef4444",
          });
        } else {
          alert("❌ 無法連接到伺服器，請檢查後端是否運行");
        }
      }
    },

    // 刪除網站
    async deleteWebsite(website) {
      // ✅ 使用 SweetAlert2 確認對話框
      const swalResult = await Swal.fire({
        icon: "warning",
        title: "確定要刪除嗎？",
        html: `即將刪除網站 <strong>${website.name}</strong><br><span style="color: #ef4444;">此操作無法復原！</span>`,
        showCancelButton: true,
        confirmButtonText: "確定刪除",
        cancelButtonText: "取消",
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
        focusCancel: true,
      });

      // 如果用戶取消，直接返回
      if (!swalResult.isConfirmed) {
        return;
      }

      try {
        const response = await fetch(
          `http://10.11.104.247:5001/api/websites/${website.id}`,
          {
            method: "DELETE",
          }
        );

        const result = await response.json();

        if (result.success) {
          // 從前端列表移除
          const index = this.websites.findIndex((w) => w.id === website.id);
          if (index !== -1) {
            this.websites.splice(index, 1);
          }
          console.log(
            `✅ ${this.role} ${this.username} 刪除了網站：${website.name} (ID: ${website.id})`
          );

          // ✅ 顯示刪除成功訊息
          if (typeof Swal !== "undefined") {
            Swal.fire({
              icon: "success",
              title: "刪除成功！",
              text: `網站「${website.name}」已被刪除`,
              confirmButtonText: "確定",
              confirmButtonColor: "#10b981",
              timer: 2000,
              timerProgressBar: true,
            });
          } else {
            alert(`✅ 刪除成功！\n網站「${website.name}」已被刪除`);
          }
        } else {
          console.error("❌ 刪除失敗:", result.message);

          // ✅ 顯示刪除失敗訊息
          if (typeof Swal !== "undefined") {
            Swal.fire({
              icon: "error",
              title: "刪除失敗",
              text: result.message,
              confirmButtonText: "確定",
              confirmButtonColor: "#ef4444",
            });
          } else {
            alert("❌ 刪除網站失敗：" + result.message);
          }
        }
      } catch (error) {
        console.error("❌ 無法連接到伺服器:", error);

        // ✅ 顯示連線錯誤
        if (typeof Swal !== "undefined") {
          Swal.fire({
            icon: "error",
            title: "連線錯誤",
            text: "無法連接到伺服器，請檢查後端是否運行",
            confirmButtonText: "確定",
            confirmButtonColor: "#ef4444",
          });
        } else {
          alert("❌ 無法連接到伺服器，請檢查後端是否運行");
        }
      }
    },

    // 編輯網站標籤（for 編輯模態框）
    addEditTag() {
      if (
        this.currentTag.trim() &&
        !this.editingWebsite.tags.includes(this.currentTag.trim())
      ) {
        this.editingWebsite.tags.push(this.currentTag.trim());
        this.currentTag = "";
        this.$nextTick(() => {
          if (typeof lucide !== "undefined") {
            lucide.createIcons();
          }
        });
      }
    },

    removeEditTag(tag) {
      this.editingWebsite.tags = this.editingWebsite.tags.filter(
        (t) => t !== tag
      );
      this.$nextTick(() => {
        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }
      });
    },

    // 開啟未完成事項頁面
    openUncompletePage(website) {
      // ✅ 跳轉前重新計算百分比
      this.recalculateProgress(website);

      localStorage.setItem("currentWebsiteData", JSON.stringify(website));
      const params = new URLSearchParams({
        name: website.name,
        id: website.id,
        percentage: website.incompletePercentage,
      });
      const fullUrl = `./CheckMisssion/incomplete_tasks.html?${params.toString()}`;
      console.log("跳轉到未完成事項頁面：", fullUrl);
      window.location.href = fullUrl;
    },

    // 開啟已完成事項頁面
    openCompletePage(website) {
      // ✅ 跳轉前重新計算百分比
      this.recalculateProgress(website);

      localStorage.setItem("currentWebsiteData", JSON.stringify(website));
      const params = new URLSearchParams({
        name: website.name,
        id: website.id,
        percentage: 100 - website.incompletePercentage,
      });
      const fullUrl = `./CheckMisssion/completed_tasks.html?${params.toString()}`;
      console.log("跳轉到已完成事項頁面：", fullUrl);
      window.location.href = fullUrl;
    },

    // 開啟未完成事項明細
    openTaskDetail(website) {
      this.selectedWebsite = website;
      this.showTaskDetail = true;
    },

    // 關閉未完成事項明細
    closeTaskDetail() {
      this.showTaskDetail = false;
      this.selectedWebsite = null;
    },

    // 獲取優先級顏色
    getPriorityColor(priority) {
      switch (priority) {
        case "high":
          return "text-red-600";
        case "medium":
          return "text-yellow-600";
        case "low":
          return "text-green-600";
        default:
          return "text-gray-600";
      }
    },

    // 獲取優先級文字
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

    // 開啟網站
    openWebsite(url) {
      if (url && url !== "#") {
        window.open(url, "_blank");
      }
    },

    // 跳到指定頁面
    goToPage(page) {
      this.currentPage = page;
    },

    // ✅ 儲存目前頁碼
    saveCurrentPage() {
      localStorage.setItem("currentPage", this.currentPage);
      console.log("📄 已記錄當前頁面：", this.currentPage);
    },

    // ✅ 從 localStorage 載入頁碼
    loadCurrentPage() {
      const savedPage = parseInt(localStorage.getItem("currentPage"));
      if (!isNaN(savedPage) && savedPage > 0) {
        this.currentPage = savedPage;
        console.log("📄 從 localStorage 載入頁面：", this.currentPage);
      } else {
        this.currentPage = 1;
      }
    },

    // 上一頁
    previousPage() {
      console.log(
        "previousPage 被調用，當前頁面：",
        this.currentPage,
        "總頁數：",
        this.totalPages
      );

      if (this.totalPages <= 1) return;

      if (this.currentPage > 1) {
        this.currentPage--;
        console.log("切換到上一頁：", this.currentPage);
      } else {
        this.currentPage = this.totalPages;
        console.log("循環到最後一頁：", this.currentPage);
      }
      this.saveCurrentPage();
      this.$nextTick(() => {
        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }
      });
    },

    // 下一頁
    nextPage() {
      console.log(
        "nextPage 被調用，當前頁面：",
        this.currentPage,
        "總頁數：",
        this.totalPages
      );

      if (this.totalPages <= 1) return;

      if (this.currentPage < this.totalPages) {
        this.currentPage++;
        console.log("切換到下一頁：", this.currentPage);
      } else {
        this.currentPage = 1;
        console.log("循環到第一頁：", this.currentPage);
      }
      this.saveCurrentPage();
      this.$nextTick(() => {
        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }
      });
    },

    // 關閉使用提示
    closeTip() {
      this.showTip = false;
      // ✅ 記錄已經顯示過提示
      localStorage.setItem("hasSeenNavigationTip", "true");
      console.log("使用提示已關閉，並記錄到 localStorage");
    },

    // 處理鍵盤事件
    handleKeydown(event) {
      console.log("鍵盤事件觸發，按鍵：", event.key, "keyCode:", event.keyCode);

      if (this.totalPages <= 1) {
        console.log("只有一頁，忽略鍵盤事件");
        return;
      }

      if (
        event.target.tagName === "INPUT" ||
        event.target.tagName === "TEXTAREA"
      ) {
        console.log("在輸入框中，忽略鍵盤事件");
        return;
      }

      if (event.key === "ArrowLeft" || event.keyCode === 37) {
        event.preventDefault();
        console.log("按下左箭頭鍵");
        this.previousPage();
      } else if (event.key === "ArrowRight" || event.keyCode === 39) {
        event.preventDefault();
        console.log("按下右箭頭鍵");
        this.nextPage();
      }
    },
    async login() {
      this.errorMsg = "";
      this.isLoading = true;
      this.password = '';
    
      try {
        const res = await fetch("http://10.11.104.247:5001/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: this.username,
            password: this.password,
            loginpage: 'dashboard',
          }),
        });
    
        const data = await res.json();
    
        if (res.ok && data.success) {
          // ⭐ 寫入登入資訊（後端回傳）
          localStorage.setItem("username", this.username);
          localStorage.setItem("role", data.chataster || data.role || "使用者");
          localStorage.setItem("工號", data.工號 || "");
          localStorage.setItem("姓名", data.姓名 || "");
    
          console.log("⭐ login() 執行完成");
    
          return true; // ⭐ 重要：回傳成功
        } else {
          console.error("❌ 登入失敗:", data.message || "帳號密碼錯誤");
          this.errorMsg = data.message || "登入失敗";
          this.isLoading = false;
          return false; // ⭐ 登入失敗
        }
      } catch (err) {
        console.error("❌ 連線錯誤:", err);
        this.errorMsg = "伺服器連線錯誤";
        this.isLoading = false;
        return false;
      }
    }
    
  },

  // 組件掛載時執行
  mounted() {
    console.log("FT01 資訊管理組中控室應用程式已啟動");

    // ⭐ 1. 先讀 URL 的 ?user=xxxx
    const urlUser = getQueryParam("user");

    // ⭐ 2. 讀 localStorage 的 username / loggedUser
    this.username =
      urlUser ||
      localStorage.getItem("username") ||
      localStorage.getItem("loggedUser") ||
      "";

    console.log("🔍 this.username :", this.username);

    // ⭐ 若 URL 有 user → 儲存回 localStorage（同步兩者）
    if (urlUser) {
      localStorage.setItem("username", urlUser);
    }

    // // ⭐ 若無登入紀錄 → 導向登入頁
    // if (!this.username) {
    //   console.warn("⚠️ 未登入，導向登入頁面");
    //   window.location.href = "login.html";
    //   return;
    // }
  
    // ⭐ 先 login() → 等完成才初始化畫面
    this.login().then((success) => {
      console.log("已經走過 login() ")
      // if (!success) {
      //   console.error("❌ 自動登入失敗，導回登入頁");
      //   window.location.href = "login.html";
      //   return;
      // }
  
      // ⭐ login 成功後才會有以下資料
      this.userId = localStorage.getItem("工號") || "";
      this.name   = localStorage.getItem("姓名") || "";
      this.role   = localStorage.getItem("role") || "使用者";
  
      console.log(`👤 登入者：${this.name} (${this.userId})，角色：${this.role}`);
  
      // ----------------------------------------------------
      //  以下是原本 dashboard 初始化內容（全都要放 inside login().then）
      // ----------------------------------------------------
  
      // 載入暗色模式
      const savedDarkMode = localStorage.getItem("darkMode");
      if (savedDarkMode !== null) {
        this.isDarkMode = savedDarkMode === "true";
        console.log("載入暗色模式設定:", this.isDarkMode);
      }
  
      // 載入網站清單
      fetch("http://10.11.104.247:5001/api/websites")
        .then((res) => res.json())
        .then((data) => {
          this.websites = data.map((website) => {
            if (!Array.isArray(website.completedTasks)) website.completedTasks = [];
            if (!Array.isArray(website.incompleteTasks)) website.incompleteTasks = [];
            return this.recalculateProgress(website);
          });
  
          console.log("✅ 已載入網站清單並重新計算進度：", this.websites);
          this.loadCurrentPage();
        })
        .catch((err) => console.error("❌ 載入失敗:", err));
  
      // 啟動時間更新
      this.timer = setInterval(() => {
        this.currentTime = new Date();
      }, 1000);
  
      // 初始化 icons
      if (typeof lucide !== "undefined") {
        lucide.createIcons();
      }
  
      // 鍵盤切換頁面
      document.addEventListener("keydown", this.handleKeydown);
      console.log("鍵盤導航已啟用：使用 ← → 鍵切換頁面");
  
      // 顯示使用提示
      const hasSeenTip = localStorage.getItem("hasSeenNavigationTip");
      setTimeout(() => {
        if (this.totalPages > 1 && !hasSeenTip) {
          this.showTip = true;
          setTimeout(() => {
            if (this.showTip) {
              this.showTip = false;
              localStorage.setItem("hasSeenNavigationTip", "true");
            }
          }, 5050);
        }
      }, 1000);
    });
  },
  

  // 組件更新後執行
  updated() {
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  },

  // 組件卸載前清理
  beforeUnmount() {
    console.log("清理應用程式資源");
    if (this.timer) {
      clearInterval(this.timer);
    }
    document.removeEventListener("keydown", this.handleKeydown);
  },
});

// 掛載 Vue 應用
app.mount("#app");
console.log("FT01 資訊管理組中控室已成功掛載");
