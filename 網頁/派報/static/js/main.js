const app = Vue.createApp({
    data() {
        return {
            rightMaxHeight: 0,
            formTitle: '',
            formData: {},
            tagInput: {},  
            groups: [],
            isEditMode: true,
            currentGroupId: null,
            activeIndex: null,
            showNewGroupModal: false,
            showFunctionDetail: false,
            newGroupName: '',
            activeIndexByGroup: {},
            fieldNames: [
                { key: 'item1', label: '投料場別(Plant)', type: 'select', options: ['F1', 'F3', 'F5']},
                { key: 'item2', label: '作業場別(Proc Plant)', type: 'select', options: ['F1', 'F3', 'F5']},
                { key: 'item3', label: '客戶碼', type: 'input'},
                { key: 'item4', label: '站點(Operation)', type: 'tags'},
                { key: 'item5', label: 'mcid', type: 'tags'},
                { key: 'item6', label: '使用的內部運行 Function', type: 'select', options: ['I', 'K']},
                { key: 'item7', label: '使用的輸出 Function', type: 'select', options: ['usegoal', 'NAgoal', 'nonegoal', 'sumK', 'delivery']},
                { key: 'item8', label: 'sumK Funtion 累計的K數站點', type: 'tags'},
                { key: 'item9', label: '是否擬定 Goal', type: 'select', options: ['Y', 'N']},
                { key: 'item10', label: 'Goal(可多個，但要按照排列，如果無，則默認 NA)', type: 'tags'},
                { key: 'item11', label: '是否顯示總 Total', type: 'select', options: ['Y', 'N']},
                { key: 'item12', label: '是否在總 Total 顯示 Goal', type: 'select', options: ['Y', 'N']},
                { key: 'item13', label: '總 Total 的 Goal', type: 'input'},
                { key: 'item14', label: '手動機台', type: 'tags'},
                { key: 'item15', label: '自動機台', type: 'tags'},
                { key: 'item16', label: '手動+自動機台的 Goal', type: 'input'},
                { key: 'item17', label: '幾小時發送一次', type: 'input'},
                { key: 'item18', label: '群組 ID', type: 'input'},
            ]
        }
    },
    computed: {
        currentGroup() {
            return this.groups.find(g => g.id === this.currentGroupId) || { name: '載入中...', submittedData: [] };
        },
        currentSubmittedData() {
            return this.currentGroup ? this.currentGroup.submittedData : []
        },
        groupedSubmittedData() {
            const result = {};
            for (const record of this.currentSubmittedData) {
                const groupKey = record.item17 || '未分類';
                if (!result[groupKey]) {
                    result[groupKey] = [];
                }
                result[groupKey].push(record);
            }
            return result;
        }
    },
    async mounted() {
        this.initializeForm()
        await this.loadFromStorage()
        if (this.groups.length === 0) {
            await this.createDefaultGroup()
            
        }
        this.updateRightHeight();
        if (this.currentGroupId === null && this.groups.length > 0) {
            this.currentGroupId = this.groups[0].id;
        }
        window.addEventListener('resize', this.updateRightHeight);
    },
    methods: {
        initializeForm() {
            for (const field of this.fieldNames) {
                if (field.type === 'tags') {
                    this.formData[field.key] = [];
                    this.tagInput[field.key] = '';
                } else {
                    this.formData[field.key] = '';
                }
            }
        },

        async createDefaultGroup() {
            const defaultGroup = { id: Date.now(), name: '預設群組', submittedData: [] };
            await fetch('http://127.0.0.1:5000/add_group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(defaultGroup)
            });
            await this.loadFromStorage();
        },

        async createNewGroup() {
            if (!this.newGroupName.trim()) return;
            const newGroup = { id: Date.now(), name: this.newGroupName.trim(), submittedData: [] };

            await fetch('http://127.0.0.1:5000/add_group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newGroup)
            });

            this.currentGroupId = newGroup.id; 
            this.showNewGroupModal = false;
            this.newGroupName = '';

            await this.loadFromStorage();
        },

        cancelNewGroup() {
            this.showNewGroupModal = false
            this.newGroupName = ''
        },
        async deleteCurrentGroup() {
            if (this.groups.length <= 1) {
                alert('至少需要保留一個群組！')
                return
            }
            if (confirm(`確定要刪除群組「${this.currentGroup.name}」嗎？此操作將刪除該群組的所有資料。`)) {
                await fetch('http://127.0.0.1:5000/delete_group', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ groupId: this.currentGroupId })
                });
                await this.loadFromStorage();
                if (this.groups.length > 0) {
                    this.currentGroupId = this.groups[0].id;
                } else {
                    this.currentGroupId = null;
                }
            }
        },
        switchGroup() {
            this.activeIndex = null
            this.initializeForm()
            this.updateRightHeight();
        },

        async handleSubmit() {
            const hasData = Object.values(this.formData).some(value => {
                if (Array.isArray(value)) {
                    return value.length > 0
                } else {
                    return value.trim() !== ''
                }
            }) || this.formTitle.trim() !== ''

            if (!hasData) {
                alert('請至少填寫一個項目或標題！')
                return
            }

            const submitData = { ...this.formData }
            submitData.timestamp = new Date().toLocaleString('zh-TW')
            submitData.title = this.formTitle.trim() || `未命名資料`

            await fetch('http://127.0.0.1:5000/add_record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupId: this.currentGroupId,
                    record: submitData
                })
            });

            await this.loadFromStorage();
            this.updateRightHeight();
            this.initializeForm();
            this.formTitle = '';
            alert(`資料已提交到「${this.currentGroup.name}」！`);
        },
        clearForm() {
            this.initializeForm()
        },

        async clearHistory() {
            if (confirm(`確定要清空「${this.currentGroup.name}」的所有記錄嗎？`)) {
                await fetch('http://127.0.0.1:5000/clear_group_records', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ groupId: this.currentGroupId })
                });
                await this.loadFromStorage();
                this.activeIndex = null;
            }
        },



        async deleteRecord(index) {
            if (confirm(`確定要刪除第 ${index + 1} 組資料嗎？`)) {
                await fetch('http://127.0.0.1:5000/delete_record', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        groupId: this.currentGroupId,
                        recordIndex: index
                    })
                });
                await this.loadFromStorage();
                this.updateRightHeight();
                if (this.activeIndex === index) {
                    this.activeIndex = null;
                } else if (this.activeIndex > index) {
                    this.activeIndex--;
                }
            }
        },


        toggleDetails(groupKey, index) {
            if (this.activeIndexByGroup[groupKey] === index) {
                this.activeIndexByGroup[groupKey] = null;
            } else {
                this.activeIndexByGroup[groupKey] = index;
            }
        },

        async loadFromStorage() {
            try {
                const response = await fetch('http://127.0.0.1:5000/load');
                const data = await response.json();
                if (data.groups) {
                    this.groups = data.groups;
                    if (this.currentGroupId === null && this.groups.length > 0) {
                        this.currentGroupId = this.groups[0].id;
                    }
                }
            } catch (err) {
                console.error('讀取失敗', err);
            }
        },
        addTag(fieldKey) {
            const value = this.tagInput[fieldKey].trim();
            if (['item4', 'item5'].includes(fieldKey)) {
                if (this.formData[fieldKey].includes(value)) {
                    alert("已經重複輸入，請勿重複加入！");
                    this.tagInput[fieldKey] = '';
                    return;
                }
            }
            this.formData[fieldKey].push(value);
            this.tagInput[fieldKey] = '';
        },

        removeTag(fieldKey, index) {
            this.formData[fieldKey].splice(index, 1);
        },

        async onDragEnd() {
            await fetch('http://127.0.0.1:5000/update_order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupId: this.currentGroupId,
                    newOrder: this.currentGroup.submittedData
                })
            });
        },
        updateRightHeight() {
            this.$nextTick(() => {
                const left = this.$refs.leftForm;
                if (left) {
                    this.rightMaxHeight = left.offsetHeight - 84;
                }
            });
        },
        async onDragEndByGroup(groupKey) {

            const newOrder = this.groupedSubmittedData[groupKey];

            const allGroups = this.groupedSubmittedData;

            let mergedData = [];
            for (let key of Object.keys(allGroups)) {
                if (key === groupKey) {
                    mergedData = mergedData.concat(newOrder);
                } else {
                    mergedData = mergedData.concat(allGroups[key]);
                }
            }

            await fetch('http://127.0.0.1:5000/update_order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupId: this.currentGroupId,
                    newOrder: mergedData
                })
            });

            await this.loadFromStorage();
        },
        async deleteRecordByGroup(groupKey, indexInGroup) {
            const recordsInGroup = this.groupedSubmittedData[groupKey];
            const recordToDelete = recordsInGroup[indexInGroup];

            const realIndex = this.currentSubmittedData.findIndex(r => r.timestamp === recordToDelete.timestamp);

            if (realIndex >= 0) {
                if (confirm(`確定要刪除「${recordToDelete.title}」這筆資料嗎？`)) {
                    await fetch('http://127.0.0.1:5000/delete_record', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            groupId: this.currentGroupId,
                            recordIndex: realIndex
                        })
                    });
                    await this.loadFromStorage();
                }
            }
        },
        openFunctionDetail() {
            this.showFunctionDetail = true;
            document.body.classList.add('overflow-hidden');
        },
        cancelShowFunctionDetail() {
            this.showFunctionDetail = false;
            document.body.classList.remove('overflow-hidden');
        },
    }
})
app.component('draggable', vuedraggable)
app.mount('#app')
