/**
 * 登入頁面邏輯
 * 放置位置: static/js/login.js
 */

const app = Vue.createApp({
  data() {
    return {
      username: "",
      password: "",
      showPassword: false,
      errorMsg: "",
      isLoading: false,
      currentYear: new Date().getFullYear(),
    };
  },

  methods: {
    togglePassword() {
      this.showPassword = !this.showPassword;
      this.$nextTick(() => {
        if (typeof lucide !== "undefined") lucide.createIcons();
      });
    },

    async login() {
      this.errorMsg = "";

      if (!this.username || !this.password) {
        this.errorMsg = "請輸入帳號與密碼";
        return;
      }

      this.isLoading = true;

      try {
        const res = await fetch("http://10.11.104.247:5001/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: this.username,
            password: this.password,
            loginpage: 'loginpage',
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          // 儲存用戶資訊
          localStorage.setItem("username", this.username);
          localStorage.setItem("role", data.chataster || data.role || "使用者");
          localStorage.setItem("工號", data.工號 || "");
          localStorage.setItem("姓名", data.姓名 || "");

          // ✅ 記錄會話資訊（用於調試）
          if (data.session) {
            console.log("✅ 登入成功");
            console.log("⏱️  登入時間:", data.session.login_time);
            console.log("⏰ 過期時間:", data.session.expire_time);
            console.log(`⌛ 時限: ${data.session.timeout_minutes} 分鐘`);
          }

          // 跳轉到主頁
          const encodedUser = encodeURIComponent(this.username);
          window.location.href = `http://10.11.104.247:5002/dashboard?user=${encodedUser}`;
        } else {
          // 登入失敗
          this.errorMsg = data.message || "登入失敗，請確認帳密";
          this.isLoading = false;
          console.error("❌ 登入失敗:", this.errorMsg);
        }
      } catch (err) {
        // 網路錯誤或其他異常
        this.errorMsg = "伺服器連線錯誤，請稍後再試";
        this.isLoading = false;
        console.error("❌ 連線錯誤:", err);
      }
    },
  },

  mounted() {
    if (typeof lucide !== "undefined") lucide.createIcons();
  },

  updated() {
    if (typeof lucide !== "undefined") lucide.createIcons();
  },
});

app.mount("#app");
