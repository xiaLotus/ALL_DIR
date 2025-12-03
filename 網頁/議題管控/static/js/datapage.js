const { createApp, nextTick } = Vue;

const app = Vue.createApp({
  data() {
    return {
      chart: null,
      isLoading: false,
      isFirstLoading: true,    
      loadingTextInterval: null,
      showCard: false, 
      scrollHint: '',   
      hintVisible: true,
      showTooltip: false,
    
      username: '', // 使用者
    }
  },
  async mounted() {
    var userAccount = localStorage.getItem('username');
    // 檢查是否成功取得資料
    if (userAccount) {
        this.username = userAccount
        console.log("User account:", userAccount);
    } else {
        console.log("No user account found in sessionStorage.");
    }
    await this.startFirstLoading(); 
    await this.loadData();
    window.addEventListener('scroll', this.handleScroll);
  },

  beforeUnmount() {
    window.removeEventListener('scroll', this.handleScroll);
  },

  methods: {
    async startFirstLoading() {
      document.getElementById('loadingOverlay').classList.remove('hidden');
      this.startLoadingTextAnimation();
      await new Promise(resolve => setTimeout(resolve, 2000)); // 假裝loading2秒
      document.getElementById('loadingOverlay').classList.add('hidden');
      this.stopLoadingTextAnimation();
      this.isFirstLoading = false;
    },

    async loadData() {
      if (this.isLoading) return;
      
      // 👉 如果是第一次進頁面，跳過這裡的 loading 遮罩
      if (!this.isFirstLoading) {
        this.isLoading = true;
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.remove('hidden');
        this.startLoadingTextAnimation();
      }
    
      try {
        await Promise.all([
          this.fetchWeeklySummary(),
          this.fetchWeeklyWorkDetail(),
          new Promise(resolve => setTimeout(resolve, 3000))
        ]);
      } catch (err) {
        console.error('載入錯誤', err);
      } finally {
        if (!this.isFirstLoading) {
          const overlay = document.getElementById('loadingOverlay');
          if (overlay) overlay.classList.add('hidden');
          // this.stopLoadingTextAnimation();
          this.isLoading = false;
        }
      }
    },
    
    
    async fetchWeeklySummary() {
      const res = await fetch('http://127.0.0.1:5000/api/weekly-summary');
      const data = await res.json();
    
      const weeks = data["週次"];
      const done = data["done"];
      const ongoing = data["on going"];
      const overdue = data["累積逾期數"];
    
      await nextTick();
    
      const canvas = document.getElementById("caseChart");
      if (!canvas) {
        console.warn("caseChart canvas不存在，跳過繪製");
        return;
      }
      const ctx = canvas.getContext('2d');
    
      // ✅ 安全銷毀
      if (this.chart && this.chart.ctx && !this.chart.ctx.canvas.hidden) {
        this.chart.destroy();
        this.chart = null;
      }
    
      this.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: weeks,
          datasets: [
            { label: '✅ Done', data: done, backgroundColor: '#34d399', stack: 'stack1' },
            { label: '🕒 On Going', data: ongoing, backgroundColor: '#60a5fa', stack: 'stack1' },
            { label: '⏳ Delay', data: overdue, backgroundColor: '#f87171', stack: 'stack2' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { 
            padding: { top: 30, bottom: 30, left: 50, right: 50 } 
          },
          interaction: { mode: 'index', intersect: false },
          scales: {
            y: { 
              stacked: true, 
              beginAtZero: true, 
              ticks: { precision: 0, stepSize: 1, color: '#f1f5f9', font: { weight: 'bold', size: 20 } }, 
              grid: { color: '#334155' }
            },
            x: { 
              stacked: true, 
              ticks: { color: '#f1f5f9', font: { weight: 'bold', size: 20 } }, 
              grid: { color: '#334155' }
            }
          },
          plugins: {
            legend: { 
              position: 'top', 
              labels: { color: '#f1f5f9', font: { weight: 'bold', size: 20 } } 
            },
            tooltip: { 
              callbacks: { label: (context) => `${context.dataset.label}: ${context.formattedValue}` } 
            },
            datalabels: {
              color: '#ffffff',
              font: { weight: 'bold', size: 24 },
              anchor: 'center',   
              align: 'center',
              formatter: (value) => value === 0 ? '' : value
            }
          }
        },
        plugins: [ChartDataLabels]
      });
    },


    async fetchWeeklyWorkDetail() {
      const res = await axios.get('http://127.0.0.1:5000/api/weekly_work_detail');
      const weeklyData = res.data;
    
      const weeks = weeklyData.map(item => item["週次"]);
      const newCases = weeklyData.map(item => item["新增案件數"]);
      const doneCases = weeklyData.map(item => item["完成案件數"]);
      const overdueCases = weeklyData.map(item => item["本週Due逾期數"]);
    
      await nextTick();
    
      const canvas = document.getElementById("weeklyWorkChart");
      if (!canvas) {
        console.warn("weeklyWorkChart canvas不存在，跳過繪製");
        return;
      }
      const ctx = canvas.getContext('2d');
    
    
      if (this.weeklyWorkChart && this.weeklyWorkChart.ctx && !this.weeklyWorkChart.ctx.canvas.hidden) {
        this.weeklyWorkChart.destroy();
        this.weeklyWorkChart = null;
      }
    
      this.weeklyWorkChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: weeks,
          datasets: [
            { label: '完成案件', data: doneCases, backgroundColor: '#34d399' },
            { label: '新增案件', data: newCases, backgroundColor: '#60a5fa' },
            { label: '本週Due逾期數', data: overdueCases, backgroundColor: '#f87171' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 30, bottom: 30, left: 50, right: 50 } },
          interaction: { mode: 'index', intersect: false },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0, stepSize: 1, color: '#f1f5f9', font: { weight: 'bold', size: 20 } },
              grid: { color: '#334155' }
            },
            x: {
              ticks: { color: '#f1f5f9', font: { weight: 'bold', size: 20 } },
              grid: { color: '#334155' }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: { color: '#f1f5f9', font: { weight: 'bold', size: 20 } }
            },
            tooltip: {
              callbacks: {
                label: (context) => `${context.dataset.label}: ${context.formattedValue}`
              }
            },
            datalabels: {
              color: '#ffffff',
              font: { weight: 'bold', size: 24 },
              anchor: 'center',
              align: 'center',
              formatter: (value) => value === 0 ? '' : value
            }
          }
        },
        plugins: [ChartDataLabels] 
      });
    },
  
  
    startLoadingTextAnimation() {
      const textEl = document.getElementById('loadingText');
      let dotCount = 0;
      this.loadingTextInterval = setInterval(() => {
        dotCount = (dotCount + 1) % 4;
        if (textEl) {
          textEl.textContent = '載入中' + '.'.repeat(dotCount);
        }
      }, 500);
    },

    stopLoadingTextAnimation() {
      clearInterval(this.loadingTextInterval);
      this.loadingTextInterval = null;
    },

    handleScroll() {
      if (!this.hintVisible) return;  // 如果hint已隱藏，就不處理scroll了
    
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
    
      if (scrollY + windowHeight >= documentHeight - 100) {
        this.scrollHint = "⏫ 回到上方";
      } else {
        this.scrollHint = "⏬ 下滑查看更多";
      }
    },

    scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    hideHint(){
      this.hintVisible = false;  // 把hint整個隱藏
      this.scrollHint = "";  // 把提示清空
    },


    toggleCard() {
      this.showCard = !this.showCard;
    },

    checkDelayData() {
      document.getElementById('loadingOverlay').classList.remove('hidden');
      this.startLoadingTextAnimation();
      setTimeout(() => {
        document.getElementById('app').classList.add('fade-out');
        setTimeout(() => {
          this.stopLoadingTextAnimation();
          localStorage.setItem('username', this.username);
          window.location.href = 'delay_detail/delaymsg.html';
        }, 1000);
      }, 1500);
    },

    goDetailPage() {
      document.getElementById('loadingOverlay').classList.remove('hidden');
      this.startLoadingTextAnimation();
      setTimeout(() => {
        document.getElementById('app').classList.add('fade-out');
        setTimeout(() => {
          this.stopLoadingTextAnimation();
          localStorage.setItem('username', this.username);
          window.location.href = 'proposals.html';
        }, 1000);
      }, 1500);
    }
  }
});

Chart.register(ChartDataLabels);
app.mount('#app');
