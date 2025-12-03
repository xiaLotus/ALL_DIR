const app = Vue.createApp({
  data() {
    return {
      username: "",
      password: "",
      loginError: false
    };
  },

  methods: {
    async login() {
      if (!this.username.trim()) {
        this.loginError = true;
        return;
      }

      try {
        await axios.post("http://127.0.0.1:5000/api/login", {
          username: this.username.trim(),
          password: this.password.trim()
        });
        localStorage.setItem("username", this.username.trim());
        window.location.href = "frontend/workline.html";
      } catch (err) {
        this.loginError = true;
      }
    }
  },

  mounted() {
    // 可選：自動 focus 或清除 username
    // this.username = "";
  }
});

app.mount("#app");