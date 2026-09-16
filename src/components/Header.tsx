import { Link, useLocation, useNavigate } from 'react-router-dom'
import { site } from '../data/site'
import { scrollToId } from '../utils/scroll'
import { trackAction } from '../../analytics/tracker/tracker'

const sections = [
  { id: 'work', label: 'Work' },
  { id: 'experience', label: 'Experience' },
  { id: 'research', label: 'Research' },
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
]

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const home = location.pathname === '/'

  // 在首页直接平滑滚动；在子页面先回首页再滚动到目标区块
  const goToSection = (id: string) => {
    if (home) {
      scrollToId(id)
    } else {
      navigate('/')
      // 等首页渲染后再滚动
      setTimeout(() => scrollToId(id), 80)
    }
  }

  return (
    <header className="site-header">
      <div className="container nav-inner">
        <Link className="brand" to="/" aria-label="Go to home">
          Shaw<span className="brand-dot">.</span>
        </Link>
        <nav className="nav-links" aria-label="Primary navigation">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className="nav-link-button"
              onClick={() => goToSection(section.id)}
            >
              {section.label}
            </button>
          ))}
          <a href={site.github} target="_blank" rel="noreferrer" onClick={() => trackAction('github_link')}>GitHub ↗</a>
          <a className="nav-cta" href={`mailto:${site.email}`} onClick={() => trackAction('contact_email')}>Contact</a>
        </nav>
      </div>
    </header>
  )
}
