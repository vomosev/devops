import Link from 'next/link';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import Badge from '../components/ui/Badge';

export const metadata = {
  title: 'DevOps Academy — Train on CI/CD, Kubernetes, Terraform and SRE',
  description:
    'Hands-on DevOps training tracks covering pipelines, containers, infrastructure as code and production reliability practice.',
};

const features = [
  {
    title: 'Pipelines you can actually ship',
    body: 'Build a GitHub Actions workflow from scratch: matrix builds, cached dependencies, signed artefacts and a gated production deploy with manual approval.',
    badge: 'CI/CD',
    tone: 'accent',
  },
  {
    title: 'Kubernetes without the guesswork',
    body: 'Deployments, Services, Ingress, probes, resource requests and rollout strategies — explained with the kubectl commands you will run in your own cluster.',
    badge: 'Containers',
    tone: 'success',
  },
  {
    title: 'Reliability as an engineering habit',
    body: 'Define SLIs and SLOs, budget your errors, instrument services with OpenTelemetry and run a blameless incident review that changes something.',
    badge: 'SRE',
    tone: 'warning',
  },
];

const tracks = [
  {
    slug: 'ci-cd',
    title: 'CI/CD Foundations',
    detail: 'GitHub Actions · GitLab CI · Argo CD',
  },
  {
    slug: 'containers-kubernetes',
    title: 'Containers & Kubernetes',
    detail: 'Docker · Helm · kubectl · Kustomize',
  },
  {
    slug: 'infrastructure-as-code',
    title: 'Infrastructure as Code',
    detail: 'Terraform · Ansible · Packer',
  },
  {
    slug: 'observability-sre',
    title: 'Observability & SRE',
    detail: 'Prometheus · Grafana · OpenTelemetry',
  },
];

export default function HomePage() {
  return (
    <div className="home-page stack">
      <section className="hero">
        <div className="hero-copy">
          <Badge tone="accent" size="sm">
            8 curated courses · 46 hands-on lessons
          </Badge>
          <h1>Master the DevOps toolchain, one working pipeline at a time.</h1>
          <p>
            DevOps Academy is a practical training platform for engineers who are
            responsible for delivery. Work through guided lessons on continuous
            delivery, Kubernetes, Terraform and production reliability, run the lab
            commands against your own environment, then prove it with an
            end-of-module quiz.
          </p>
          <div className="cluster hero-actions">
            <Button as="link" href="/courses" variant="primary" size="lg">
              Browse the catalogue
            </Button>
            <Button as="link" href="/signup" variant="secondary" size="lg">
              Create a free account
            </Button>
          </div>
          <p className="hero-note">
            Already learning here? <Link href="/dashboard">Open your dashboard</Link> to
            pick up where you left off.
          </p>
        </div>

        <div className="hero-art" aria-hidden="true">
          <svg
            viewBox="0 0 320 240"
            role="presentation"
            focusable="false"
            className="hero-art-svg"
          >
            <defs>
              <linearGradient id="pipelineGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--color-accent)" />
                <stop offset="100%" stopColor="var(--color-success)" />
              </linearGradient>
            </defs>
            <rect
              x="8"
              y="8"
              width="304"
              height="224"
              rx="16"
              fill="var(--color-surface-raised)"
              stroke="var(--color-border)"
            />
            <path
              d="M40 120 H92 M140 120 H188 M236 120 H284"
              stroke="url(#pipelineGradient)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="116" cy="120" r="22" fill="none" stroke="url(#pipelineGradient)" strokeWidth="4" />
            <circle cx="212" cy="120" r="22" fill="none" stroke="url(#pipelineGradient)" strokeWidth="4" />
            <rect x="26" y="106" width="28" height="28" rx="8" fill="var(--color-accent)" />
            <rect x="268" y="106" width="28" height="28" rx="8" fill="var(--color-success)" />
            <path
              d="M108 120 l6 6 l12 -14"
              fill="none"
              stroke="var(--color-text)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M204 120 l6 6 l12 -14"
              fill="none"
              stroke="var(--color-text)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="40" y="52" width="104" height="10" rx="5" fill="var(--color-border)" />
            <rect x="40" y="74" width="64" height="10" rx="5" fill="var(--color-border)" />
            <rect x="176" y="172" width="104" height="10" rx="5" fill="var(--color-border)" />
            <rect x="176" y="194" width="64" height="10" rx="5" fill="var(--color-border)" />
          </svg>
        </div>
      </section>

      <section className="home-section">
        <h2>Built for engineers who own delivery</h2>
        <p>
          Every course pairs short readable lessons with a lab command block you can
          copy straight into a terminal, so the theory never stays theoretical.
        </p>
        <div className="grid grid-3">
          {features.map((feature) => (
            <Card key={feature.title} padding="lg">
              <CardHeader>
                <Badge tone={feature.tone} size="sm">
                  {feature.badge}
                </Badge>
                <h3>{feature.title}</h3>
              </CardHeader>
              <CardBody>
                <p>{feature.body}</p>
              </CardBody>
              <CardFooter>
                <Button as="link" href="/courses" variant="ghost" size="sm">
                  See related courses
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section className="home-section">
        <h2>Four learning tracks</h2>
        <p>
          Start anywhere. Each track builds from fundamentals to production practice,
          and your progress is tracked lesson by lesson.
        </p>
        <div className="grid grid-4 track-strip">
          {tracks.map((track) => (
            <Card key={track.slug} padding="md" interactive>
              <CardBody>
                <h3 className="track-strip-title">{track.title}</h3>
                <p className="track-strip-detail">{track.detail}</p>
              </CardBody>
              <CardFooter>
                <Link href={`/courses?track=${track.slug}`}>Explore track</Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section className="home-cta">
        <Card padding="lg">
          <CardBody>
            <h2>Ready to run your first pipeline?</h2>
            <p>
              Sign up in under a minute, enrol in a course and finish your first lesson
              today. Your dashboard keeps score of completed lessons, minutes learned
              and quiz results.
            </p>
          </CardBody>
          <CardFooter>
            <div className="cluster">
              <Button as="link" href="/signup" variant="primary" size="md">
                Get started
              </Button>
              <Button as="link" href="/courses" variant="ghost" size="md">
                View all courses
              </Button>
            </div>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}