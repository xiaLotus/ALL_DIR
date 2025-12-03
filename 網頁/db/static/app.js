const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            loading: true,
            darkMode: false,
            data: [],
            expandedDbs: {},
            selectedTables: {},
            sortConfig: {},
            charts: {},
            chartRetries: {},
            searchQuery: ''
        };
    },
    computed: {
        groupedData() {
            return this.data.reduce((acc, row) => {
                if (!acc[row.Database_Name]) {
                    acc[row.Database_Name] = [];
                }
                acc[row.Database_Name].push(row);
                return acc;
            }, {});
        },
        dbTotals() {
            return Object.keys(this.groupedData).map(dbName => ({
                name: dbName,
                total: this.groupedData[dbName].reduce((sum, table) => sum + table.Total_MB, 0),
                tableCount: this.groupedData[dbName].length
            })).sort((a, b) => b.total - a.total);
        },
        filteredDbTotals() {
            if (!this.searchQuery.trim()) {
                return this.dbTotals;
            }
            
            const query = this.searchQuery.toLowerCase();
            return this.dbTotals.filter(db => {
                if (db.name.toLowerCase().includes(query)) {
                    return true;
                }
                
                const tables = this.groupedData[db.name];
                return tables.some(table => 
                    table.Table_Name.toLowerCase().includes(query)
                );
            });
        },
        totalSize() {
            return this.data.reduce((sum, row) => sum + row.Total_MB, 0);
        }
    },
    methods: {
        async loadData() {
            try {
                const response = await fetch('http://127.0.0.1:5000/api/database-data');
                const result = await response.json();
                
                if (result.success) {
                    this.data = result.data;
                    await this.$nextTick();
                    setTimeout(() => {
                        this.loadMemoryState();
                    }, 100);
                } else {
                    console.error('載入失敗:', result.message);
                }
                
                this.loading = false;
            } catch (error) {
                console.error('載入資料失敗:', error);
                this.loading = false;
                alert('無法連接到伺服器，請確認 Flask 已啟動在 http://127.0.0.1:5000');
            }
        },
        
        highlightText(text) {
            if (!this.searchQuery.trim()) {
                return text;
            }
            
            const query = this.searchQuery;
            const regex = new RegExp(`(${query})`, 'gi');
            return text.replace(regex, '<span class="search-highlight font-bold">$1</span>');
        },
        
        getFilteredTableCount(dbName) {
            if (!this.searchQuery.trim()) {
                return this.groupedData[dbName].length;
            }
            
            const query = this.searchQuery.toLowerCase();
            const tables = this.groupedData[dbName];
            return tables.filter(table => 
                table.Table_Name.toLowerCase().includes(query)
            ).length;
        },
        
        getTotalTableCount() {
            if (!this.searchQuery.trim()) {
                return this.data.length;
            }
            
            return this.filteredDbTotals.reduce((sum, db) => {
                return sum + this.getFilteredTableCount(db.name);
            }, 0);
        },
        
        getFilteredAndSortedTables(dbName) {
            let tables = this.getSortedTables(dbName);
            
            if (!this.searchQuery.trim()) {
                return tables;
            }
            
            const query = this.searchQuery.toLowerCase();
            return tables.filter(table => 
                table.Table_Name.toLowerCase().includes(query)
            );
        },
        
        toggleDarkMode() {
            this.darkMode = !this.darkMode;
            localStorage.setItem('darkMode', this.darkMode);
            
            this.$nextTick(() => {
                Object.keys(this.charts).forEach(key => {
                    if (this.charts[key]) {
                        try {
                            this.updateChartColors(key);
                        } catch (e) {
                            console.warn('更新圖表顏色失敗:', key, e);
                        }
                    }
                });
            });
        },
        
        loadDarkMode() {
            const saved = localStorage.getItem('darkMode');
            if (saved !== null) {
                this.darkMode = saved === 'true';
            }
        },
        
        loadMemoryState() {
            const savedDbs = localStorage.getItem('expandedDbs');
            if (savedDbs) {
                try {
                    this.expandedDbs = JSON.parse(savedDbs);
                } catch (e) {
                    console.error('載入資料庫記憶失敗:', e);
                    this.expandedDbs = {};
                }
            }
            
            const savedTables = localStorage.getItem('selectedTables');
            if (savedTables) {
                try {
                    this.selectedTables = JSON.parse(savedTables);
                    this.$nextTick(() => {
                        setTimeout(() => {
                            this.createAllSavedCharts();
                        }, 300);
                    });
                } catch (e) {
                    console.error('載入資料表記憶失敗:', e);
                    this.selectedTables = {};
                }
            }
        },
        
        // 🔧 修改：按順序創建圖表，避免同時創建
        async createAllSavedCharts() {
            const chartList = [];
            
            // 收集所有需要創建的圖表
            Object.keys(this.selectedTables).forEach(dbName => {
                Object.keys(this.selectedTables[dbName]).forEach(tableName => {
                    if (this.selectedTables[dbName][tableName]) {
                        chartList.push({ dbName, tableName });
                    }
                });
            });
            
            console.log(`📊 準備創建 ${chartList.length} 個圖表...`);
            
            // 按順序創建圖表，每個間隔 300ms
            for (let i = 0; i < chartList.length; i++) {
                const { dbName, tableName } = chartList[i];
                console.log(`📈 (${i + 1}/${chartList.length}) 創建圖表: ${dbName}.${tableName}`);
                
                await new Promise(resolve => {
                    setTimeout(() => {
                        this.createChartWithRetry(dbName, tableName, 0);
                        resolve();
                    }, i * 300); // 每個圖表延遲 300ms
                });
            }
        },
        
        saveMemoryState() {
            try {
                localStorage.setItem('expandedDbs', JSON.stringify(this.expandedDbs));
                localStorage.setItem('selectedTables', JSON.stringify(this.selectedTables));
            } catch (e) {
                console.error('儲存記憶狀態失敗:', e);
            }
        },
        
        resetMemory() {
            if (confirm('確定要清除所有記憶狀態嗎？（光暗模式設定會保留）')) {
                // 先銷毀所有圖表
                this.destroyAllCharts();
                
                // 清除狀態
                this.expandedDbs = {};
                this.selectedTables = {};
                this.chartRetries = {};
                
                // 清除 localStorage
                localStorage.removeItem('expandedDbs');
                localStorage.removeItem('selectedTables');
                
                console.log('✅ 記憶狀態已重置');
            }
        },
        
        // 🆕 銷毀所有圖表的統一方法
        destroyAllCharts() {
            console.log('🗑️ 開始銷毀所有圖表...');
            
            Object.keys(this.charts).forEach(key => {
                this.destroyChart(key);
            });
            
            this.charts = {};
            console.log('✅ 所有圖表已銷毀');
        },
        
        // 🆕 安全銷毀單個圖表
        destroyChart(chartKey) {
            const chart = this.charts[chartKey];
            if (!chart) return;
            
            try {
                // 先停止動畫
                if (typeof chart.stop === 'function') {
                    chart.stop();
                }
                
                // 等待一個動畫幀後銷毀
                requestAnimationFrame(() => {
                    try {
                        chart.destroy();
                        console.log(`🗑️ 已銷毀圖表: ${chartKey}`);
                    } catch (e) {
                        console.warn('銷毀圖表時發生錯誤:', chartKey, e);
                    }
                });
                
                delete this.charts[chartKey];
            } catch (e) {
                console.warn('停止圖表動畫失敗:', chartKey, e);
            }
        },
        
        toggleDb(dbName) {
            this.expandedDbs[dbName] = !this.expandedDbs[dbName];
            this.saveMemoryState();
            
            if (!this.expandedDbs[dbName]) {
                // 收合時銷毀該資料庫的所有圖表
                if (this.selectedTables[dbName]) {
                    Object.keys(this.selectedTables[dbName]).forEach(tableName => {
                        const chartKey = `${dbName}-${tableName}`;
                        this.destroyChart(chartKey);
                    });
                }
            }
        },
        
        toggleTable(dbName, tableName) {
            if (!this.selectedTables[dbName]) {
                this.selectedTables[dbName] = {};
            }
            
            const isSelected = this.selectedTables[dbName][tableName];
            this.selectedTables[dbName][tableName] = !isSelected;
            
            this.saveMemoryState();
            
            const chartKey = `${dbName}-${tableName}`;
            if (this.selectedTables[dbName][tableName]) {
                // 選中時創建圖表
                this.$nextTick(() => {
                    setTimeout(() => {
                        this.createChartWithRetry(dbName, tableName, 0);
                    }, 100);
                });
            } else {
                // 取消選中時銷毀圖表
                this.destroyChart(chartKey);
            }
        },
        
        isTableSelected(dbName, tableName) {
            return this.selectedTables[dbName] && this.selectedTables[dbName][tableName];
        },
        
        sortTable(dbName, column) {
            // 排序前關閉所有圖表
            this.closeAllChartsInDatabase(dbName);
            
            if (!this.sortConfig[dbName]) {
                this.sortConfig[dbName] = { column: null, order: 'asc' };
            }
            
            const config = this.sortConfig[dbName];
            
            if (config.column === column) {
                config.order = config.order === 'asc' ? 'desc' : 'asc';
            } else {
                config.column = column;
                config.order = 'desc';
            }
        },
        
        // 🔧 修改：使用新的銷毀方法
        closeAllChartsInDatabase(dbName) {
            if (!this.selectedTables[dbName]) {
                return;
            }
            
            console.log(`🔄 關閉 ${dbName} 的所有圖表...`);
            
            // 銷毀所有圖表
            Object.keys(this.selectedTables[dbName]).forEach(tableName => {
                if (this.selectedTables[dbName][tableName]) {
                    const chartKey = `${dbName}-${tableName}`;
                    this.destroyChart(chartKey);
                }
            });
            
            // 清除選中狀態
            this.selectedTables[dbName] = {};
            
            // 保存記憶狀態
            this.saveMemoryState();
        },
        
        getSortIcon(dbName, column) {
            const config = this.sortConfig[dbName];
            if (!config || config.column !== column) {
                return '⇅';
            }
            return config.order === 'asc' ? '↑' : '↓';
        },
        
        formatNumber(num) {
            return num.toLocaleString('zh-TW');
        },
        
        formatMB(mb) {
            if (mb >= 1024) {
                return `${(mb / 1024).toFixed(2)} GB`;
            }
            return `${mb.toFixed(2)} MB`;
        },
        
        getSizeColor(mb) {
            if (this.darkMode) {
                if (mb > 100) return 'text-red-400 font-bold';
                if (mb > 10) return 'text-orange-400 font-semibold';
                if (mb > 1) return 'text-yellow-400';
                return 'text-gray-400';
            } else {
                if (mb > 100) return 'text-red-600 font-bold';
                if (mb > 10) return 'text-orange-600 font-semibold';
                if (mb > 1) return 'text-yellow-600';
                return 'text-gray-600';
            }
        },
        
        getSortedTables(dbName) {
            const tables = [...this.groupedData[dbName]];
            const config = this.sortConfig[dbName];
            
            if (!config || !config.column) {
                return tables.sort((a, b) => b.Total_MB - a.Total_MB);
            }
            
            return tables.sort((a, b) => {
                let aVal = a[config.column];
                let bVal = b[config.column];
                
                if (typeof aVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                    return config.order === 'asc' 
                        ? aVal.localeCompare(bVal) 
                        : bVal.localeCompare(aVal);
                }
                
                return config.order === 'asc' 
                    ? aVal - bVal 
                    : bVal - aVal;
            });
        },
        
        generateMockData(tableName) {
            const weeks = [];
            const data = [];
            const today = new Date();
            
            const seed = tableName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            
            for (let i = 8; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - (i * 7));
                weeks.push(`${date.getMonth() + 1}/${date.getDate()}`);
                
                const baseValue = 3000 + (seed % 5000);
                const variance = 1000 + (seed % 2000);
                const growth = baseValue + Math.sin(i + seed) * variance;
                data.push(Math.floor(Math.abs(growth)));
            }
            
            return { weeks, data };
        },
        
        createChartWithRetry(dbName, tableName, retryCount) {
            const maxRetries = 5;
            const chartKey = `${dbName}-${tableName}`;
            
            if (retryCount > maxRetries) {
                console.error(`創建圖表失敗（已重試 ${maxRetries} 次）:`, chartKey);
                return;
            }
            
            const canvasId = `chart-${dbName}-${tableName.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const canvas = document.getElementById(canvasId);
            
            if (!canvas) {
                console.warn(`Canvas 尚未準備好，重試中... (${retryCount + 1}/${maxRetries})`, canvasId);
                setTimeout(() => {
                    this.createChartWithRetry(dbName, tableName, retryCount + 1);
                }, 200 * (retryCount + 1));
                return;
            }
            
            try {
                this.createChart(dbName, tableName);
                console.log('✅ 圖表創建成功:', chartKey);
            } catch (error) {
                console.error('創建圖表時發生錯誤:', chartKey, error);
                setTimeout(() => {
                    this.createChartWithRetry(dbName, tableName, retryCount + 1);
                }, 300 * (retryCount + 1));
            }
        },
        
        async createChart(dbName, tableName) {
            const chartKey = `${dbName}-${tableName}`;
            const canvasId = `chart-${dbName}-${tableName.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const canvas = document.getElementById(canvasId);

            if (!canvas) {
                throw new Error(`找不到 canvas: ${canvasId}`);
            }

            // 若已有舊圖表則銷毀
            if (this.charts[chartKey]) {
                this.destroyChart(chartKey);
            }

            try {
                const response = await fetch(`http://127.0.0.1:5000/api/daily-growth/${dbName}/${tableName}`);
                const result = await response.json();

                // 🆕 若 API 回傳失敗或資料為空，顯示佔位物件
                if (!result.success || !result.data || result.data.length === 0) {
                    console.warn(`❌ 無可用資料: ${dbName}.${tableName}`);

                    const parent = canvas.parentElement;
                    if (parent) {
                        parent.innerHTML = `
                            <div class="flex flex-col items-center justify-center h-64 rounded-lg border border-dashed 
                                        ${this.darkMode ? 'border-gray-600 bg-gray-800/40 text-gray-400' : 'border-gray-300 bg-gray-100 text-gray-500'}">
                                <svg class="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M9 13h6m2 0a2 2 0 002-2V7a2 2 0 00-2-2h-1V4a2 2 0 10-4 0v1H9V4a2 2 0 10-4 0v1H4a2 2 0 00-2 2v4a2 2 0 002 2h1v4a2 2 0 002 2h1v1a2 2 0 004 0v-1h2v1a2 2 0 004 0v-1h1a2 2 0 002-2v-4z" />
                                </svg>
                                <p class="text-sm font-medium">無可用圖表資料</p>
                            </div>`;
                    }
                    return;
                }

                // 🟢 若有資料才建立圖表
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error(`無法取得 canvas context: ${canvasId}`);

                this.charts[chartKey] = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: result.labels,
                        datasets: [{
                            label: '近 7 日新增筆數',
                            data: result.data,
                            backgroundColor: this.darkMode
                                ? 'rgba(96, 165, 250, 0.7)'
                                : 'rgba(59, 130, 246, 0.7)',
                            borderColor: this.darkMode
                                ? 'rgba(96, 165, 250, 1)'
                                : 'rgba(59, 130, 246, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: { duration: 750 },
                        plugins: {
                            legend: {
                                display: true,
                                labels: { color: this.darkMode ? '#d1d5db' : '#374151' }
                            },
                            title: {
                                display: true,
                                text: `${tableName} - 近 7 日新增趨勢`,
                                color: this.darkMode ? '#f3f4f6' : '#1f2937'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    color: this.darkMode ? '#9ca3af' : '#6b7280',
                                    callback(value) {
                                        if (Math.floor(value) === value)
                                            return value.toLocaleString('zh-TW');
                                    }
                                },
                                grid: {
                                    color: this.darkMode
                                        ? 'rgba(75, 85, 99, 0.3)'
                                        : 'rgba(229, 231, 235, 0.8)'
                                }
                            },
                            x: {
                                ticks: { color: this.darkMode ? '#9ca3af' : '#6b7280' },
                                grid: {
                                    color: this.darkMode
                                        ? 'rgba(75, 85, 99, 0.3)'
                                        : 'rgba(229, 231, 235, 0.8)'
                                }
                            }
                        }
                    }
                });
            } catch (error) {
                console.error(`創建圖表時發生網路或處理錯誤: ${chartKey}`, error);

                // 🆕 發生例外也顯示佔位物件
                const parent = canvas.parentElement;
                if (parent) {
                    parent.innerHTML = `
                        <div class="flex flex-col items-center justify-center h-64 rounded-lg border border-dashed 
                                    ${this.darkMode ? 'border-gray-600 bg-gray-800/40 text-gray-400' : 'border-gray-300 bg-gray-100 text-gray-500'}">
                            <svg class="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p class="text-sm font-medium">載入圖表失敗</p>
                        </div>`;
                }
            }
        },
        
        updateChartColors(chartKey) {
            const chart = this.charts[chartKey];
            if (!chart) return;
            
            try {
                chart.data.datasets[0].backgroundColor = this.darkMode 
                    ? 'rgba(96, 165, 250, 0.7)'
                    : 'rgba(59, 130, 246, 0.7)';
                chart.data.datasets[0].borderColor = this.darkMode
                    ? 'rgba(96, 165, 250, 1)'
                    : 'rgba(59, 130, 246, 1)';
                
                chart.options.plugins.legend.labels.color = this.darkMode ? '#d1d5db' : '#374151';
                chart.options.plugins.title.color = this.darkMode ? '#f3f4f6' : '#1f2937';
                chart.options.scales.y.ticks.color = this.darkMode ? '#9ca3af' : '#6b7280';
                chart.options.scales.x.ticks.color = this.darkMode ? '#9ca3af' : '#6b7280';
                chart.options.scales.y.grid.color = this.darkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)';
                chart.options.scales.x.grid.color = this.darkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)';
                
                chart.update();
            } catch (e) {
                console.warn('更新圖表顏色失敗:', chartKey, e);
            }
        }
    },
    mounted() {
        this.loadDarkMode();
        this.loadData();
    }
});

app.mount('#app');