import { Link } from 'react-router-dom'
import type { Project } from '../types/project'
import { MiniScene } from '../three/MiniScene'
import { ModelViewer } from '../three/ModelViewer'

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="project-card">
      <div className="project-visual" aria-label={`${project.title} project preview`}>
        {project.cover ? (
          <img
            className="project-cover"
            src={project.cover}
            alt={`${project.title} project overview`}
            loading="lazy"
          />
        ) : project.model ? (
          <ModelViewer demoType={project.demoType} src={project.model} />
        ) : (
          <MiniScene variant={project.demoType} />
        )}
        {!project.cover && <span className="demo-badge">Interactive preview</span>}
      </div>
      <div className="project-body">
        <div className="project-card-topline">
          <span>{project.index}</span>
          <span>{project.year}</span>
        </div>
        <h3>{project.title}</h3>
        <p className="project-subtitle">{project.subtitle}</p>
        <p className="project-summary">{project.summary}</p>
        <div className="metric-row">
          {project.metrics.slice(0, 2).map((metric) => (
            <div className="metric" key={metric.label}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>
        <div className="tag-row">
          {project.tags.slice(0, 4).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
        </div>
        <Link className="text-link" to={`/projects/${project.slug}`}>
          View project <span aria-hidden>→</span>
        </Link>
      </div>
    </article>
  )
}
