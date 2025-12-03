const app = Vue.createApp({
  data() {
    return {
      tasks: [],
      newTaskTitle: "",
      selectedTaskIndex: null,
      popupImage: null,
      showWelcome: true,
      welcomeText: "",
      username: localStorage.getItem("username"),
    };
  },
    async mounted() {
    if (!this.username) {
      window.location.href = "login.html";
      return;
    }

    const message = `Hi 👋 ${this.username}，今日想要更新什麼進度？`;
    await this.typeText(message);
    await new Promise(r => setTimeout(r, 1000));
    this.showWelcome = false;

    try {
      const res = await axios.get(`http://127.0.0.1:5000/api/load/${this.username}`);
      this.tasks = res.data || [];
    } catch (err) {
      console.error("❌ 資料載入失敗", err);
    }

    document.addEventListener("click", this.globalImageClickHandler);
  },

    unmounted() {
        document.removeEventListener("click", this.globalImageClickHandler);
    },

      computed: {
    currentTask() {
      return this.selectedTaskIndex !== null ? this.tasks[this.selectedTaskIndex] : null;
    },
    timelineOrdered() {
      return this.currentTask ? [...this.currentTask.timeline].reverse() : [];
    },
      reversedTasks() {
        return [...this.tasks].reverse(); // 保持原 tasks 不動
      }
  },

  methods: {
    async typeText(msg) {
      for (let i = 0; i <= msg.length; i++) {
        this.welcomeText = msg.slice(0, i);
        await new Promise(r => setTimeout(r, 40));
      }
    },

    addTask() {
      if (!this.newTaskTitle.trim()) return;
      this.tasks.push({
        id: "task-" + Date.now(),
        title: this.newTaskTitle.trim(),
        timeline: []
      });
      this.newTaskTitle = "";
      this.saveToBackend();
    },

    selectTask(index) {
      this.selectedTaskIndex = index;
    },

    async submitComment() {
      const editor = document.getElementById("editor");
      const html = editor.innerHTML.trim();
      if (!html || this.selectedTaskIndex === null) return;

      this.currentTask.timeline.push({
        html,
        rawHtml: html,
        timestamp: new Date().toLocaleString("zh-TW", {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit'
        }),
        isEditing: false,
        editRef: null
      });

      editor.innerHTML = "";
      await this.saveToBackend();
    },

    handlePaste(e) {
      const items = e.clipboardData.items;
      for (let item of items) {
        if (item.type.includes("image")) {
          e.preventDefault();
          const file = item.getAsFile();
          const reader = new FileReader();
          reader.onload = () => {
            const img = document.createElement("img");
            img.src = reader.result;
            img.className = "thumbnail";
            img.setAttribute("data-popup", "true");
            this.insertImageAtCursor(img);
          };
          reader.readAsDataURL(file);
        }
      }
    },

    insertImageAtCursor(img) {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img);
      range.setEndAfter(img);
      sel.removeAllRanges();
      sel.addRange(range);
    },

    handleImageClick(e) {
      if (e.target.matches("img[data-popup]")) {
        this.popupImage = e.target.src;
      }
    },

    async saveEntry(entry) {
      const html = entry.editRef?.innerHTML || "";
      entry.rawHtml = html;
      entry.html = html;
      entry.isEditing = false;
      await this.saveToBackend();
    },

    insertLineBreak(e) {
      e.preventDefault();
      document.execCommand('insertHTML', false, '<br><br>');
    },

    async deleteEntry(entry) {
      const index = this.currentTask.timeline.indexOf(entry);
      if (index !== -1) {
        this.currentTask.timeline.splice(index, 1);
        await this.saveToBackend();
      }
    },

    async saveToBackend() {
      if (!this.username) return alert("未登入");
      try {
        await axios.post(`http://127.0.0.1:5000/api/save/${this.username}`, this.tasks);
        console.log("✅ 資料已儲存！");
      } catch (err) {
        console.error("❌ 儲存失敗", err);
      }
    },

    globalImageClickHandler(e) {
      if (e.target.matches("img[data-popup]")) {
        this.popupImage = e.target.src;
      }
    },
      syncReversedToTasks(event) {
        // reversedTasks 拖完後會變 → 把它 reverse 回寫入 tasks
        this.tasks = [...this.reversedTasks].reverse();
        this.saveToBackend();
    }
  },

  async mounted() {
    if (!this.username) {
      window.location.href = "login.html";
      return;
    }

    const message = `Hi 👋 ${this.username}，今日想要更新什麼進度？`;
    await this.typeText(message);
    await new Promise(r => setTimeout(r, 1000));
    this.showWelcome = false;

    try {
      const res = await axios.get(`http://127.0.0.1:5000/api/load/${this.username}`);
      this.tasks = res.data || [];
    } catch (err) {
      console.error("❌ 資料載入失敗", err);
    }

    document.addEventListener("click", this.globalImageClickHandler);
  },



});

app.use(ElementPlus);
app.component('draggable', window.vuedraggable);
app.mount("#app");