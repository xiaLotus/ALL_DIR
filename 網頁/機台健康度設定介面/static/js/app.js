const app = Vue.createApp({
    data() {
      return {
        buildingList: [],
        floorList: {},
        expanded: {},
        selectedBuilding: "",
        selectedFloor: "",
        getallList: [],
        machineList: [],
        form: {
          Plant: "ASEF1",
          Site: "",
          SiteBuilding: "",  // 新增
          SiteFloor: "",     // 新增
          IP: "",
          MachineID: "",
          DI_Map: {
            "RED": '',
            "YELLOW": '',
            "GREEN": '',
            "BLUE": ''
          },
          Port: 502
        }
      };
    },
  
    async mounted() {
      await this.get_load_data();
      await this.load_all_data();
    },
  
    methods: {
      async get_load_data() {
        try {
          const res = await fetch("http://127.0.0.1:5000/api/machine-configs");
          const json = await res.json();
          this.buildingList = Object.keys(json);
          this.floorList = json;
          console.log("✅ 從後端取得資料：", json);
        } catch (err) {
          console.error("❌ 無法取得資料:", err);
        }
      },
  
      async load_all_data() {
        try {
          const res = await fetch("http://127.0.0.1:5000/api/load_all_data");
          const json = await res.json();
          this.machineList = json;
          this.getallList = json
          console.log("✅ 從 all.json 載入成功：", json);
        } catch (err) {
          console.error("❌ 載入 all.json 失敗:", err);
        }
      },

      async get_building_floor_data(building, floor){
        try {
            const res = await fetch(`http://127.0.0.1:5000/api/${building}/${floor}`);
            const json = await res.json();
            this.machineList = json;
            console.log("✅ 從 all.json 載入成功：", json);
          } catch (err) {
            console.error("❌ 載入 all.json 失敗:", err);
          }
      },

      async getfirsttable(){
        await this.load_all_data()
      },

  
      toggle(building) {
        const isOpen = this.expanded[building];
        Object.keys(this.expanded).forEach(key => (this.expanded[key] = false));
        if (!isOpen) this.expanded[building] = true;
      },
  
    async select(building, floor) {
        this.selectedBuilding = building;
        this.selectedFloor = floor;
        this.form.Site = `${building}-${floor}`;
        this.machineList = [];
        if (['K11', 'K25'].includes(building)) {
            this.form.Plant = "ASEF3";
        } else {
            this.form.Plant = "ASEF1";
        }
        await this.get_building_floor_data(building, floor)
    },
  
    clearForm() {
        // this.form.IP = "";
        // this.form.MachineID = "";
        this.form = {
          Plant: "ASEF1",
          Site: "",
          SiteBuilding: "",  // 新增
          SiteFloor: "",     // 新增
          IP: "",
          MachineID: "",
          DI_Map: {
            "RED": '',
            "YELLOW": '',
            "GREEN": '',
            "BLUE": ''
          },
          Port: 502
        }
    },
  
    async addMachine() {
        const today = new Date().toISOString().split("T")[0];

        let site = this.form.Site || `${this.form.SiteBuilding || ""}-${this.form.SiteFloor || ""}`;

        // 🔒 驗證格式：SiteBuilding 英文開頭，SiteFloor F開頭
        const validBuilding = /^[A-Za-z]/.test(this.form.SiteBuilding);
        const validFloor = /^\d+F$/.test(this.form.SiteFloor);
      
        if (!validBuilding || !validFloor) {
          alert("⚠️ 格式錯誤：棟別請以英文字母開頭，樓層請以 F 開頭");
          this.form.SiteBuilding = "";
          this.form.SiteFloor = "";
          this.form.IP = "";
          this.form.MachineID = "";
          return;
        }

        // 清除空的 DI 值
        Object.keys(this.form.DI_Map).forEach(key => {
          const val = this.form.DI_Map[key];
          if (val === null || val === '' || isNaN(val)) {
            delete this.form.DI_Map[key];
          } else {
            this.form.DI_Map[key] = Number(val); // 保證是數字
          }
        });

        const validDI = Object.values(this.form.DI_Map).every(v => Number.isInteger(v) && v >= 0 && v <= 11);
        if (!validDI) {
          alert("⚠️ DI Map 欄位請填入 0~11 的整數");
          return;
        }

        const payload = {
          TIME: today,
          Plant: this.form.Plant,
          Site: site,
          IP: this.form.IP,
          MachineID: this.form.MachineID,
          Port: this.form.Port,
          DI_Map: this.form.DI_Map
        };
  
        console.log("新增資料：", payload);
  
        fetch("http://127.0.0.1:5000/api/add-machine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
        .then(res => {
          if (!res.ok) throw new Error("新增失敗");
          return res.json();
        })
        .then(async data => {
          console.log("✅ 新增成功：", data);
          this.machineList.push(payload);
          await this.get_load_data(); // ← 加這一行讓側邊欄更新
          this.clearForm();
        })
        .catch(err => {
            onsole.error("❌ 發送失敗：", err);
        });
      }
    }
  });
  
  app.mount("#app");
  