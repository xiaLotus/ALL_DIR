const app = Vue.createApp({
    data() {
        return {
            isMenuOpen: false,
            projects: [
                {
                    id: 1,
                    title: "EAP 健康度監控",
                    description:
                        "使用 React 和 Node.js 開發的全端電商平台，包含購物車、付款系統和後台管理功能。",
                    tags: ["Python", "Vue.js", "Tailwind CSS", "專案"],
                    img: "static/picture/EAP.png",
                    liveUrl: "http://10.11.99.84:8080/",
                },
                {
                    id: 2,
                    title: "專案管理",
                    description:
                        "簡潔直觀的任務管理工具，支援拖拽排序、標籤分類和團隊協作功能。",
                    tags: ["Python", "Vue.js", "Tailwind CSS", "專案"],
                    img: "static/picture/project.png",
                    liveUrl: "http://10.11.99.84:8086/",
                },
                {
                    id: 3,
                    title: "困難點會議管理",
                    description:
                        "企業級數據分析儀表板，提供即時數據監控和互動式圖表展示。",
                    tags: ["Python", "Vue.js", "Tailwind CSS", "管理"],
                    img: "static/picture/difficult.png",
                    liveUrl: "http://10.11.99.84:8116/",
                },
                {
                    id: 4,
                    title: "ePR 請購管理",
                    description:
                        "跨平台行動應用，提供社交功能和即時通訊，支援 iOS 和 Android。",
                    tags: ["Python", "Vue.js", "Tailwind CSS", "管理"],
                    img: "static/picture/buy.png",
                    liveUrl: "http://10.11.99.84:8090/",
                },
                {
                    id: 5,
                    title: "報案系統分析",
                    description:
                        "現代化的部落格平台，支援 Markdown 編輯、SEO 優化和多媒體內容。",
                    tags: ["Python", "Vue.js", "Tailwind CSS", "工作"],
                    img: "static/picture/report.png",
                    liveUrl: "http://10.11.99.84:8096/",
                },
                {
                    id: 6,
                    title: "中控室警醒",
                    description:
                        "未來上線",
                    tags: ["Python", "Vue.js", "Tailwind CSS", "工作"],
                    img: "static/picture/TBD.jpg",
                    liveUrl: "",
                },
                {
                    id: 7,
                    title: "MES 更新派報",
                    description:
                        "RESTful API 服務平台，提供用戶認證、資料管理和第三方整合功能。",
                    tags: ["Python", "Vue.js", "Tailwind CSS", "工作"],
                    img: "static/picture/TBD.jpg",
                    liveUrl: "",
                },
                {
                    id: 8,
                    title: "MFG GO派報管理",
                    description:
                        "RESTful API 服務平台，提供用戶認證、資料管理和第三方整合功能。",
                    tags: ["Python", "Vue.js", "Tailwind CSS", "派報"],
                    img: "static/picture/in_out.png",
                    liveUrl: "http://10.11.99.84:8114/",
                },
                {
                    id: 9,
                    title: "Mail 派報管理",
                    description:
                        "RESTful API 服務平台，提供用戶認證、資料管理和第三方整合功能。",
                    tags: ["Python", "Vue.js", "Tailwind CSS", "派報"],
                    img: "static/picture/TBD.jpg",
                    liveUrl: "",
                },
            ],
            skills: [
                "JavaScript",
                "TypeScript",
                "Vue.js",
                "React",
                "Node.js",
                "Python",
                "MongoDB",
                "PostgreSQL",
                "Docker",
                "AWS",
                "Git",
                "Figma",
                "Tailwind CSS",
                "Next.js",
                "專案",
                "管理",
                "工作",
                "派報",
                "偷偷用"
            ],
            currentPage: 1,
            projectsPerPage: 6,
        };
    },

    computed: {
        totalPages() {
            return Math.ceil(this.projects.length / this.projectsPerPage);
        },
        paginatedProjects() {
            const start = (this.currentPage - 1) * this.projectsPerPage;
            const end = start + this.projectsPerPage;
            return this.projects.slice(start, end);
        },
        visiblePages() {
            const pages = [];
            const maxVisible = 5;
            let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
            let end = Math.min(this.totalPages, start + maxVisible - 1);

            if (end - start + 1 < maxVisible) {
                start = Math.max(1, end - maxVisible + 1);
            }

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
            return pages;
        },
  },
  methods: {
        toggleMenu() {
            this.isMenuOpen = !this.isMenuOpen;
        },
        scrollToSection(sectionId) {
            const element = document.getElementById(sectionId);
            if (element) {
                element.scrollIntoView({ behavior: "smooth" });
            }
            this.isMenuOpen = false;
        },
    },
});
app.mount("#app");
