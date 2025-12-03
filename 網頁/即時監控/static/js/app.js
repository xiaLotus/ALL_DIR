  const { createApp, nextTick } = Vue;

  createApp({
    data() {
      return {
        activeTab: localStorage.getItem('activeTab') || 'task',
        socket: null,
        connected: false,
        taskListExpanded: true,  // Task 列表展開狀態
        wipListExpanded: true,   // WIP 列表展開狀態
        tasks: [],
        wipData: {},
        taskProgress: {
          current_index: 0,
          total: 0,
          current_task: null,
          status: 'idle'
        },
        wipProgress: {
          current_index: 0,
          total: 0,
          current_task: null,
          status: 'idle'
        },
        taskRound: {
          current_round: 0,
          current_start: null,
          current_end: null,
          last_round: 0,
          last_start: null,
          last_end: null,
          history: []
        },
        wipRound: {
          current_round: 0,
          current_start: null,
          current_end: null,
          last_round: 0,
          last_start: null,
          last_end: null,
          history: []
        }
      };
    },

    watch: {
      activeTab: {
        handler(newTab) {
          localStorage.setItem('activeTab', newTab);
          this.$nextTick(() => {
            setTimeout(() => {
              this.updateIcons();
            }, 100);
          });
        }
      },
      taskListExpanded() {
        this.$nextTick(() => {
          setTimeout(() => {
            this.updateIcons();
          }, 100);
        });
      },
      wipListExpanded() {
        this.$nextTick(() => {
          setTimeout(() => {
            this.updateIcons();
          }, 100);
        });
      }
    },

    methods: {
      async switchTab(tab) {
        this.activeTab = tab;
        localStorage.setItem('activeTab', tab);
        await nextTick();
        setTimeout(() => {
          this.updateIcons();
        }, 100);
      },

      getProgressPercent(progress) {
        if (progress.total === 0) return 0;
        return Math.round((progress.current_index / progress.total) * 100);
      },

      getStatusClass(status) {
        const classes = {
          'idle': 'status-idle',
          'running': 'status-running',
          'completed': 'status-completed'
        };
        return classes[status] || 'bg-gray-600';
      },

      getStatusText(status) {
        const texts = {
          'idle': '閒置中',
          'running': '執行中',
          'completed': '已完成'
        };
        return texts[status] || '未知';
      },

      formatTime(isoString) {
        if (!isoString) return '---';
        try {
          const date = new Date(isoString);
          return date.toLocaleString('zh-TW', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
        } catch (e) {
          return '---';
        }
      },

      calculateDuration(start, end) {
        if (!start) return '---';
        if (!end) return '執行中';
        
        try {
          const startTime = new Date(start);
          const endTime = new Date(end);
          const diffMs = endTime - startTime;
          
          if (diffMs < 0) return '---';
          
          const seconds = Math.floor(diffMs / 1000);
          const minutes = Math.floor(seconds / 60);
          const hours = Math.floor(minutes / 60);
          
          if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
          } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
          } else {
            return `${seconds}s`;
          }
        } catch (e) {
          return '---';
        }
      },

      updateIcons() {
        this.$nextTick(() => {
          setTimeout(() => {
            const elements = document.querySelectorAll("[data-lucide]");
            elements.forEach(el => {
              el.innerHTML = "";
              el.removeAttribute('data-lucide-processed');
            });
            lucide.createIcons();
          }, 50);
        });
      }
    },

    async mounted() {
      console.log("🔧 正在連接伺服器...");
      this.socket = io("http://127.0.0.1:5000");

      this.socket.on("connect", () => {
        console.log("✅ [WebSocket 已連線]");
        this.connected = true;
      });

      this.socket.on("disconnect", () => {
        console.log("❌ [WebSocket 已斷線]");
        this.connected = false;
      });

      this.socket.on("task_update", async (data) => {
        console.log("📋 [收到 Task 列表更新]", data);
        this.tasks = data;
        await nextTick();
        this.updateIcons();
      });

      this.socket.on("wip_update", async (data) => {
        console.log("📋 [收到 WIP 列表更新]", data);
        this.wipData = { ...data };
        await nextTick();
        setTimeout(() => {
          this.updateIcons();
        }, 100);
      });

      this.socket.on("task_progress_update", async (data) => {
        console.log("📊 [收到 Task 進度]", data);
        this.taskProgress = data;
        await nextTick();
        this.updateIcons();
      });

      this.socket.on("wip_progress_update", async (data) => {
        console.log("📊 [收到 WIP 進度]", data);
        this.wipProgress = data;
        await nextTick();
        this.updateIcons();
      });

      this.socket.on("task_round_update", async (data) => {
        console.log("🔄 [收到 Task 輪次更新]", data);
        this.taskRound = { ...data };
        await nextTick();
        this.updateIcons();
      });

      this.socket.on("wip_round_update", async (data) => {
        console.log("🔄 [收到 WIP 輪次更新]", data);
        this.wipRound = { ...data };
        await nextTick();
        this.updateIcons();
      });

      // 初始化圖標
      this.updateIcons();
      
      // 確保完全載入後再更新一次
      setTimeout(() => {
        this.updateIcons();
      }, 500);
    }
  }).mount("#app");