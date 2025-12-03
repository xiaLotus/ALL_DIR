// login.js
Vue.createApp({
  data() {
    return {
      username: '',
      loginError: false
    };
  },
  methods: {
    login() {
      if (this.username.trim()) {
        localStorage.setItem('username', this.username);
        window.location.href = 'portfolio.html';  
      } else {
        this.loginError = true;
      }
    }
  }
}).mount('#app');
