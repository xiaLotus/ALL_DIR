const app = Vue.createApp({

    data() {
        return {
            username: '',
            password: '',
            errorMessage: ''
        };
    },

    methods: {
        async login() {
            this.errorMessage = '';

            if (!this.username || !this.password) {
                this.errorMessage = '請輸入帳號與密碼';
                return;
            }

            try {

                const response = await axios.post('http://127.0.0.1:5000/api/login', {
                    username: this.username,
                    password: this.password
                });

                if (response.data && response.data.success) {
                    localStorage.setItem('username', this.username);
                    localStorage.setItem('login_time', Date.now());  

                    this.$refs.loginCard.classList.add('fade-out');

                    setTimeout(() => {
                        window.location.href = 'frontend/manage.html';
                    }, 800);
                } else {
                    this.errorMessage = response.data.message || '登入失敗';
                }
            } catch (err) {
                console.error('登入錯誤:', err);
                this.errorMessage = '伺服器錯誤，請稍後再試';
            }
        }
    }
})
app.mount('#app');