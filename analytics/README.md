# Portfolio Analytics

个人主页继续由 GitHub Pages 托管；本目录部署为一个 Cloudflare Worker，负责：

- 托管密码保护的管理后台；
- 接收 GitHub Pages 主站的匿名访问事件；
- 将访客、会话和事件写入 Cloudflare D1；
- 提供 PV、UV、停留、项目访问与关键点击查询；
- 使用服务端会话和 `Secure + HttpOnly + SameSite=Strict` Cookie 保护后台。

代码中不包含正式密码、密码哈希或会话密钥。正式敏感值全部通过 Worker Secrets 配置。

## 架构

```text
GitHub Pages 主站
  └─ POST /api/collect ──► Cloudflare Worker ──► D1

Cloudflare Worker 管理后台
  ├─ POST /api/admin/login
  └─ GET  /api/admin/* ───► HttpOnly 会话校验 ──► D1
```

## 已实现

- 严格校验 `ALLOWED_ORIGIN`；
- D1 固定窗口限流和事件幂等去重；
- 匿名 visitor/session ID，不使用 IP 作为用户身份；
- 页面访问、前台停留、简历/邮箱/GitHub 点击；
- SHA-256 摘要 + 恒定时间密码校验（要求使用 16 位以上随机密码）；
- D1 中仅保存管理员会话 token 的 HMAC 摘要；
- 登录尝试限流；
- 每日清理过期会话、限流桶和超出保留期的访问明细；
- 管理后台与 API 由同一个 Worker 域名提供，避免把 token 放进 `sessionStorage`。

## 本地验证

```powershell
cd analytics
npm install
npm run db:migrate:local
npm run dev
```

本地 Worker 使用被 `.gitignore` 排除的 `.dev.vars`：

```dotenv
ADMIN_PASSWORD_HASH="sha256$..."
SESSION_TOKEN_PEPPER="仅用于本地的随机值"
```

生成密码哈希：

```powershell
npm run password:hash
```

静态界面预览仍可通过仓库根目录的 `npm run dev:analytics` 启动。它只使用同样被忽略的
`admin/local-config.local.js`，不会连接真实数据库。

## 首次线上部署

### 1. 登录并创建 D1

```powershell
cd analytics
npx wrangler login
npx wrangler d1 create portfolio-analytics
```

把命令返回的 `database_id` 填入 `wrangler.toml`，然后执行迁移：

```powershell
npm run db:migrate
```

### 2. 配置正式 Secrets

先运行：

```powershell
npm run password:hash
```

建议使用新的 16 位以上随机密码，不要沿用本地预览密码。把输出值写入 Secret：

```powershell
npx wrangler secret put ADMIN_PASSWORD_HASH
npx wrangler secret put SESSION_TOKEN_PEPPER
```

`SESSION_TOKEN_PEPPER` 请使用密码管理器生成的至少 32 字节随机字符串。

### 3. 发布 Worker

```powershell
npm run check
npm run deploy
```

当前部署地址：

```text
https://portfolio-analytics.szuchenyunxiao.workers.dev
```

后台地址就是该域名根路径，采集地址为：

```text
https://portfolio-analytics.szuchenyunxiao.workers.dev/api/collect
```

### 4. 配置 GitHub Actions 变量

进入 GitHub 仓库：`Settings → Secrets and variables → Actions → Variables`，添加：

| 变量 | 值 |
|---|---|
| `VITE_ANALYTICS_ENDPOINT` | Worker 地址加 `/api/collect` |
| `VITE_ANALYTICS_ADMIN_URL` | Worker 根地址 |

代码中已包含当前 Worker 地址作为生产默认值；这两个变量用于以后切换域名，无需修改代码。

## 数据口径

| 指标 | 定义 |
|---|---|
| PV | 打开首页或进入项目详情计一次 |
| UV | 浏览器本地随机 ID 估算，换设备/浏览器会被视为新访客 |
| 会话 | 连续 30 分钟无活动后创建新会话 |
| 停留 | 只累计页面处于前台可见状态的时间 |
| 用户信息 | 出口 IP、国家/地区、来源类型、设备、浏览器、系统；不包含姓名、邮箱或 GitHub 身份 |
| 保留期 | 默认 30 天，可配置为 7–365 天，过期明细由每日任务删除 |

## 安全说明

- `wrangler.toml` 可以提交，但正式 Secrets、`.dev.vars` 和 `local-config.local.js` 不可以提交。
- CORS/Origin 校验不能阻止脚本伪造请求，因此采集接口同时使用 D1 限流、输入校验和幂等键。
- 后台入口是否隐藏不属于安全措施，真正的保护来自服务端鉴权和 HttpOnly Cookie。
- 公开网站无法直接获取访客姓名、邮箱或 GitHub 账号；如需这些信息，必须增加明确的用户登录授权。
