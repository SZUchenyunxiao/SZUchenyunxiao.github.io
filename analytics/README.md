# 个人主页访问统计系统

在现有 GitHub Pages 个人主页基础上，增加一个**仅管理员可访问**的数据后台，
了解主页访问情况、项目关注度及求职相关操作。

> 本目录是**独立于主站**的一套服务框架。主站（本仓库 `src/`）继续负责内容展示，
> 埋点脚本嵌入主站，访问数据由本目录的 Cloudflare Worker 接收并写入 D1 数据库，
> 管理后台登录后读取汇总与明细。核心业务逻辑以伪代码标注，框架可直接落地。

---

## 一、整体架构

```
┌────────────────────┐     访问事件 POST      ┌─────────────────────────┐
│  个人主页 (GitHub    │  ───────────────────▶ │  统计服务 (CF Worker)     │
│  Pages)             │   /api/collect        │  - 校验 / 去重 / 限流     │
│  tracker.ts 埋点     │                       │  - 取请求出口 IP          │
└────────────────────┘                        │  - 写入 D1               │
                                              └───────────┬─────────────┘
┌────────────────────┐   登录 + 查询 (鉴权)               │ SQL
│  管理后台 (admin/)   │  ◀──────────────────────────────▶ │
│  概览/项目/明细/设置  │   /api/admin/*                   ▼
└────────────────────┘                        ┌─────────────────────────┐
                                              │  Cloudflare D1 (SQLite)  │
                                              │  events / sessions / ... │
                                              └─────────────────────────┘
```

- **主页托管**：继续用 GitHub Pages。
- **统计服务 + 存储**：Cloudflare Workers + D1（免费额度足够个人站）。
- **管理后台**：静态页面 + 调用 Worker 的受保护查询接口。

## 二、目录结构

```text
analytics/
├── README.md                 # 本文档（架构 / 部署 / 口径）
├── PRIVACY.md                # 主页隐私说明草稿
├── wrangler.toml             # Cloudflare Workers + D1 配置
├── package.json
├── schema/
│   └── 0001_init.sql         # D1 数据表结构
├── worker/                   # 统计服务（后端）
│   ├── index.ts              # 入口 + 路由
│   ├── auth.ts               # 管理员登录 / 会话校验
│   ├── collect.ts            # 写入接口 POST /api/collect
│   ├── query.ts              # 后台查询接口 /api/admin/*
│   ├── metrics.ts            # 统计口径计算（PV/UV/会话/停留等）
│   ├── ratelimit.ts          # 限流 + 重复事件过滤
│   ├── geo.ts                # 出口 IP / 来源解析
│   └── types.ts              # 共享类型
├── tracker/
│   └── tracker.ts            # 前端埋点 SDK（嵌入主站）
├── integration/
│   └── useAnalytics.ts       # React 集成 hook（接入本仓库 src/）
└── admin/                    # 管理后台（前端）
    ├── index.html            # 登录 + 仪表盘骨架
    ├── dashboard.js          # 拉数据 + 渲染
    └── styles.css
```

## 三、后台页面（第一版范围）

1. **数据概览** — 今日 / 时间范围内：PV、UV、会话数、平均前台停留、简历下载点击、邮箱点击；折线图展示每日趋势；支持最近 7 天 / 30 天 / 自定义范围。
2. **项目分析** — 按项目汇总：浏览量、访客数、平均前台停留、简历下载点击。**记录项目详情之间的切换**，不只统计首次打开主页。
3. **访问明细** — 每次会话一行：开始时间、出口 IP、来源、设备/浏览器、浏览页数、前台停留、是否点击简历/联系方式；点开可看该会话的页面浏览顺序与关键操作。
4. **后台设置** — 管理员登录管理、统计时区、数据保留期限、本人访问排除。

暂不做：实时访客地图、访问录像、复杂用户画像。先保证数据可靠、口径清楚、后台易用。

## 四、统计口径（务必与后台展示一致）

| 指标 | 定义 |
|------|------|
| 浏览量 PV | 每次打开页面或**进入新的项目详情**计一次；停留时间的定期上报**不**重复计 PV |
| 独立访客 UV | 匿名浏览器标识估算；跨设备/浏览器可能计为多个；**IP 不作唯一身份** |
| 访问会话 | 一次连续访问；**连续 30 分钟无活动**后再访问视为新会话 |
| 停留时间 | **仅累计页面前台可见时间**，切后台/最小化暂停；表示可见时长，不等于实际阅读时间 |
| 平均停留 | 概览按**会话**算；项目分析按**该项目的页面浏览记录**算 |
| IP 地址 | 统计服务从请求获取的**公网出口地址**；多人可能共用，同一人也可能变化 |
| 关键操作 | 记录简历下载 / 邮箱 / GitHub 点击；仅代表**意向**，不等于下载完成/邮件成功/招聘转化 |

## 五、部署步骤（概要）

```bash
# 1. 安装依赖
cd analytics && npm install

# 2. 创建 D1 数据库并写入表结构
npx wrangler d1 create portfolio-analytics
# 把返回的 database_id 填进 wrangler.toml
npx wrangler d1 execute portfolio-analytics --file=./schema/0001_init.sql

# 3. 设置管理员密码哈希 / JWT 密钥（Secrets，不进代码库）
npx wrangler secret put ADMIN_PASSWORD_HASH
npx wrangler secret put JWT_SECRET

# 4. 本地调试 / 部署
npx wrangler dev
npx wrangler deploy

# 5. 主站接入：把 tracker.ts 打包后引入，或用 integration/useAnalytics.ts
#    并将统计服务域名配置为 tracker 的 endpoint。
```

### 本地查看管理后台

在仓库根目录运行 `npm run dev:analytics`，后台默认打开在
`http://127.0.0.1:8787/`。本地预览密码放在不会提交的
`admin/local-config.local.js` 中：

```js
globalThis.ANALYTICS_LOCAL_PASSWORD = 'your-local-password'
```

该文件只用于本地界面预览，正式部署必须使用 Worker Secret 和服务端鉴权。

## 六、访问控制与数据管理

- 后台查询接口**必须验证管理员身份**，不能只靠隐藏入口。
- 写入接口与查询接口**分开**，写入接口加**限流 + 重复事件过滤**。
- **完整 IP 仅向管理员展示**；访问明细初期保留 30 天，长期只留**不含完整 IP** 的汇总。
- 统计从功能上线后开始积累；网络中断 / 浏览器拦截 / 异常关闭可能造成部分遗漏。
