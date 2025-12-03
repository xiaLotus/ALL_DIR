const { createApp } = Vue;

const app = Vue.createApp({
  data() {
    return {
      delayList: [],
      isLoading: true,  // 一開始loading
      isFadeIn: false,
      searchKeyword: '',
      jumpInterval: null, // ⬅️ 新增用來記錄打點動畫的interval
      username: '',
    }
  },
  computed: {
    filteredList() {
      if (!this.searchKeyword.trim()) {
        return this.delayList
      }
      const keyword = this.searchKeyword.trim().toLowerCase()
      return this.delayList.filter(item =>
        (item["問題描述"] && item["問題描述"].toLowerCase().includes(keyword)) ||
        (item["總表項次"] && item["總表項次"].toLowerCase().includes(keyword))
      )
    },
  },
  methods: {

    async loadDelayData() {
      try {
        const res = await axios.get('http://127.0.0.1:5000/api/delay-details')
        let rawData = Array.isArray(res.data) ? res.data : Object.values(res.data)
        this.delayList = rawData.map(item => ({...item}))
      } catch (err) {
        console.error('讀取延遲資料失敗', err)
      } finally {
        setTimeout(() => {
          this.isLoading = false
          this.isFadeIn = true
        }, 2000)
      }
    },

    startDotAnimation(targetId = 'dotAnimation') {
      const dotElement = document.getElementById(targetId)
      if (!dotElement) return
    
      let count = 0
      this.jumpInterval = setInterval(() => {
        count = (count + 1) % 4 // 0,1,2,3
        dotElement.textContent = '.'.repeat(count)
      }, 500)
    },

    viewDetails(item){
      console.log("查看細項：", item);

      localStorage.setItem('username', this.username);
      localStorage.setItem('editingRowData', JSON.stringify(item));

      const appElement = document.getElementById('app');
      const loadingOverlay = document.getElementById('loadingOverlay');
    
      if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
        this.startDotAnimation('jumpDotAnimation');  
      }
    
      if (appElement) {
        appElement.classList.add('fade-out');
      }
    
      setTimeout(() => {
        clearInterval(this.jumpInterval);
        window.location.href = '../supervisor_node.html';
      }, 2000);

    },

    back_datapage() {
      const appElement = document.getElementById('app');
      const loadingOverlay = document.getElementById('loadingOverlay');
    
      if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
        this.startDotAnimation('jumpDotAnimation');  
      }
    
      if (appElement) {
        appElement.classList.add('fade-out');
      }
    
      setTimeout(() => {
        clearInterval(this.jumpInterval);
        window.location.href = '../DataPage.html';
      }, 2000);
    },

    goAnotherPage(){
      const appElement = document.getElementById('app');
      const loadingOverlay = document.getElementById('loadingOverlay');
    
      if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
        this.startDotAnimation('jumpDotAnimation');  
      }
    
      if (appElement) {
        appElement.classList.add('fade-out');
      }
    
      setTimeout(() => {
        clearInterval(this.jumpInterval);
        window.location.href = '../proposals.html';
      }, 2000);
    },
    

    calculateDaysDiff(dueStr) {
      if (!dueStr) return '';
      const today = new Date();
      const dueDate = new Date(
        dueStr.slice(0, 4),
        parseInt(dueStr.slice(4, 6)) - 1,
        dueStr.slice(6, 8)
      );
      const diffTime = today - dueDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    },

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

    this.isLoading = true
    this.startDotAnimation('dotAnimation');  // 加載中用 dotAnimation
  
    await Promise.all([
      this.loadDelayData(),
      new Promise(resolve => setTimeout(resolve, 2000))
    ])
  
    this.isLoading = false
    this.isFadeIn = true
    clearInterval(this.jumpInterval); // 停掉打點
  },
})

app.mount('#app')
