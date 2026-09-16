-- Cloudflare D1 schema for the portfolio analytics service.
-- Raw events are retained for dashboard drill-down; long-term cleanup can be
-- added later once the real traffic volume is known.

CREATE TABLE IF NOT EXISTS visitors (
  visitor_id   TEXT PRIMARY KEY,
  first_seen   INTEGER NOT NULL,
  last_seen    INTEGER NOT NULL,
  is_excluded  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id       TEXT PRIMARY KEY,
  visitor_id       TEXT NOT NULL,
  started_at       INTEGER NOT NULL,
  last_active_at   INTEGER NOT NULL,
  ip               TEXT,
  ip_prefix        TEXT,
  referrer         TEXT,
  referrer_type    TEXT,
  device_type      TEXT,
  browser          TEXT,
  os               TEXT,
  country          TEXT,
  page_view_count  INTEGER NOT NULL DEFAULT 0,
  total_foreground_ms INTEGER NOT NULL DEFAULT 0,
  clicked_resume   INTEGER NOT NULL DEFAULT 0,
  clicked_contact  INTEGER NOT NULL DEFAULT 0,
  clicked_github   INTEGER NOT NULL DEFAULT 0,
  is_excluded      INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (visitor_id) REFERENCES visitors(visitor_id)
);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_visitor ON sessions(visitor_id);

CREATE TABLE IF NOT EXISTS events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   TEXT NOT NULL,
  visitor_id   TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('page_view', 'duration', 'action')),
  page_path    TEXT,
  project_slug TEXT,
  foreground_ms INTEGER,
  action_name  TEXT,
  created_at   INTEGER NOT NULL,
  dedup_key    TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_time ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_type_time ON events(type, created_at);
CREATE INDEX IF NOT EXISTS idx_events_project_time ON events(project_slug, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_dedup ON events(dedup_key);

CREATE TABLE IF NOT EXISTS settings (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  timezone    TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  retention_days INTEGER NOT NULL DEFAULT 30,
  excluded_visitor_ids TEXT NOT NULL DEFAULT '[]',
  excluded_ip_prefixes TEXT NOT NULL DEFAULT '[]'
);
INSERT OR IGNORE INTO settings (id) VALUES (1);

-- Opaque admin sessions. Only an HMAC digest is stored in D1; the raw token
-- exists only in a Secure + HttpOnly cookie in the administrator's browser.
CREATE TABLE IF NOT EXISTS admin_sessions (
  session_hash TEXT PRIMARY KEY,
  username     TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry ON admin_sessions(expires_at);

-- Persistent fixed-window counters keep public collection and login endpoints
-- from being abused. Keys contain only a digest, never a password or token.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key   TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expiry ON rate_limits(expires_at);
