-- Cloudflare D1 (SQLite) 数据表结构
-- 设计要点：
--   - events 表存原始事件（page_view / duration / action），是所有指标的来源
--   - sessions 表存会话汇总，便于"访问明细"列表快速查询
--   - visitors 表存匿名访客，UV 基于此估算（IP 不作唯一身份）
--   - daily_rollup 长期保留的每日汇总，不含完整 IP，用于超出明细保留期后的趋势

-- 匿名访客（浏览器标识估算，跨设备可能重复）
CREATE TABLE IF NOT EXISTS visitors (
  visitor_id   TEXT PRIMARY KEY,      -- 前端生成的匿名 ID（localStorage）
  first_seen   INTEGER NOT NULL,      -- 首次出现时间 (epoch ms)
  last_seen    INTEGER NOT NULL,
  is_excluded  INTEGER NOT NULL DEFAULT 0  -- 管理员/开发预览排除标记
);

-- 访问会话（连续 30 分钟无活动后视为新会话）
CREATE TABLE IF NOT EXISTS sessions (
  session_id       TEXT PRIMARY KEY,
  visitor_id       TEXT NOT NULL,
  started_at       INTEGER NOT NULL,
  last_active_at   INTEGER NOT NULL,
  ip               TEXT,              -- 公网出口 IP（完整值仅后台展示）
  ip_prefix        TEXT,              -- 脱敏前缀（如 203.0.113.0/24），用于长期汇总
  referrer         TEXT,              -- 来源 URL；空则前端标记为 direct
  referrer_type    TEXT,              -- direct / search / social / external / unknown
  device_type      TEXT,             -- desktop / mobile / tablet
  browser          TEXT,
  os               TEXT,
  country          TEXT,             -- 由 CF request.cf.country 提供（可选）
  page_view_count  INTEGER NOT NULL DEFAULT 0,
  total_foreground_ms INTEGER NOT NULL DEFAULT 0, -- 会话累计前台停留
  clicked_resume   INTEGER NOT NULL DEFAULT 0,
  clicked_contact  INTEGER NOT NULL DEFAULT 0,
  clicked_github   INTEGER NOT NULL DEFAULT 0,
  is_excluded      INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (visitor_id) REFERENCES visitors(visitor_id)
);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_visitor ON sessions(visitor_id);

-- 原始事件（PV / 停留上报 / 关键操作）
CREATE TABLE IF NOT EXISTS events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   TEXT NOT NULL,
  visitor_id   TEXT NOT NULL,
  type         TEXT NOT NULL,        -- 'page_view' | 'duration' | 'action'
  -- page_view: 打开页面或进入新项目详情
  page_path    TEXT,                 -- 如 '/', '/projects/panohk360'
  project_slug TEXT,                 -- 命中项目详情时填充，用于项目分析
  -- duration: 定期上报的前台可见增量（不重复计 PV）
  foreground_ms INTEGER,
  -- action: 关键操作
  action_name  TEXT,                 -- 'resume_download' | 'contact_email' | 'github_link'
  created_at   INTEGER NOT NULL,     -- epoch ms
  dedup_key    TEXT                  -- 去重键（幂等写入）
);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_type_time ON events(type, created_at);
CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_dedup ON events(dedup_key);

-- 每日汇总（长期保留，不含完整 IP）
CREATE TABLE IF NOT EXISTS daily_rollup (
  day             TEXT NOT NULL,     -- 'YYYY-MM-DD'（按配置时区）
  project_slug    TEXT,              -- NULL 表示全站汇总
  page_views      INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  sessions        INTEGER NOT NULL DEFAULT 0,
  avg_foreground_ms INTEGER NOT NULL DEFAULT 0,
  resume_clicks   INTEGER NOT NULL DEFAULT 0,
  contact_clicks  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, project_slug)
);

-- 管理员账户（单管理员即可；密码存哈希，不存明文）
CREATE TABLE IF NOT EXISTS admins (
  username        TEXT PRIMARY KEY,
  password_hash   TEXT NOT NULL,     -- 也可用 wrangler secret 存，二选一
  created_at      INTEGER NOT NULL
);

-- 后台设置（时区 / 保留期 / 排除规则等，单行 JSON）
CREATE TABLE IF NOT EXISTS settings (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  timezone    TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  retention_days INTEGER NOT NULL DEFAULT 30,
  excluded_visitor_ids TEXT NOT NULL DEFAULT '[]',  -- JSON 数组
  excluded_ip_prefixes TEXT NOT NULL DEFAULT '[]'
);
INSERT OR IGNORE INTO settings (id) VALUES (1);
