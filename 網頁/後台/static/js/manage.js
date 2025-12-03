const app = Vue.createApp({
    data() {    
        return {
            username: '',
            backendData: [],
            editingIndex: null,
            // 新增區塊
            newEntry: { 
                工號: '', 
                姓名: '', 
                Notes_ID: '',
                後台管理: "X",
                EAP健康度後台: 'X',
                新增議題後台: 'X',
                請購網頁後台: "X",
                ASEGO派報網頁後台: "X",
                早報派報網頁後台: "X"
            },
            // 修正區塊
            editEntry: { 
                工號: '', 
                姓名: '', 
                Notes_ID: '',
                後台管理: "X",
                第一階主管: "X",
                EAP健康度後台: '',
                新增議題後台: '',
                請購網頁後台: "",
                ASEGO派報網頁後台: "",
                早報派報網頁後台: ""
            },
            searchKeyword: '',
        };
    },

    computed:{
        filteredData(){
            const keySearch = this.searchKeyword.trim().toLowerCase();
            if(!keySearch) return this.backendData

            return this.backendData.filter(item => {
                return (
                    item.工號?.toLowerCase().includes(keySearch) ||
                    item.姓名?.includes(keySearch) ||
                    item.Notes_ID?.toLowerCase().includes(keySearch)
                )
            })
        },
    },

    watch: {
        editingIndex(newVal) {
            if (newVal !== null) {
                document.body.classList.add("overflow-hidden");
            } else {
                document.body.classList.remove("overflow-hidden");
            }
        }
    },

    async mounted() {
        document.body.classList.remove('overflow-hidden');
        const username = localStorage.getItem('username');
        const loginTime = localStorage.getItem('login_time');

        if (!username || !loginTime) {
            alert("請先登入");
            window.location.href = "login.html";
            return;
        }

        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        if (now - parseInt(loginTime) > oneHour) {
            alert("登入已過期，請重新登入");
            localStorage.removeItem("username");
            localStorage.removeItem("login_time");
            window.location.href = "../index.html";
            return;
        }
        await this.getAllData();
    },

    methods: {
        async getAllData() {
            fetch("http://127.0.0.1:5000/api/data")
                .then(res => res.json())
                .then(data => {
                    console.log("取得資料：", data);
                    this.backendData = data;  
                })
                .catch(err => {
                    console.error("❌ 資料取得失敗：", err);
                });
        },


        showDetail(item) {
            const idx = this.backendData.findIndex(data => data.工號 === item.工號);
            this.editingIndex = idx;
            this.editEntry = { ...item };
        },

        cancelEdit() {
            this.editingIndex = null;
            this.editEntry = { 
                工號: '', 
                姓名: '', 
                Notes_ID: '',
                第一階主管: '',
                後台管理: "",
                EAP健康度後台: '',
                新增議題後台: '',
                請購網頁後台: "",
                ASEGO派報網頁後台: "",
                早報派報網頁後台: ""
            }
        },

        addEntry(){
            const workNumberPattern = /^[A-Za-z]*\d{4,5}$/.test(this.newEntry.工號);
            const namePattern = /^[\u4e00-\u9fa5]+$/.test(this.newEntry.姓名);
            const NotesIDPattern = /^[A-Za-z_]+$/.test(this.newEntry.Notes_ID);

            if (!workNumberPattern) {
                alert("工號格式錯誤，必須是純數字或英文字開頭 + 結尾 4~5 位數字");
                return;
            }
            
            if (!namePattern) {
                alert("名字必須全中文");
                return;
            }

            if (!NotesIDPattern) {
                alert("Notes ID 只能是英文且中間具備下底線");
                return;
            }

            if (!this.newEntry.工號 || !this.newEntry.姓名 || !this.newEntry.Notes_ID) {
                alert("請填寫完整資料");
                return;
            }

            const duplicate = this.backendData.some(item =>
                item.工號 === this.newEntry.工號 ||
                item.姓名 === this.newEntry.姓名 ||
                item.Notes_ID === `${this.newEntry.Notes_ID}@aseglobal.com`
            );

            if (duplicate) {
                alert("已有相同的工號、姓名或 Notes ID，請確認資料是否重複");
                return;
            }


            fetch(`http://127.0.0.1:5000/api/add_data/${this.newEntry.工號}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(this.newEntry)
            })
            .then(res => {
                if (!res.ok) throw new Error("新增失敗");
                return res.json();
            })
            .then(res => {
                this.backendData.push({ ...this.newEntry }); 

                this.newEntry = {
                    工號: '',
                    姓名: '',
                    Notes_ID: '',
                    第一階主管: '',
                    後台管理: "X",
                    EAP健康度後台: 'X',
                    新增議題後台: 'X',
                    請購網頁後台: "X",
                    ASEGO派報網頁後台: "X",
                    早報派報網頁後台: "X"
                };
            })
            .catch(err => {
                console.error("❌ 新增失敗：", err);
                alert("新增失敗，請稍後再試");
            });
        },

        saveEdit() {
            if (this.editingIndex !== null) {
                const updatedEntry = { ...this.editEntry };
                const currentUser = localStorage.getItem('username'); 
                console.log("currentUser: ", currentUser)

                const permissionFields = [
                    '後台管理',
                    'EAP健康度後台',
                    '新增議題後台',
                    '請購網頁後台',
                    'ASEGO派報網頁後台',
                    '早報派報網頁後台'
                ];

                const normalize = str => String(str || '').trim().toLowerCase();
                const selfRecord = this.backendData.find(item => normalize(item.工號) === normalize(currentUser));

                if (!selfRecord) {
                    alert("⚠️ 找不到登入者的資料紀錄，請重新登入");
                    return;
                }

                console.log("🔐 登入者工號：", currentUser);
                console.log("📝 編輯卡片工號：", updatedEntry.工號);

                const isEditingSelf = normalize(updatedEntry.工號) === normalize(currentUser);

                if (isEditingSelf) {
                    alert(`⚠️ 無法更新自己的權限`);
                    this.cancelEdit();
                    return;
                }

                // ✅ 編輯別人：檢查「要設為 O 的欄位」是否自己也有 O
                const violatedFields = permissionFields.filter(key => {
                    return updatedEntry[key] === 'O' && selfRecord[key] !== 'O';
                });

                if (violatedFields.length > 0) {
                    alert(`⚠️ 你沒有權限將下列欄位設為 O：\n${violatedFields.join(', ')}`);
                    this.cancelEdit();
                    return;
                }


                fetch(`http://127.0.0.1:5000/api/data/${updatedEntry.工號}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(updatedEntry)
                })
                .then(res => {
                    if (!res.ok) throw new Error("儲存失敗");
                    // 更新前端顯示
                    this.backendData.splice(this.editingIndex, 1, updatedEntry);
                    this.cancelEdit();
                })
                .catch(err => {
                    console.error("❌ 更新失敗：", err);
                    alert("更新失敗，請稍後再試");
                });
            }
        },
         
        deleteBackendItem(index) {
            // this.backendData.splice(index, 1);
            alert(`⚠️ 你眼睛業障重？不准刪`);
        },
    }
});
        
app.mount('#app');