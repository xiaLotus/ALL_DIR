/**
 * 前端會話檢查器
 * 放置位置: static/js/session-checker.js
 * 
 * 功能：每30秒向後端檢查會話狀態，若過期則自動登出
 */

class SessionChecker {
  constructor() {
    this.checkInterval = 30 * 1000; // 30秒
    this.apiUrl = 'http://10.11.104.247:5001/api/check-session';
    this.loginPage = 'login.html';
    this.username = null;
    this.checkTimer = null;
    this.hasShownWarning = false;
    
    this.init();
  }
  
  init() {
    // 檢查是否在登入頁面
    if (window.location.pathname.includes('login.html')) {
      console.log('📄 登入頁面，不啟動會話檢查');
      return;
    }
    
    // 獲取用戶工號（用於 session 檢查）
    this.username = localStorage.getItem('username') || localStorage.getItem('工號');
    
    if (!this.username) {
      console.warn('⚠️  未找到用戶，不啟動會話檢查');
      return;
    }
    
    console.log('🔐 會話檢查器已啟動');
    console.log(`👤 用戶: ${this.username}`);
    
    // 立即檢查一次
    this.checkSession();
    
    // 開始定期檢查
    this.checkTimer = setInterval(() => this.checkSession(), this.checkInterval);
    
    // 頁面可見時立即檢查
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkSession();
      }
    });
  }
  
  async checkSession() {
    if (!this.username) return;
    
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: this.username })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        console.error('❌ 會話檢查失敗');
        return;
      }
      
      const { valid, expired, remaining_minutes, warning } = result;
      
      console.log(`⏳ 會話狀態: ${valid ? '有效' : '無效'}, 剩餘 ${remaining_minutes} 分鐘`);
      
      // 已過期，執行登出
      if (expired || !valid) {
        this.logout(result.message);
        return;
      }
      
      // 需要警告
      if (warning && !this.hasShownWarning) {
        this.showWarning(remaining_minutes);
      }
      
      // 重置警告標記
      if (!warning) {
        this.hasShownWarning = false;
      }
      
    } catch (error) {
      console.error('❌ 檢查會話時發生錯誤:', error);
    }
  }
  
  showWarning(minutes) {
    this.hasShownWarning = true;
    console.log(`⚠️  會話即將過期，剩餘 ${minutes} 分鐘`);
    
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'warning',
        title: '登入即將過期',
        html: `您的登入時間即將到期<br>系統將在 <strong>${minutes} 分鐘</strong>後自動登出`,
        confirmButtonText: '我知道了',
        confirmButtonColor: '#f59e0b',
        timer: 15050,
        timerProgressBar: true
      });
    } else {
      alert(`登入即將過期\n系統將在 ${minutes} 分鐘後自動登出`);
    }
  }
  
  async logout(reason = '會話已過期') {
    console.log(`🚪 執行登出: ${reason}`);
    
    // 停止檢查
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }
    
    // 通知後端
    try {
      await fetch('http://10.11.104.247:5001/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: this.username })
      });
    } catch (error) {
      console.error('通知後端失敗:', error);
    }
    
    // 清除本地資料
    localStorage.removeItem('username');
    localStorage.removeItem('姓名');
    localStorage.removeItem('role');
    localStorage.removeItem('工號');
    localStorage.removeItem('chataster');
    
    console.log('🗑️  已清除本地資料');
    
    // 顯示訊息並跳轉
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'info',
        title: '登入已過期',
        text: reason,
        confirmButtonText: '返回登入',
        confirmButtonColor: '#fb923c',
        allowOutsideClick: false
      }).then(() => {
        window.location.href = this.loginPage;
      });
    } else {
      alert(reason);
      window.location.href = this.loginPage;
    }
  }
}

// 自動初始化
let sessionChecker = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    sessionChecker = new SessionChecker();
    window.sessionChecker = sessionChecker;
  });
} else {
  sessionChecker = new SessionChecker();
  window.sessionChecker = sessionChecker;
}