import Link from 'next/link';

const YEAR = new Date().getFullYear();

const LINK_COLUMNS = [
  {
    heading: 'Learn',
    links: [
      { label: 'Course catalogue', href: '/courses' },
      { label: 'CI/CD pipelines', href: '/courses?track=ci-cd' },
      { label: 'Kubernetes', href: '/courses?track=containers-kubernetes' },
      { label: 'Infrastructure as Code', href: '/courses?track=infrastructure-as-code' },
      { label: 'Observability & SRE', href: '/courses?track=observability-sre' },
    ],
  },
  {
    heading: 'Platform',
    links: [
      { label: 'Your dashboard', href: '/dashboard' },
      { label: 'Profile settings', href: '/profile' },
      { label: 'Create an account', href: '/signup' },
      { label: 'Sign in', href: '/login' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Lab command reference', href: '/courses' },
      { label: 'Quiz practice', href: '/courses' },
      { label: 'Getting started guide', href: '/' },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-brand-mark">
              <svg
                width="28"
                height="28"
                viewBox="0 0 32 32"
                role="img"
                aria-label="DevOps Academy logo"
                focusable="false"
              >
                <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M10 21 L16 9 L22 21"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M12.5 17 H19.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="footer-brand-name">DevOps Academy</span>
            </div>
            <p className="footer-tagline">
              Hands-on training for engineers shipping software with pipelines, containers,
              declarative infrastructure and service-level objectives.
            </p>
          </div>

          {LINK_COLUMNS.map((column) => (
            <nav className="footer-column" key={column.heading} aria-label={column.heading}>
              <h2 className="footer-heading">{column.heading}</h2>
              <ul className="footer-links">
                {column.links.map((link) => (
                  <li key={`${column.heading}-${link.label}`}>
                    <Link className="footer-link" href={link.href}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="footer-bottom">
          <p className="footer-note">
            API status is published at{' '}
            <a
              className="footer-link"
              href="https://devops-api.arx-app.com:4115/health"
              target="_blank"
              rel="noreferrer"
            >
              devops-api.arx-app.com/health
            </a>
            . Lesson progress syncs automatically while you are signed in.
          </p>
          <p className="footer-copyright">
            &copy; {YEAR} DevOps Academy. Built for platform and reliability engineers.
          </p>
        </div>
      </div>
    </footer>
  );
}