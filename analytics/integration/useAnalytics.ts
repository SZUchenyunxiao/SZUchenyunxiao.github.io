// React 集成示例：如何把 tracker 接入本仓库主站 (src/)
// 说明：这是接入指引 + 伪代码，实际落地时把 tracker.ts 编译产物或源码引入 src/。

/*
--------------------------------------------------------------------------
1) 在 src/main.tsx 初始化一次：

  import { initAnalytics } from '<analytics>/tracker/tracker'

  initAnalytics({
    endpoint: import.meta.env.VITE_ANALYTICS_ENDPOINT
      ?? 'https://portfolio-analytics.xxx.workers.dev/api/collect',
  })

--------------------------------------------------------------------------
2) 路由变化时上报 page_view（HashRouter 场景）：
   在 App 里监听 location 变化，识别是否进入项目详情。
--------------------------------------------------------------------------
*/

// 伪代码：路由级 PV 上报 hook
export function useRouteAnalytics() {
  // PSEUDO:
  // const location = useLocation()
  // useEffect(() => {
  //   const m = location.pathname.match(/^\/projects\/(.+)$/)
  //   const slug = m?.[1]
  //   trackPageView(location.pathname, slug)   // 进入新项目详情也算一次 PV
  // }, [location.pathname])
}

/*
--------------------------------------------------------------------------
3) 关键按钮埋点：给现有链接加 onClick

  简历下载 (site.resume 按钮):
    <a href={site.resume} onClick={() => trackAction('resume_download')}>Resume</a>

  联系邮箱 (Contact / mailto):
    <a href={`mailto:${site.email}`} onClick={() => trackAction('contact_email')}>Contact</a>

  GitHub 链接:
    <a href={site.github} onClick={() => trackAction('github_link')}>GitHub</a>
--------------------------------------------------------------------------
4) 排除本人：管理员在自己浏览器执行一次
     localStorage.setItem('an_vid', '<固定ID>')
   并把该 ID 加入后台 settings.excluded_visitor_ids。
--------------------------------------------------------------------------
*/
