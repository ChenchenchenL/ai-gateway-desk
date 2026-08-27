# AI Gateway Desk

> **极轻量、免打开浏览器、常驻桌面的 Windows 11 浅色毛玻璃 New-API 监控悬浮小工具**  
> 专为 Cursor / Claude Code / Aider / Windsurf / Dify 等 AI 编程与 Agent 重度用户设计。

---

## ✨ 核心特性

- **专注于 New-API 统一中转监控**：深度适配 New-API 架构中转站，支持多站点管理与即时无缝切换。
- **真实账户余额直显（Direct Balance Display）**：直接读取并显示接口返回的实际账户余额（如 `¥0.1491`、`$18.50`），杜绝混淆的 Quota 点数换算。
- **Prompt Caching（提示词缓存）洞察引擎**：
  - 自动提取并统计 `输入 Tokens`、`输出 Tokens`、`缓存命中 (Cache Read Tokens)` 与 `请求次数`。
  - 精准计算 Prompt 缓存命中率（`Cache Hit Rate = 缓存请求 / 总输入 × 100%`），量化提示词复用带来的输入成本节约（如 `节省 78% 成本`）。
- **模型调用排行榜 (Top 3 直显)**：
  - 🥇 **金牌 / 🥈 银牌 / 🥉 铜牌** 直观展示调用量最高的前三名模型；
  - 同屏完整展示模型名称、调用次数、In/Out Token 消耗及各自的 Cache 命中详情。
- **Windows 11 Fluent Design 浅色毛玻璃悬浮挂件**：
  - **浅色高透雾化亚克力（Frosted Glass）** + 柔和蓝紫极光漫射背景，彻底告别深黑死板设计。
  - **原生桌面小工具交互**：350×560 精准小窗画幅，无多余白边与滚动条，支持鼠标按住任意区域自由平滑拖动。
  - **一键置顶与紧凑模式**：支持窗口一键置顶（Always-on-Top）常驻桌面前端，或一键折叠为极简 Mini HUD 悬浮条。
- **智能后台刷新与去重**：默认后台定时自动轮询，支持随时手动一键刷新；内置请求去重机制（In-Flight Deduplication），避免高频并发干扰服务端。
- **故障告警与通知**：请求异常或余额低于自定义告警阈值时自动发送桌面通知。
- **本地安全与隐私保护**：
  - 直连目标中转服务器，无任何第三方中转，杜绝 Token 泄露。
  - API Key 与管理 Token 本地持久化存储，并在请求及日志中自动脱敏过滤。

---

## 🛠️ 技术架构与分层

项目采用严格的**四层架构解耦**设计，依赖单向由外向内：

```text
React 18 + TypeScript + Tailwind CSS (Windows 11 Fluent 浅色毛玻璃 UI)
        ↓ Tauri 2.0 IPC / DTO
应用服务层 (刷新调度、用量聚合、告警监控、本地配置)
        ↓ 统一适配服务 (New-API Adapter)
领域层 (Site, UsageRecord, SiteCapabilities, AppError)
        ↓
基础设施层 (SQLite, HTTP Client, System Tray, Local Secure Storage)
```

### 目录结构

```text
ai-gateway-desk/
├── src/                                # 前端代码 (React 18 + TypeScript + Tailwind CSS)
│   ├── components/
│   │   ├── widget/                     # FluentWidget 核心桌面挂件组件 (Header, Balance, 4-Grid, Cache, ModelRank, Mini)
│   │   ├── site/                       # 站点管理弹窗与卡片 (SiteFormModal, SiteCard, SiteList)
│   │   ├── settings/                   # 偏好设置弹窗 (SettingsModal)
│   │   ├── stats/                      # 用量与缓存统计图表组件
│   │   └── common/                     # 通用轻量级 UI (ConfirmDialog, EmptyState, IconButton, StatusBadge)
│   ├── hooks/                          # 状态与业务 Hooks (useSites, useRefresh, useSiteStats, useSettings)
│   ├── services/                       # Tauri Command IPC 与统一网络请求服务
│   ├── types/                          # 前后端契约 TypeScript 类型定义
│   └── utils/                          # 货币格式化、Token 换算与错误解析工具
│
├── src-tauri/                          # 桌面应用后端 (Tauri 2.0 + Rust)
│   ├── src/
│   │   ├── domain/                     # 领域模型与错误分类
│   │   ├── app/                        # 业务应用服务 (SiteService, RefreshService, StatsService, ConfigService)
│   │   ├── infra/                      # 基础设施与 New-API 适配器
│   │   ├── dto/                        # 前后端交互数据传输对象 (DTO)
│   │   └── commands/                   # Tauri Command 路由接口
│   └── tauri.conf.json                 # Tauri 桌面窗口配置 (350x560 悬浮无边框透明配置)
│
├── FUNCTION_PRODUCTION_SPEC.md         # 功能基线文档
├── PROJECT_BACKGROUND.md               # 项目背景与立项说明
└── AGENTS.md                           # 开发规范与代码约定
```

---

## 🚀 快速上手

### 环境准备

- [Node.js](https://nodejs.org/) (>= 18.0.0)
- [Rust & Cargo](https://www.rust-lang.org/) (最新稳定版)
- Windows 10 / 11 (64位) 或 Linux / macOS

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发模式

运行前端与 Tauri 桌面端联动调试（支持热重载）：

```bash
npm run tauri dev
```

如仅需快速调试 Web 浏览器预览界面：

```bash
npm run dev
```

浏览器访问 `http://localhost:1420` 即可在网页中央查看等比例的浅色毛玻璃悬浮小工具。

### 3. 构建独立桌面安装包

打包生成 Windows 绿色独立 `.exe` 或安装程序：

```bash
npm run tauri build
```

构建产物将输出在 `src-tauri/target/release/bundle/` 目录下。

---

## 📖 核心使用指南

1. **添加 New-API 站点**：
   - 点击挂件左上角站点下拉菜单中的 **“添加新中转站点...”**；
   - 填写 **站点名称**、**接口地址 (Base URL)** 与 **API Token / 访问密钥**；
   - 点击 **“测试连接”**，应用将自动探测并反馈该站点支持的各项能力（余额、日志、Prompt Cache）；
   - 点击 **“保存”**，站点即刻加入监控并在小工具中实时呈现。
2. **切换与管理站点**：
   - 点击左上角站点名称胶囊可随时切换不同站点；
   - 点击右上角 ✏️ 可快速编辑当前站点，点击 🗑️ 可一键删除站点（带安全二次确认）。
3. **统计周期切换**：
   - 点击 **“今日”**、**“24小时”**（默认）、**“7天”** 或 **“30天”** 胶囊，即时查看对应周期内的输入/输出 Token 消耗、缓存命中数与排行。
4. **窗口置顶与拖动**：
   - 点击右上角 📌 图标可开启/关闭桌面窗口置顶（Always on Top）；
   - 按住小工具标题栏或任意非交互空白区域即可自由拖动到屏幕任意位置。

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 开源。