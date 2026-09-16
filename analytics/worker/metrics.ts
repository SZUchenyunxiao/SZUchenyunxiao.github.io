// 统计口径计算。所有指标定义严格对齐 README「四、统计口径」。
// SQL 以伪代码标注，排除 is_excluded 的会话/访客。

import type { Env, RangeQuery, OverviewMetrics } from './types'

export async function computeOverview(_env: Env, _q: RangeQuery): Promise<OverviewMetrics> {
  // 页面浏览量 PV：type='page_view' 的事件数（duration 上报不计 PV）
  //   PSEUDO: SELECT COUNT(*) FROM events e JOIN sessions s USING(session_id)
  //           WHERE e.type='page_view' AND e.created_at BETWEEN ? AND ? AND s.is_excluded=0
  //
  // 独立访客 UV：区间内出现过的不同 visitor_id 数（IP 不作身份）
  //   PSEUDO: SELECT COUNT(DISTINCT visitor_id) FROM sessions
  //           WHERE started_at BETWEEN ? AND ? AND is_excluded=0
  //
  // 访问会话数：区间内 session 数
  //   PSEUDO: SELECT COUNT(*) FROM sessions WHERE started_at BETWEEN ? AND ? AND is_excluded=0
  //
  // 平均前台停留（概览口径：按会话）
  //   PSEUDO: SELECT AVG(total_foreground_ms) FROM sessions WHERE ... is_excluded=0
  //
  // 简历下载 / 邮箱点击：对应 action_name 的事件数
  //   PSEUDO: SELECT COUNT(*) FROM events WHERE type='action' AND action_name='resume_download' ...
  //
  // 每日趋势：按配置时区把 created_at 归到 day，GROUP BY day
  //   PSEUDO: SELECT day, COUNT(pv), COUNT(DISTINCT visitor) ... GROUP BY day ORDER BY day

  return {
    pageViews: 0,
    uniqueVisitors: 0,
    sessions: 0,
    avgForegroundMs: 0,
    resumeClicks: 0,
    contactClicks: 0,
    dailyTrend: [],
  }
}

export interface ProjectRow {
  projectSlug: string
  projectName: string
  pageViews: number
  visitors: number
  avgForegroundMs: number
  resumeClicks: number
}

export async function computeProjectAnalytics(_env: Env, _q: RangeQuery): Promise<ProjectRow[]> {
  // 按 project_slug 汇总。注意：项目详情之间的切换也是 page_view（带 project_slug），
  // 因此能反映"访客在站内切换了哪些项目"，而不只是首次打开主页。
  //
  //   PSEUDO:
  //   SELECT project_slug,
  //          COUNT(*)                          AS page_views,
  //          COUNT(DISTINCT visitor_id)        AS visitors,
  //          -- 平均停留（项目口径：按该项目的页面浏览记录聚合 duration 事件）
  //          AVG(project_foreground_ms)        AS avg_foreground_ms,
  //          SUM(resume_click_in_project)      AS resume_clicks
  //   FROM events JOIN sessions USING(session_id)
  //   WHERE type IN ('page_view','duration','action')
  //     AND project_slug IS NOT NULL
  //     AND created_at BETWEEN ? AND ? AND is_excluded=0
  //   GROUP BY project_slug
  //
  // 项目名从主站 projects 数据映射（slug -> title），保持与前台一致：
  //   structured-light-scanning / mesh-processing / 3dgs-printing / panohk360 / lod2-building-reconstruction
  return []
}
