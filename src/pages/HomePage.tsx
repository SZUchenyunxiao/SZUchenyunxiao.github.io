import { Suspense, lazy } from 'react'
import { Header } from '../components/Header'
import { ProjectCard } from '../components/ProjectCard'
import { SectionHeading } from '../components/SectionHeading'
import { featuredProjects, projects } from '../data/projects'
import { site } from '../data/site'
import { handleAnchorClick } from '../utils/scroll'
import { renderBold } from '../utils/richText'

// 首页 hero 的真实 3DGS 场景，懒加载
const GaussianViewer = lazy(() =>
  import('../three/GaussianViewer').then((m) => ({ default: m.GaussianViewer })),
)

export function HomePage() {
  return (
    <>
      <Header />
      <main>
        <section className="cover" id="top">
          <div className="cover-inner container">
            <p className="cover-hello">Hello! <span aria-hidden>👋</span></p>
            <h1 className="cover-name">
              I&apos;m <span>{site.name}</span>
            </h1>
            <p className="cover-role">{site.role}</p>
            <p className="cover-role-zh">{site.introZh}</p>
            <div className="cover-socials">
              <a href={`mailto:${site.email}`} aria-label="Email" title={site.email}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
              </a>
              <a href={site.github} target="_blank" rel="noreferrer" aria-label="GitHub" title="GitHub">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.72-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" /></svg>
              </a>
              <a href={`tel:${site.phone.replace(/-/g, '')}`} aria-label="Phone" title={site.phone}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>
              </a>
            </div>
          </div>
          <a href="#hero" onClick={handleAnchorClick('hero')} className="cover-scroll" aria-label="Scroll down">
            <span>Scroll</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m6 9 6 6 6-6" /></svg>
          </a>
        </section>

        <section className="hero container" id="hero">
          <div className="hero-copy">
            <div className="status-line"><span /> Open to 3D reconstruction / vision roles</div>
            <p className="hero-kicker">{site.nameZh} · {site.name}</p>
            <h1>
              Reconstructing the world into measurable <span>3D geometry.</span>
            </h1>
            <p className="hero-intro">{site.intro}</p>
            <p className="hero-intro-zh">{site.introZh}</p>
            <div className="hero-actions">
              <a className="button primary" href="#work" onClick={handleAnchorClick('work')}>Explore work</a>
              <a className="button secondary" href={site.resume}>Resume ↗</a>
            </div>
            <div className="hero-stats">
              <div><strong>0.023 mm</strong><span>结构光扫描球心距精度</span></div>
              <div><strong>~2M</strong><span>城市全景 RGB-D 帧</span></div>
              <div><strong>#3</strong><span>CVPR 2025 Workshop 竞赛全球第三</span></div>
            </div>
          </div>
          <div className="hero-scene-wrap">
            <Suspense fallback={<div className="gaussian-viewer-overlay"><span>Loading 3DGS…</span></div>}>
              <GaussianViewer src="./assets/models/berries.ksplat" />
            </Suspense>
            <div className="scene-caption">
              <span>3D Gaussian Splatting · berries</span>
              <span>drag · rotate · zoom</span>
            </div>
          </div>
        </section>

        <section className="work-section container" id="work">
          <SectionHeading
            eyebrow="Selected work"
            title="Selected 3D Reconstruction Projects"
          />
          <div className="projects-grid">
            {featuredProjects.map((project) => <ProjectCard project={project} key={project.slug} />)}
          </div>
          <div className="compact-projects">
            {projects.filter((item) => !item.featured).map((project) => (
              <a href={`#/projects/${project.slug}`} className="compact-project" key={project.slug}>
                <span>{project.index}</span>
                <strong>{project.title}</strong>
                <em>{project.subtitle}</em>
                <b>→</b>
              </a>
            ))}
          </div>
        </section>

        <section className="experience-section" id="experience">
          <div className="container">
            <SectionHeading
              eyebrow="Experience"
              title="从算法验证到工程交付的完整实习与项目经历。"
            />
            <div className="timeline">
              {site.experience.map((item) => (
                <article className="timeline-item" key={item.org}>
                  <div className="timeline-head">
                    <div>
                      <h3>{item.org}</h3>
                      <p className="timeline-role">{item.title}</p>
                    </div>
                    <span className="timeline-period">{item.period}</span>
                  </div>
                  <p className="timeline-summary">{item.summary}</p>
                  <ul className="timeline-points">
                    {item.points.map((point) => <li key={point}>{renderBold(point)}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="research-section" id="research">
          <div className="container">
            <SectionHeading
              eyebrow="Research & recognition"
              title="Research backed by large-scale 3D data and reconstruction tasks."
            />
            <div className="research-list">
              {site.research.map((item, index) => (
                <article className="research-item" key={item.title}>
                  <span>0{index + 1}</span>
                  <div><h3>{item.title}</h3><p>{renderBold(item.meta)}</p></div>
                </article>
              ))}
            </div>
            <div className="honor-list">
              {site.honors.map((honor) => (
                <div className="honor-item" key={honor}><span>✦</span><p>{renderBold(honor)}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section className="about-section container" id="about">
          <SectionHeading eyebrow="About" title="3D vision grounded in surveying, geometry and engineering delivery." />
          <div className="about-grid">
            <p className="about-lead">{site.aboutZh}</p>
            <div className="capabilities">
              <div><span>01</span><p><strong>Geometry</strong>相机模型、配准、点云、Mesh 几何处理。</p></div>
              <div><span>02</span><p><strong>Learning</strong>PyTorch、PointTransformer、深度估计、新视角合成。</p></div>
              <div><span>03</span><p><strong>Engineering</strong>Python、Linux、Git、数据管线与精度验证。</p></div>
            </div>
          </div>

          <div className="education-block">
            {site.education.map((edu) => (
              <div className="education-item" key={edu.school}>
                <div className="education-main">
                  <h3>{edu.school}</h3>
                  <p>{edu.degree} · {edu.score}</p>
                  {edu.focus && <p className="education-focus">{edu.focus}</p>}
                </div>
                <span className="education-period">{edu.period}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="skills-section" id="skills">
          <div className="container">
            <SectionHeading eyebrow="Skills" title="Toolchain across geometry, learning and engineering." />
            <div className="skills-grid">
              {site.skills.map((skill) => (
                <div className="skill-item" key={skill.label}>
                  <strong>{skill.label}</strong>
                  <p>{skill.items}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="contact-section container">
          <p>Looking for a 3D reconstruction / 3D vision engineer?</p>
          <a href={`mailto:${site.email}`}>Let&apos;s talk <span>↗</span></a>
        </section>
      </main>
      <footer className="footer container">
        <span>© 2026 {site.name} · {site.email}</span>
        <span>Built with React · Three.js · GitHub Pages</span>
      </footer>
    </>
  )
}
