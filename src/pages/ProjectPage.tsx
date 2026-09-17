import { Link, useParams } from 'react-router-dom'
import { Header } from '../components/Header'
import { VisitCounter } from '../components/VisitCounter'
import { projects } from '../data/projects'
import { MiniScene } from '../three/MiniScene'
import { ModelViewer } from '../three/ModelViewer'
import { renderBold } from '../utils/richText'

export function ProjectPage() {
  const { slug } = useParams()
  const project = projects.find((item) => item.slug === slug)

  if (!project) {
    return (
      <>
        <Header />
        <main className="container not-found">
          <span>404</span>
          <h1>Project not found.</h1>
          <Link className="button primary" to="/">Back home</Link>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="project-page container">
        <Link className="back-link" to="/">← Back to selected work</Link>
        <header className="project-hero">
          <div>
            <div className="project-meta"><span>{project.index}</span><span>{project.year}</span></div>
            <h1>{project.title}</h1>
            <p className="project-page-subtitle">{project.subtitle}</p>
            <p className="project-page-summary">{project.summary}</p>
            <div className="tag-row">{project.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
          </div>
          <div className="project-demo-large">
            {project.model ? (
              <ModelViewer demoType={project.demoType} src={project.model} />
            ) : (
              <>
                <MiniScene variant={project.demoType} />
                <span className="placeholder-note">Procedural placeholder · replace with your real/public asset</span>
              </>
            )}
          </div>
        </header>

        <section className="metric-grid">
          {project.metrics.map((metric) => (
            <div key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span></div>
          ))}
        </section>

        {project.gallery && (
          <section className={`project-gallery${project.slug === 'structured-light-scanning' ? ' project-gallery--paired' : ''}`}>
            {project.gallery.map((item) => (
              <figure key={item.src}>
                {item.type === 'video' ? (
                  <video src={item.src} muted loop autoPlay playsInline controls />
                ) : (
                  <img src={item.src} alt={item.caption ?? project.title} loading="lazy" />
                )}
                {item.caption && <figcaption>{item.caption}</figcaption>}
              </figure>
            ))}
          </section>
        )}

        {project.specs && (
          <section className="spec-section">
            {project.specs.title && <h2 className="spec-title">{project.specs.title}</h2>}
            <div className="spec-table">
              {project.specs.rows.map((row) => (
                <div className="spec-row" key={row.label}>
                  <div className="spec-label">{row.label}</div>
                  <div className="spec-value">{row.value}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="project-detail-grid">
          {(() => {
            let n = 0
            const num = () => String(++n).padStart(2, '0')
            return (
              <>
                {project.overview && (
                  <>
                    <div className="detail-title"><span>{num()}</span><h2>Overview</h2></div>
                    <div className="detail-copy">
                      {project.overview.map((para) => <p key={para}>{renderBold(para)}</p>)}
                    </div>
                  </>
                )}

                <div className="detail-title"><span>{num()}</span><h2>Problem</h2></div>
                <p className="detail-copy">{renderBold(project.problem)}</p>

                <div className="detail-title"><span>{num()}</span><h2>My contribution</h2></div>
                <div className="detail-copy">
                  <ul>{project.contribution.map((item) => <li key={item}>{renderBold(item)}</li>)}</ul>
                </div>

                <div className="detail-title"><span>{num()}</span><h2>Pipeline</h2></div>
                <div className="detail-copy pipeline">
                  {project.pipeline.map((step, index) => (
                    <div className="pipeline-step" key={step}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <strong>{step}</strong>
                      {index < project.pipeline.length - 1 && <b>→</b>}
                    </div>
                  ))}
                </div>

                {project.techDetails && (
                  <>
                    <div className="detail-title"><span>{num()}</span><h2>Technical details</h2></div>
                    <div className="detail-copy">
                      {project.techDetails.map((para) => <p key={para}>{renderBold(para)}</p>)}
                    </div>
                  </>
                )}

                {project.results && (
                  <>
                    <div className="detail-title"><span>{num()}</span><h2>Results &amp; impact</h2></div>
                    <div className="detail-copy">
                      <ul>{project.results.map((item) => <li key={item}>{renderBold(item)}</li>)}</ul>
                    </div>
                  </>
                )}
              </>
            )
          })()}
        </section>
      </main>
      <footer className="footer container">
        <span>© 2026 Chen Yunxiao</span>
        <span className="footer-meta"><VisitCounter /><Link to="/">Back home ↑</Link></span>
      </footer>
    </>
  )
}
