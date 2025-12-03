const { createApp } = Vue;

createApp({
  data() {
    return {
      sites: [
        { name: 'EAP健康度監控', url: 'http://10.11.99.84:8080/', frontendPort: 8080, backendPort: 8081, firewall: '是' },
        { name: '專案管控', url: 'http://10.11.99.84:8086/', frontendPort: 8085, backendPort: 8081, firewall: '是' },
        { name: '電視牆樹梅派', url: '*:8088:(ftp)', frontendPort: 8088, backendPort: 8088, firewall: '是' },
        { name: '預計請購', url: 'http://10.11.99.84:8090/', frontendPort: 8090, backendPort: 8091, firewall: '是' },
        { name: 'ADAM-6050表單', url: 'http://10.11.99.84:8092/', frontendPort: 8092, backendPort: 8093, firewall: '是' },
        { name: '個人工作進度', url: 'http://10.11.99.84:8094/', frontendPort: 8094, backendPort: 8095, firewall: '是' },
        { name: '報案系統看版', url: 'http://10.11.99.84:8096/', frontendPort: 8096, backendPort: 8099, firewall: '是' },
        { name: '後端水位_Alarm_Message API', url: 'http://10.11.99.84:8098/', frontendPort: 8098, backendPort: 8097, firewall: '是' },
        { name: '報案系統看版', url: 'http://10.11.99.84:8100/', frontendPort: 8100, backendPort: 8101, firewall: '是' },
        { name: '後端三色燈監控 API', url: 'http://10.11.99.84:8106/', frontendPort: 8106, backendPort: '*', firewall: '是' },
        { name: '後端三色燈模擬監控', url: 'http://10.11.99.84:8108/', frontendPort: 8108, backendPort: 8105, firewall: '是' },
        { name: '每日派報總表', url: 'http://10.11.99.84:8114/', frontendPort: 8114, backendPort: 8113, firewall: '是' },
        { name: '困難點會議報表', url: 'http://10.11.99.84:8116/', frontendPort: 8116, backendPort: 8115, firewall: '是' },
        { name: '網站 Port 管控清單', url: 'http://10.11.99.84:8118/', frontendPort: 8118, backendPort: '*', firewall: '是' },
      ],
      currentPage: 1,
      itemsPerPage: 10,
    };
  },
  computed: {
    pagedData() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      return this.sites.slice(start, start + this.itemsPerPage);
    },
    totalPages() {
      return Math.ceil(this.sites.length / this.itemsPerPage);
    }
  },
  methods: {
    addRow() {
      this.sites.push({
        name: '',
        url: '',
        frontendPort: '',
        backendPort: '',
        firewall: '否'
      });
      this.currentPage = this.totalPages; // 新增後跳到最後一頁
    },
    removeRow(indexOnPage) {
      const globalIndex = (this.currentPage - 1) * this.itemsPerPage + indexOnPage;
      this.sites.splice(globalIndex, 1);
      if (this.currentPage > this.totalPages) {
        this.currentPage = this.totalPages || 1;
      }
    },
    saveChanges() {
      console.log('儲存內容：', this.sites);
      alert('資料無法更新，感謝');
    },
    prevPage() {
        if (this.currentPage > 1) {
        this.currentPage--;
        }
    },
    nextPage() {
        if (this.currentPage < this.totalPages) {
        this.currentPage++;
        }
    }
    }
}).mount('#app');
