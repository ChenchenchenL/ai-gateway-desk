# AI Gateway Desk

> **极轻量、免打开浏览器、常驻桌面的 AI API 聚合监控小窗工具**  
> 专为 Cursor / Claude Code / Aider / Dify 等 AI 编程与 Agent 重度用户设计。

---

## 核心特性

- **多站点多协议统一聚合**：一站式接入并监控 One-API、New-API、Sub2API 订阅池网关以及标准 OpenAI / Anthropic 兼容端点。
- **直接余额显示（Direct Balance Display）**：直接读取并显示接口返回的实际账户余额（如 `$18.50`、`¥100.00`），杜绝混淆的 Quota 点数换算。
- **Prompt Caching（提示词缓存）洞察引擎**：
  - 自动提取并统计 `Input Tokens`、`Output Tokens`、`Cache Read Tokens` 与 `Cache Write Tokens`。
  - 精准计算 Prompt 缓存命中率（`Cache Hit Rate = 缓存读取 / 总输入 × 100%`），量化提示词复用带来的成本节约。
- **Sub2API 滚动窗口监控**：直观展示 5 小时滚动配额剩余量以及下一次重置时间倒计时。
- **多维度用量分析**：支持按“今日”、“过去 24 小时”、“7 天”、“30 天”切换统计周期，提供各大模型（Claude 3.5 Sonnet、GPT-4o 等）的调用次数与消耗排行。
- **原生桌面挂件交互**：
  - 无边框毛玻璃小窗设计，支持自由拖拽移动。
  - 支持窗口一键置顶（Always-on-Top）与贴边常驻。
  - Windows 系统托盘常驻，支持快捷呼出/隐藏小窗及右键一键全局刷新。
- **智能后台刷新与去重**：默认每 60 秒静默轮询，用户可随时点击手动刷新；内置并发任务去重机制（In-Flight Deduplication），避免重复并发打扰服务端。
- **桌面告警与健康感知**：连续 3 次请求失败或余额低于自定义阈值时自动发送桌面通知，故障恢复后及时提醒。
- **本地安全与隐私保护**：
  - 直连目标中转服务器，无任何第三方中间服务，杜绝 Token 泄露。
  - API Key 采用 Windows DPAPI / 系统 Keyring 本地加密存储。
  - 日志自动脱敏（自动过滤 Token、Authorization 与敏感 URL 参数）。

---

## 架构设计

项目采用严格的**四层架构解耦**设计，依赖单向由外向内：

```text
React 18 + TypeScript + Tailwind CSS (UI 界面层)
        ↓ Tauri 2.0 IPC / DTO
应用服务层 (刷新调度、用量聚合、告警监控、本地配置)
        ↓ 统一接口 (GatewayAdapter)
领域层 (Site, UsageRecord, SiteCapabilities, AppError)
        ↓
基础设施层 (SQLite, Keyring/DPAPI, HTTP Client, System Tray)
```

### 目录结构

```text
ai-gateway-desk/
├── src/                                # 前端代码 (React 18 + TypeScript + Tailwind CSS)
│   ├── components/                     # 组件层 (TitleBar, SiteCard, SiteDetailModal, SiteFormModal 等)
│   ├── hooks/                          # 状态与业务 Hooks (useSites, useRefresh, useSiteStats, useSettings)
│   ├── services/                       # Tauri Command IPC 封装
│   ├── types/                          # 前后端契约 TypeScript 类型定义
│   └── utils/                          # 格式化、时间计算与错误解析工具
│
├── src-tauri/                          # 桌面应用后端 (Tauri 2.0 + Rust)
│   ├── src/
│   │   ├── domain/                     # 领域模型与分类错误定义 (无外部框架依赖)
│   │   ├── app/                        # 业务应用服务 (SiteService, RefreshService, StatsService, ConfigService)
│   │   ├── infra/                      # 基础设施与适配器矩阵 (OneAPI, NewAPI, Sub2API, OpenAI, Anthropic)
│   │   ├── dto/                        # 前后端交互数据传输对象 (DTO)
│   │   └── commands/                   # Tauri Command 路由接口
│   └── tests/                          # 单元测试与端到端集成测试
│
├── FUNCTION_PRODUCTION_SPEC.md         # 功能制作基线文档
├── PROJECT_BACKGROUND.md               # 项目背景与立项说明
└── AGENTS.md                           # 开发规范与代码约定
```

---

## 快速上手

### 环境准备

- [Node.js](https://nodejs.org/) (>= 18.0.0)
- [Rust & Cargo](https://www.rust-lang.org/) (建议最新稳定版)
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

如仅需快速调试 Web 前端页面：

```bash
npm run dev
```

### 3. 构建独立桌面安装包

打包生成绿色单文件 `.exe` 或标准安装程序：

```bash
npm run tauri build
```

构建产物将输出在 `src-tauri/target/release/bundle/` 目录下。

---

## 测试与质量门禁

项目包含完整的领域模型、存储幂等去重、适配器契约解析及端到端业务流测试：

```bash
# 运行前端类型检查与生产构建
npm run build

# 运行 Rust 后端全部单元测试与集成测试
cd src-tauri && cargo test
```

---

## 核心使用指南

1. **添加站点**：
   - 点击首页右上角“添加”按钮，选择中转站协议类型（One-API / New-API / Sub2API / OpenAI 等）。
   - 填写站点名称、Base URL 与 API Key。
   - 点击**“测试连接”**，应用将自动探测并反馈该站点支持的功能（余额查询、使用日志、Prompt Cache 读写、窗口配额）。
   - 点击“保存”，站点即刻加入悬浮小窗监控列表。
2. **查看 Prompt 缓存与模型明细**：
   - 在首页点击任意站点卡片进入详情弹窗。
   - 在“今日”、“24小时”、“7天”间快速切换，查看当前提示词缓存命中率以及各大模型的 Token 消耗明细。
3. **小窗常驻与置顶**：
   - 点击标题栏的 **置顶** 图标，小窗将始终置于其他窗口最上层，方便在 IDE 编码时随时查看额度。
   - 点击关闭或最小化按钮将自动收起至 Windows 系统托盘。

---

## 开源许可证

本项目基于 [MIT License](LICENSE) 开源。