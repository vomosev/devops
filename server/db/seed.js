/**
 * server/db/seed.js
 *
 * Standalone seeding script for the DevOps Academy platform.
 *
 *   node server/db/seed.js
 *
 * - Loads environment variables from .env
 * - Applies schema.sql (CREATE TABLE IF NOT EXISTS ...)
 * - Inserts realistic DevOps sample content (tracks, courses, lessons, quizzes)
 * - Creates a demo learner account with enrollments and progress
 *
 * The script is idempotent: re-running it will not duplicate rows.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const { pool } = require('../config/db');

const SCHEMA_PATH = path.join(__dirname, '..', '..', 'schema.sql');

const DEMO_USER = {
  name: 'Dana Ops',
  email: 'demo@devops.training',
  password: 'DevOpsDemo123!',
  job_title: 'Platform Engineer',
  role: 'learner',
};

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

const TRACKS = [
  {
    slug: 'ci-cd',
    title: 'CI/CD',
    description:
      'Design, build and harden continuous integration and delivery pipelines that ship safely many times a day.',
    color_token: '--color-accent',
  },
  {
    slug: 'containers-kubernetes',
    title: 'Containers & Kubernetes',
    description:
      'Package workloads with Docker and operate them reliably on Kubernetes in production.',
    color_token: '--color-success',
  },
  {
    slug: 'infrastructure-as-code',
    title: 'Infrastructure as Code',
    description:
      'Describe, version and review your infrastructure with Terraform, Ansible and policy as code.',
    color_token: '--color-warning',
  },
  {
    slug: 'observability-sre',
    title: 'Observability & SRE',
    description:
      'Instrument systems, define SLOs and run incident response like a site reliability engineer.',
    color_token: '--color-danger',
  },
];

const COURSES = [
  {
    slug: 'ci-cd-foundations',
    track: 'ci-cd',
    title: 'CI/CD Foundations with GitHub Actions',
    summary:
      'Go from a bare repository to an automated build, test and deploy pipeline using GitHub Actions.',
    description:
      'This course walks through the anatomy of a continuous integration pipeline: triggers, jobs, runners, caching, artifacts and deployment gates. You will build a working workflow for a Node.js service, add unit tests and linting, cache dependencies, publish build artifacts and finally deploy to a staging environment behind a manual approval.',
    level: 'beginner',
    duration_minutes: 180,
    tools: 'GitHub Actions, Node.js, Docker, Bash',
    lessons: [
      {
        title: 'Why continuous integration matters',
        content: `## The cost of long-lived branches

Teams that integrate once a week spend most of their time resolving merge conflicts instead of shipping value. Continuous integration is the practice of merging every engineer's work into a shared trunk **at least daily**, with an automated build and test suite proving the trunk stays green.

### What a CI pipeline gives you

- Fast, objective feedback on every commit
- A reproducible build that does not depend on a laptop
- A gate that blocks broken code from reaching main
- An audit trail of what was built, when, and from which commit

### The four stages

1. **Trigger** — a push, pull request or schedule
2. **Build** — install dependencies and compile
3. **Verify** — lint, unit test, security scan
4. **Publish** — produce an artifact or container image

A healthy pipeline finishes in under ten minutes. Anything slower and engineers start context switching, which defeats the purpose.`,
        estimated_minutes: 20,
        lab_command: 'git checkout -b feature/ci-pipeline && git push -u origin feature/ci-pipeline',
      },
      {
        title: 'Your first GitHub Actions workflow',
        content: `## Workflow anatomy

Workflows live in \`.github/workflows/\` and are plain YAML.

\`\`\`yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm test
\`\`\`

### Key concepts

- **Job** — a set of steps running on one runner, isolated from other jobs
- **Step** — a shell command (\`run\`) or a reusable action (\`uses\`)
- **Runner** — the VM or container executing the job

Jobs run in parallel by default. Use \`needs:\` to express ordering.`,
        estimated_minutes: 30,
        lab_command: 'mkdir -p .github/workflows && touch .github/workflows/ci.yml',
      },
      {
        title: 'Caching, matrices and build speed',
        content: `## Make the pipeline fast

### Dependency caching

\`actions/setup-node\` with \`cache: 'npm'\` restores \`~/.npm\` keyed on your lockfile hash. A cold install of 800 packages can take 90 seconds; a warm cache takes 8.

### Test matrices

\`\`\`yaml
strategy:
  fail-fast: false
  matrix:
    node: [18, 20, 22]
\`\`\`

This fans out the same job across three Node versions. \`fail-fast: false\` keeps the remaining legs running so you see every failure in one go.

### Budget your time

Measure with the timing view in the Actions UI. Split slow suites into parallel shards before reaching for bigger runners.`,
        estimated_minutes: 25,
        lab_command: 'act -j build --container-architecture linux/amd64',
      },
      {
        title: 'Artifacts, images and deployment gates',
        content: `## Build once, promote many times

Never rebuild between environments. Build a single immutable artifact, then promote it.

\`\`\`yaml
  publish:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      packages: write
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t ghcr.io/acme/api:\${{ github.sha }} .
      - run: docker push ghcr.io/acme/api:\${{ github.sha }}
\`\`\`

### Environments and approvals

Declare an \`environment: production\` on the deploy job and attach required reviewers in repository settings. The job pauses until a human approves, giving you a change gate without leaving the pipeline.

### Secrets

Use \`\${{ secrets.NAME }}\`. Never echo a secret; GitHub masks known values but a base64 round trip defeats masking.`,
        estimated_minutes: 30,
        lab_command: 'docker build -t acme/api:$(git rev-parse --short HEAD) .',
      },
      {
        title: 'Pipeline security and least privilege',
        content: `## Treat the pipeline as production

CI runners have credentials to your registry, cloud account and package repositories. Attackers know this.

### Hardening checklist

- Pin actions to a full commit SHA, not a floating tag
- Set \`permissions:\` explicitly at workflow level, default to \`contents: read\`
- Prefer OIDC federation over long-lived cloud keys
- Never run untrusted pull request code with secrets (\`pull_request_target\` is dangerous)
- Scan dependencies and images on every build

\`\`\`yaml
permissions:
  contents: read
  id-token: write
\`\`\`

That \`id-token\` scope is what lets the runner exchange a short-lived OIDC token for cloud credentials.`,
        estimated_minutes: 25,
        lab_command: 'gh api repos/:owner/:repo/actions/permissions',
      },
    ],
    quiz: {
      title: 'CI/CD Foundations check',
      pass_score: 70,
      questions: [
        {
          prompt: 'Where must GitHub Actions workflow files live in a repository?',
          explanation:
            'GitHub only discovers workflows stored as YAML files inside the .github/workflows/ directory at the repository root.',
          options: [
            { label: '.github/workflows/', correct: true },
            { label: 'ci/ at the repository root', correct: false },
            { label: 'Anywhere, as long as the file ends in .yml', correct: false },
            { label: '.circleci/config.yml', correct: false },
          ],
        },
        {
          prompt: 'What is the main benefit of building an artifact once and promoting it?',
          explanation:
            'Rebuilding per environment can produce different binaries. One immutable artifact guarantees that what you tested is exactly what you ship.',
          options: [
            { label: 'It guarantees the tested artifact is the deployed artifact', correct: true },
            { label: 'It removes the need for unit tests', correct: false },
            { label: 'It makes the container image smaller', correct: false },
            { label: 'It allows secrets to be embedded safely', correct: false },
          ],
        },
        {
          prompt: 'Which strategy setting keeps all matrix legs running after one fails?',
          explanation:
            'fail-fast defaults to true, cancelling siblings on first failure. Setting it to false surfaces every failing combination in a single run.',
          options: [
            { label: 'fail-fast: false', correct: true },
            { label: 'continue-on-error: true at workflow level', correct: false },
            { label: 'max-parallel: 1', correct: false },
            { label: 'if: always() on the job', correct: false },
          ],
        },
        {
          prompt: 'Why pin third-party actions to a commit SHA instead of a tag?',
          explanation:
            'Tags are mutable. A compromised maintainer can repoint v3 at malicious code; a SHA is immutable and cannot be re-targeted.',
          options: [
            { label: 'Tags are mutable and can be repointed at malicious code', correct: true },
            { label: 'SHAs make workflows run faster', correct: false },
            { label: 'GitHub charges less for SHA-pinned actions', correct: false },
            { label: 'Tags do not work in private repositories', correct: false },
          ],
        },
        {
          prompt: 'Roughly how long should a healthy CI pipeline take for a typical service?',
          explanation:
            'Under ten minutes keeps engineers in flow. Beyond that people context switch and stop watching their builds.',
          options: [
            { label: 'Under ten minutes', correct: true },
            { label: 'Around one hour', correct: false },
            { label: 'Overnight, as a nightly batch', correct: false },
            { label: 'It does not matter as long as it passes', correct: false },
          ],
        },
      ],
    },
  },

  {
    slug: 'advanced-delivery-pipelines',
    track: 'ci-cd',
    title: 'Advanced Delivery: Progressive Rollouts',
    summary:
      'Blue/green, canary and feature-flag driven releases with automated rollback and deployment metrics.',
    description:
      'Continuous delivery does not stop at a green build. This course covers deployment strategies that decouple release from deploy: blue/green swaps, canary analysis driven by real metrics, feature flags for dark launches, and automated rollback policies. You will also learn how to measure the four DORA metrics and use them to steer engineering investment.',
    level: 'advanced',
    duration_minutes: 210,
    tools: 'Argo Rollouts, Flagger, LaunchDarkly, Prometheus',
    lessons: [
      {
        title: 'Decoupling deploy from release',
        content: `## Two different events

**Deploy** puts new code on a server. **Release** exposes it to users. Conflating the two means every deploy is a risk event.

Separating them unlocks:

- Dark launches — code running in production, serving nobody
- Ring-based rollout — internal users, then 1%, then everyone
- Instant rollback by flipping a flag rather than redeploying

### Flag hygiene

Every flag is technical debt. Give each one an owner and an expiry date, and delete it once the rollout is complete.`,
        estimated_minutes: 25,
        lab_command: 'kubectl get rollouts -A',
      },
      {
        title: 'Blue/green deployments',
        content: `## Two identical environments

Blue serves traffic. Green receives the new version. You smoke test green, then swap the load balancer or Service selector.

\`\`\`bash
kubectl patch service api -p '{"spec":{"selector":{"version":"green"}}}'
\`\`\`

### Trade-offs

| Benefit | Cost |
| --- | --- |
| Instant rollback (swap back) | Double the infrastructure during the swap |
| Simple mental model | Database migrations must be backward compatible |

Always make schema changes **expand then contract**: add the new column, dual-write, backfill, switch reads, only then drop the old column.`,
        estimated_minutes: 30,
        lab_command: 'kubectl rollout status deployment/api --timeout=120s',
      },
      {
        title: 'Canary releases and automated analysis',
        content: `## Let metrics decide

A canary shifts a small slice of traffic to the new version and compares golden signals against the baseline.

\`\`\`yaml
analysis:
  templates:
    - templateName: success-rate
  args:
    - name: service
      value: api
\`\`\`

### A usable analysis template

- Success rate over 5 minutes must stay above 99%
- p95 latency must stay within 20% of baseline
- Error budget burn rate must stay below 2x

If any check fails, the controller aborts and scales the canary back to zero — no human paged, no incident.`,
        estimated_minutes: 35,
        lab_command: 'kubectl argo rollouts get rollout api --watch',
      },
      {
        title: 'Automated rollback and DORA metrics',
        content: `## Measure what matters

The four DORA metrics:

1. **Deployment frequency** — how often you ship to production
2. **Lead time for changes** — commit to production
3. **Change failure rate** — percent of deploys causing degradation
4. **Mean time to restore** — how quickly you recover

Elite performers deploy on demand, with lead times under an hour and MTTR under an hour. Crucially, speed and stability rise together — teams that deploy more often fail less.

### Instrument the pipeline

Emit an event on every deploy with the commit SHA, environment and outcome. Store them; the metrics fall out of a simple query.`,
        estimated_minutes: 30,
        lab_command: 'kubectl argo rollouts abort api && kubectl argo rollouts undo api',
      },
    ],
    quiz: {
      title: 'Progressive delivery check',
      pass_score: 70,
      questions: [
        {
          prompt: 'What distinguishes a deploy from a release?',
          explanation:
            'Deploying places code on infrastructure; releasing exposes it to users. Feature flags are the usual mechanism for separating them.',
          options: [
            { label: 'A deploy ships code; a release exposes it to users', correct: true },
            { label: 'They are two words for the same event', correct: false },
            { label: 'A release only happens in staging', correct: false },
            { label: 'A deploy requires downtime, a release does not', correct: false },
          ],
        },
        {
          prompt: 'Which database migration pattern is safe for blue/green deployments?',
          explanation:
            'Expand-then-contract keeps the schema compatible with both versions during the swap, so rollback stays possible.',
          options: [
            { label: 'Expand then contract', correct: true },
            { label: 'Drop and recreate the table', correct: false },
            { label: 'Rename columns in place during the swap', correct: false },
            { label: 'Lock the table until the swap completes', correct: false },
          ],
        },
        {
          prompt: 'What triggers an automated canary rollback?',
          explanation:
            'The analysis step compares live metrics such as success rate and latency against thresholds; breaching them aborts the rollout.',
          options: [
            { label: 'Metric thresholds breached during analysis', correct: true },
            { label: 'A fixed timer expiring', correct: false },
            { label: 'A new commit landing on main', correct: false },
            { label: 'The container image exceeding a size limit', correct: false },
          ],
        },
        {
          prompt: 'Which of these is NOT one of the four DORA metrics?',
          explanation:
            'Lines of code is a vanity metric. DORA tracks deployment frequency, lead time, change failure rate and time to restore.',
          options: [
            { label: 'Lines of code written per sprint', correct: true },
            { label: 'Deployment frequency', correct: false },
            { label: 'Change failure rate', correct: false },
            { label: 'Mean time to restore', correct: false },
          ],
        },
      ],
    },
  },

  {
    slug: 'docker-deep-dive',
    track: 'containers-kubernetes',
    title: 'Docker Deep Dive: Images That Behave',
    summary:
      'Build small, reproducible, secure container images with multi-stage builds, layer caching and non-root users.',
    description:
      'Containers are only as good as the images you build. This course explains the union filesystem, layer caching rules, multi-stage builds, distroless base images, build arguments versus runtime environment, healthchecks, signal handling and image scanning. By the end you will cut a typical Node image from 1.1GB to under 150MB.',
    level: 'beginner',
    duration_minutes: 160,
    tools: 'Docker, BuildKit, Trivy, distroless',
    lessons: [
      {
        title: 'Images, layers and the union filesystem',
        content: `## What an image really is

An image is an ordered stack of read-only layers plus a JSON manifest. Each Dockerfile instruction that changes the filesystem creates a layer. At run time the engine adds a thin writable layer on top.

\`\`\`bash
docker history node:20-alpine
\`\`\`

### Cache invalidation rules

Docker reuses a cached layer only if the instruction **and** every preceding layer are unchanged. Therefore:

- Copy your lockfile and install dependencies **before** copying source code
- Put the most frequently changing instructions last
- Use \`.dockerignore\` so a stray \`node_modules\` does not bust the cache`,
        estimated_minutes: 25,
        lab_command: 'docker build --progress=plain -t demo:cache .',
      },
      {
        title: 'Multi-stage builds',
        content: `## Ship the output, not the toolchain

\`\`\`dockerfile
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "dist/index.js"]
\`\`\`

The compiler, dev dependencies and source tree never reach the final image. Target a specific stage with \`--target build\` when you need to debug.`,
        estimated_minutes: 30,
        lab_command: 'docker build --target runtime -t demo:slim . && docker images demo',
      },
      {
        title: 'Running as non-root and handling signals',
        content: `## Least privilege in a container

By default a container runs as root. A container escape then becomes a host compromise.

\`\`\`dockerfile
RUN addgroup -S app && adduser -S app -G app
USER app
\`\`\`

### PID 1 and graceful shutdown

Use the exec form of \`CMD\` (\`["node","server.js"]\`) so your process is PID 1 and receives \`SIGTERM\` directly. The shell form wraps it in \`/bin/sh -c\`, which swallows signals and turns every stop into a ten second kill.

Handle the signal:

\`\`\`js
process.on('SIGTERM', () => server.close(() => process.exit(0)));
\`\`\``,
        estimated_minutes: 25,
        lab_command: 'docker run --rm -d --name demo demo:slim && docker stop -t 30 demo',
      },
      {
        title: 'Healthchecks, scanning and supply chain',
        content: `## Prove the container is actually working

\`\`\`dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \\
  CMD wget -qO- http://localhost:3000/health || exit 1
\`\`\`

### Scan every build

\`\`\`bash
trivy image --severity HIGH,CRITICAL --exit-code 1 demo:slim
\`\`\`

Fail the pipeline on high severity findings, but allow a documented, time-boxed exception file so the gate does not get disabled wholesale.

### Provenance

Sign images and record an SBOM so you can answer "are we affected?" within minutes of the next CVE announcement.`,
        estimated_minutes: 25,
        lab_command: 'trivy image --severity HIGH,CRITICAL demo:slim',
      },
    ],
    quiz: {
      title: 'Docker image mastery check',
      pass_score: 70,
      questions: [
        {
          prompt: 'Why copy package.json and run install before copying application source?',
          explanation:
            'Source changes on nearly every commit. Installing first keeps the expensive dependency layer cached until the lockfile actually changes.',
          options: [
            { label: 'It preserves the dependency layer in the build cache', correct: true },
            { label: 'Docker requires package.json to be the first COPY', correct: false },
            { label: 'It reduces the number of layers to one', correct: false },
            { label: 'It prevents secrets from leaking', correct: false },
          ],
        },
        {
          prompt: 'What is the main benefit of a multi-stage build?',
          explanation:
            'Build tooling and dev dependencies stay in the build stage; only the compiled output is copied into the small runtime image.',
          options: [
            { label: 'Build tooling is excluded from the final image', correct: true },
            { label: 'It makes builds run in parallel automatically', correct: false },
            { label: 'It removes the need for a .dockerignore file', correct: false },
            { label: 'It encrypts the image layers', correct: false },
          ],
        },
        {
          prompt: 'Why should CMD use the exec form rather than the shell form?',
          explanation:
            'The shell form runs your process as a child of /bin/sh, which does not forward SIGTERM, so graceful shutdown never happens.',
          options: [
            { label: 'So the application is PID 1 and receives SIGTERM', correct: true },
            { label: 'Because the shell form is not supported on Alpine', correct: false },
            { label: 'It reduces image size', correct: false },
            { label: 'It enables layer caching for CMD', correct: false },
          ],
        },
        {
          prompt: 'What does a Dockerfile HEALTHCHECK instruction do?',
          explanation:
            'It defines a command the engine runs periodically; its exit status marks the container healthy, unhealthy or starting.',
          options: [
            { label: 'Periodically runs a command to report container health', correct: true },
            { label: 'Restarts the container on any error log line', correct: false },
            { label: 'Scans the image for vulnerabilities at build time', correct: false },
            { label: 'Validates the Dockerfile syntax', correct: false },
          ],
        },
      ],
    },
  },

  {
    slug: 'kubernetes-in-production',
    track: 'containers-kubernetes',
    title: 'Kubernetes in Production',
    summary:
      'Workloads, networking, config, probes, autoscaling and the failure modes that page you at 3am.',
    description:
      'A practical operator-focused tour of Kubernetes: the control loop model, Deployments and StatefulSets, Services and Ingress, ConfigMaps and Secrets, resource requests and limits, liveness and readiness probes, horizontal autoscaling, PodDisruptionBudgets and a field guide to CrashLoopBackOff, OOMKilled and ImagePullBackOff.',
    level: 'intermediate',
    duration_minutes: 260,
    tools: 'Kubernetes, kubectl, Helm, HPA',
    lessons: [
      {
        title: 'The control loop and desired state',
        content: `## Declare, do not command

You submit a desired state; controllers reconcile reality toward it, forever.

\`\`\`bash
kubectl apply -f deployment.yaml
kubectl get deploy api -o wide
\`\`\`

### Objects you will touch daily

- **Pod** — the scheduling unit, one or more containers sharing a network namespace
- **ReplicaSet** — keeps N pods running
- **Deployment** — manages ReplicaSets to give you rolling updates
- **Service** — a stable virtual IP and DNS name in front of pods

Never create bare pods in production; nothing will recreate them.`,
        estimated_minutes: 30,
        lab_command: 'kubectl create deployment web --image=nginx:1.27 --replicas=3',
      },
      {
        title: 'Services, DNS and Ingress',
        content: `## Getting traffic to a pod

| Type | Use |
| --- | --- |
| ClusterIP | Internal service-to-service (default) |
| NodePort | Debugging or bare metal front door |
| LoadBalancer | Cloud provisioned external IP |

Every Service gets DNS at \`<svc>.<namespace>.svc.cluster.local\`.

### Ingress

An Ingress is routing rules; an ingress controller (nginx, Traefik, Envoy) implements them.

\`\`\`yaml
rules:
  - host: api.example.com
    http:
      paths:
        - path: /
          pathType: Prefix
          backend:
            service:
              name: api
              port:
                number: 80
\`\`\``,
        estimated_minutes: 35,
        lab_command: 'kubectl run tmp --rm -it --image=busybox:1.36 -- nslookup api.default.svc.cluster.local',
      },
      {
        title: 'Probes, requests and limits',
        content: `## Tell the scheduler the truth

\`\`\`yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    memory: 256Mi
\`\`\`

**Requests** drive scheduling and are guaranteed. **Limits** are a ceiling. Exceed a memory limit and the kernel OOMKills the container; exceed CPU and you are throttled, not killed. Many teams deliberately omit CPU limits to avoid latency spikes from throttling.

### Probe semantics

- **readiness** — should this pod receive traffic? Failing removes it from the Service endpoints.
- **liveness** — is this pod wedged? Failing restarts the container.
- **startup** — protects slow boots from the liveness probe.

Point liveness at something cheap. If it calls the database, a database blip restarts your whole fleet.`,
        estimated_minutes: 40,
        lab_command: 'kubectl describe pod -l app=api | grep -A5 Liveness',
      },
      {
        title: 'Config, secrets and the twelve-factor pod',
        content: `## Configuration belongs outside the image

\`\`\`bash
kubectl create configmap api-config --from-literal=LOG_LEVEL=info
kubectl create secret generic api-db --from-literal=DB_PASSWORD='change-me'
\`\`\`

Mount them as environment variables or files:

\`\`\`yaml
envFrom:
  - configMapRef:
      name: api-config
  - secretRef:
      name: api-db
\`\`\`

### Important caveat

Secrets are only base64-encoded at rest by default. Enable encryption at rest, restrict RBAC, and prefer an external manager (Vault, cloud KMS, External Secrets Operator) for anything sensitive.

Changing a ConfigMap does **not** restart pods. Roll them yourself or use a checksum annotation on the pod template.`,
        estimated_minutes: 30,
        lab_command: 'kubectl rollout restart deployment/api',
      },
      {
        title: 'Autoscaling and disruption budgets',
        content: `## Scale with demand, survive maintenance

\`\`\`bash
kubectl autoscale deployment api --cpu-percent=70 --min=3 --max=20
\`\`\`

The HPA reads metrics every 15 seconds and adjusts replicas. Scale-up is fast, scale-down is deliberately slow (a 5 minute stabilisation window) to avoid flapping.

### PodDisruptionBudget

\`\`\`yaml
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: api
\`\`\`

A PDB blocks *voluntary* disruptions — node drains, cluster upgrades — from taking you below the threshold. It does not protect against node failure; that is what multiple replicas and topology spread constraints are for.`,
        estimated_minutes: 35,
        lab_command: 'kubectl get hpa,pdb -n default',
      },
      {
        title: 'Debugging: a field guide',
        content: `## The four states that page you

### CrashLoopBackOff
The container starts and exits repeatedly. Read the *previous* container logs:

\`\`\`bash
kubectl logs api-6d9f -p
\`\`\`

Usual causes: bad config, missing env var, failing migration on boot.

### OOMKilled
\`kubectl describe pod\` shows \`Reason: OOMKilled\`. Raise the memory limit or fix the leak — do not raise the limit blindly.

### ImagePullBackOff
Wrong tag, private registry without an imagePullSecret, or rate limiting.

### Pending
No node satisfies the request. Check \`kubectl describe pod\` events for insufficient cpu/memory or unsatisfied node selectors and taints.`,
        estimated_minutes: 35,
        lab_command: 'kubectl get events --sort-by=.lastTimestamp | tail -20',
      },
    ],
    quiz: {
      title: 'Kubernetes operations check',
      pass_score: 70,
      questions: [
        {
          prompt: 'What happens when a container exceeds its memory limit?',
          explanation:
            'Memory is incompressible. The kernel OOM killer terminates the container and kubelet reports OOMKilled; the pod then restarts per its policy.',
          options: [
            { label: 'The container is OOMKilled and restarted', correct: true },
            { label: 'It is throttled until memory frees up', correct: false },
            { label: 'The pod is evicted to another node automatically', correct: false },
            { label: 'Nothing; limits are advisory', correct: false },
          ],
        },
        {
          prompt: 'What does a failing readiness probe do?',
          explanation:
            'A failing readiness probe removes the pod from Service endpoints so it stops receiving traffic, but the container is not restarted.',
          options: [
            { label: 'Removes the pod from Service endpoints', correct: true },
            { label: 'Restarts the container immediately', correct: false },
            { label: 'Deletes the pod and schedules a replacement', correct: false },
            { label: 'Triggers the horizontal pod autoscaler', correct: false },
          ],
        },
        {
          prompt: 'Which resource field influences scheduling decisions?',
          explanation:
            'The scheduler places pods based on requests, finding a node with enough allocatable capacity. Limits are enforced at runtime by the kubelet and kernel.',
          options: [
            { label: 'resources.requests', correct: true },
            { label: 'resources.limits', correct: false },
            { label: 'The container image size', correct: false },
            { label: 'The liveness probe period', correct: false },
          ],
        },
        {
          prompt: 'A PodDisruptionBudget protects against which kind of disruption?',
          explanation:
            'PDBs only govern voluntary disruptions such as node drains and upgrades. Hardware failure is involuntary and ignores the budget.',
          options: [
            { label: 'Voluntary disruptions like node drains', correct: true },
            { label: 'Node hardware failure', correct: false },
            { label: 'Application crashes', correct: false },
            { label: 'Network partitions', correct: false },
          ],
        },
        {
          prompt: 'A pod is stuck in Pending. What is the most likely cause?',
          explanation:
            'Pending means the scheduler cannot place the pod — usually insufficient allocatable resources, or node selectors/taints that no node satisfies.',
          options: [
            { label: 'No node satisfies its resource requests or selectors', correct: true },
            { label: 'The liveness probe is failing', correct: false },
            { label: 'The image entrypoint exits immediately', correct: false },
            { label: 'The Service has no endpoints', correct: false },
          ],
        },
      ],
    },
  },

  {
    slug: 'terraform-essentials',
    track: 'infrastructure-as-code',
    title: 'Terraform Essentials',
    summary:
      'Providers, state, modules, plans and safe collaboration on shared cloud infrastructure.',
    description:
      'Learn Terraform the way teams actually use it: remote state with locking, reading a plan properly, writing reusable modules with sensible variable and output contracts, managing workspaces and environments, importing existing resources, and avoiding the classic footguns of count versus for_each and implicit dependencies.',
    level: 'beginner',
    duration_minutes: 200,
    tools: 'Terraform, AWS, S3 backend, tflint',
    lessons: [
      {
        title: 'Declarative infrastructure and the plan',
        content: `## The core loop

\`\`\`bash
terraform init      # download providers, configure backend
terraform plan      # diff desired vs actual
terraform apply     # reconcile
\`\`\`

### Read the plan symbols

- \`+\` create
- \`-\` destroy
- \`~\` update in place
- \`-/+\` **replace** — destroy then create, the dangerous one

Always save the plan and apply exactly that file, so nothing changes between review and execution:

\`\`\`bash
terraform plan -out=tfplan
terraform apply tfplan
\`\`\``,
        estimated_minutes: 30,
        lab_command: 'terraform init && terraform plan -out=tfplan',
      },
      {
        title: 'State: the thing that will hurt you',
        content: `## What state is for

State maps your configuration to real resource IDs and caches attributes. Without it Terraform cannot tell "create a new bucket" from "this bucket already exists".

### Rules

1. **Never** commit \`terraform.tfstate\` — it contains secrets in plaintext
2. Use a remote backend with locking

\`\`\`hcl
terraform {
  backend "s3" {
    bucket         = "acme-tfstate"
    key            = "prod/network.tfstate"
    region         = "eu-west-1"
    dynamodb_table = "tf-locks"
    encrypt        = true
  }
}
\`\`\`

3. Split state per environment and per blast radius. One giant state file means one typo can destroy production.
4. Repair drift with \`terraform state mv\`, \`rm\` and \`import\` — never hand-edit the JSON.`,
        estimated_minutes: 35,
        lab_command: 'terraform state list && terraform state show aws_s3_bucket.assets',
      },
      {
        title: 'Modules and composition',
        content: `## A module is just a directory

\`\`\`hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.8.1"

  name = "prod"
  cidr = "10.0.0.0/16"
  azs  = ["eu-west-1a", "eu-west-1b"]
}
\`\`\`

### Designing a good module

- Inputs are **variables** with types, descriptions and validation
- Outputs expose only what callers need
- Pin the version; never track a branch
- Keep modules narrow — a module that provisions "everything" cannot be reused

\`\`\`hcl
variable "instance_count" {
  type        = number
  description = "Number of app instances"
  validation {
    condition     = var.instance_count > 0
    error_message = "instance_count must be positive."
  }
}
\`\`\``,
        estimated_minutes: 35,
        lab_command: 'terraform fmt -recursive && terraform validate',
      },
      {
        title: 'count vs for_each and dependencies',
        content: `## Why your plan wants to destroy everything

\`count\` indexes resources by position. Remove the first element of a list and every subsequent resource is re-indexed, so Terraform destroys and recreates them all.

\`for_each\` keys by a stable map key instead:

\`\`\`hcl
resource "aws_iam_user" "team" {
  for_each = toset(["ana", "bo", "chi"])
  name     = each.value
}
\`\`\`

Use \`count\` only for a simple on/off toggle.

### Dependencies

Terraform infers order from references. Only reach for \`depends_on\` when the relationship is real but not expressed in code — for example an IAM policy that must exist before an instance boots and uses it.`,
        estimated_minutes: 30,
        lab_command: 'terraform plan -target=module.vpc',
      },
      {
        title: 'Terraform in CI',
        content: `## Automate the review

A solid pipeline:

1. \`terraform fmt -check\` — style gate
2. \`terraform validate\` — syntax and types
3. \`tflint\` and \`tfsec\` — lint and security policy
4. \`terraform plan -out=tfplan\` on pull request, plan posted as a comment
5. \`terraform apply tfplan\` on merge, behind an environment approval

### Credentials

Use OIDC federation from the CI provider to assume a role. Long-lived access keys in CI secrets are the most commonly leaked cloud credential.

Set \`TF_IN_AUTOMATION=1\` to trim interactive hints from the output.`,
        estimated_minutes: 30,
        lab_command: 'TF_IN_AUTOMATION=1 terraform apply -auto-approve tfplan',
      },
    ],
    quiz: {
      title: 'Terraform essentials check',
      pass_score: 70,
      questions: [
        {
          prompt: 'Why must terraform.tfstate never be committed to git?',
          explanation:
            'State stores resource attributes verbatim, including passwords and keys, and offers no locking in git, which invites corruption.',
          options: [
            { label: 'It contains secrets in plaintext and cannot be locked', correct: true },
            { label: 'It is too large for git', correct: false },
            { label: 'Terraform regenerates it on every run anyway', correct: false },
            { label: 'It is a binary format', correct: false },
          ],
        },
        {
          prompt: 'What does a "-/+" in a plan indicate?',
          explanation:
            'A forced replacement: the resource will be destroyed and recreated because an immutable attribute changed.',
          options: [
            { label: 'The resource will be destroyed and recreated', correct: true },
            { label: 'The resource will be updated in place', correct: false },
            { label: 'The resource is being moved between modules', correct: false },
            { label: 'The resource will be ignored this run', correct: false },
          ],
        },
        {
          prompt: 'Why prefer for_each over count for a set of named resources?',
          explanation:
            'count keys by list index, so removing an element re-indexes and recreates the rest. for_each keys by a stable identifier.',
          options: [
            { label: 'for_each keys resources stably so removals do not recreate others', correct: true },
            { label: 'count is deprecated in Terraform 1.x', correct: false },
            { label: 'for_each runs the resources in parallel', correct: false },
            { label: 'count cannot be used with modules', correct: false },
          ],
        },
        {
          prompt: 'What does a DynamoDB table add to an S3 Terraform backend?',
          explanation:
            'It provides state locking so two concurrent applies cannot corrupt the state file.',
          options: [
            { label: 'State locking for concurrent runs', correct: true },
            { label: 'Encryption of the state file', correct: false },
            { label: 'Versioned history of plans', correct: false },
            { label: 'Faster state downloads', correct: false },
          ],
        },
      ],
    },
  },

  {
    slug: 'ansible-configuration-management',
    track: 'infrastructure-as-code',
    title: 'Ansible for Configuration Management',
    summary:
      'Agentless automation: inventories, idempotent playbooks, roles, handlers and vault-managed secrets.',
    description:
      'Terraform builds the machines; Ansible configures them. This course covers static and dynamic inventories, the module-versus-shell rule, writing genuinely idempotent tasks, structuring roles, using handlers for restarts, templating with Jinja2, and encrypting secrets with Ansible Vault.',
    level: 'intermediate',
    duration_minutes: 170,
    tools: 'Ansible, Jinja2, Ansible Vault, SSH',
    lessons: [
      {
        title: 'Inventories and connection basics',
        content: `## Agentless by design

Ansible connects over SSH and runs Python modules on the target, then cleans up. Nothing to install on the hosts.

\`\`\`ini
[web]
web01.example.com
web02.example.com

[web:vars]
ansible_user=deploy
ansible_python_interpreter=/usr/bin/python3
\`\`\`

### Verify reachability first

\`\`\`bash
ansible all -i inventory.ini -m ping
\`\`\`

Dynamic inventory plugins query your cloud provider so the inventory never goes stale.`,
        estimated_minutes: 25,
        lab_command: 'ansible all -i inventory.ini -m ping',
      },
      {
        title: 'Idempotent playbooks',
        content: `## Describe the end state

\`\`\`yaml
- name: Configure web servers
  hosts: web
  become: true
  tasks:
    - name: Ensure nginx is installed
      ansible.builtin.package:
        name: nginx
        state: present

    - name: Ensure nginx is running and enabled
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true
\`\`\`

### The rule

Prefer a real module over \`shell\`/\`command\`. Modules check current state and report *changed* only when they actually change something. If you must shell out, add \`creates:\` or \`changed_when:\` so reruns stay clean.

Run \`--check --diff\` to preview changes without applying them.`,
        estimated_minutes: 35,
        lab_command: 'ansible-playbook -i inventory.ini site.yml --check --diff',
      },
      {
        title: 'Roles, templates and handlers',
        content: `## Structure that scales

\`\`\`
roles/nginx/
  tasks/main.yml
  handlers/main.yml
  templates/nginx.conf.j2
  defaults/main.yml
  vars/main.yml
\`\`\`

### Templates

\`\`\`jinja
worker_processes {{ ansible_processor_vcpus }};
server {
  listen {{ nginx_port | default(80) }};
  server_name {{ inventory_hostname }};
}
\`\`\`

### Handlers

\`\`\`yaml
    - name: Deploy nginx config
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify: Restart nginx
\`\`\`

Handlers run once, at the end of the play, and only if notified — so ten config changes cause one restart.`,
        estimated_minutes: 35,
        lab_command: 'ansible-galaxy init roles/nginx',
      },
      {
        title: 'Secrets with Ansible Vault',
        content: `## Encrypt at rest, decrypt at run time

\`\`\`bash
ansible-vault create group_vars/prod/vault.yml
ansible-vault edit group_vars/prod/vault.yml
ansible-playbook site.yml --vault-password-file ~/.vault-pass
\`\`\`

### Conventions that keep diffs readable

Keep plaintext variable names in \`vars.yml\` pointing at encrypted values in \`vault.yml\`:

\`\`\`yaml
# vars.yml
db_password: "{{ vault_db_password }}"
\`\`\`

Only \`vault.yml\` is encrypted, so code review still shows which variables exist and where they are used. Mark tasks handling secrets with \`no_log: true\` so values never reach the console or CI logs.`,
        estimated_minutes: 25,
        lab_command: 'ansible-vault encrypt group_vars/prod/vault.yml',
      },
    ],
    quiz: {
      title: 'Ansible check',
      pass_score: 70,
      questions: [
        {
          prompt: 'What makes Ansible "agentless"?',
          explanation:
            'Ansible pushes and executes modules over SSH, then removes them. No persistent daemon runs on managed hosts.',
          options: [
            { label: 'It runs modules over SSH without a resident daemon', correct: true },
            { label: 'It installs a lightweight agent on first run', correct: false },
            { label: 'It only manages containers', correct: false },
            { label: 'It uses a pull model from a central server', correct: false },
          ],
        },
        {
          prompt: 'Why prefer modules over the shell module?',
          explanation:
            'Modules inspect current state and only report changed when they modify something, which is the basis of idempotence.',
          options: [
            { label: 'Modules are state-aware and therefore idempotent', correct: true },
            { label: 'The shell module is disabled by default', correct: false },
            { label: 'Modules run faster in every case', correct: false },
            { label: 'Shell commands cannot use variables', correct: false },
          ],
        },
        {
          prompt: 'When does a handler run?',
          explanation:
            'Handlers are queued by notify and flushed once at the end of the play, running a single time no matter how many tasks notified them.',
          options: [
            { label: 'Once at the end of the play, if notified', correct: true },
            { label: 'Immediately after the notifying task', correct: false },
            { label: 'Before all other tasks', correct: false },
            { label: 'On every run regardless of notification', correct: false },
          ],
        },
        {
          prompt: 'What does --check --diff do?',
          explanation:
            'Check mode is a dry run that reports what would change; diff shows the textual differences for file and template tasks.',
          options: [
            { label: 'Performs a dry run and shows the would-be changes', correct: true },
            { label: 'Applies changes then rolls them back', correct: false },
            { label: 'Validates YAML syntax only', correct: false },
            { label: 'Compares two inventories', correct: false },
          ],
        },
      ],
    },
  },

  {
    slug: 'observability-with-prometheus',
    track: 'observability-sre',
    title: 'Observability with Prometheus & Grafana',
    summary:
      'Metrics, PromQL, the four golden signals, dashboards that answer questions and alerts that matter.',
    description:
      'Move beyond CPU graphs. This course teaches the Prometheus data model, instrumenting a service with counters, gauges and histograms, writing PromQL that survives a restart, building dashboards around the four golden signals, and designing alert rules with sensible for-durations that do not wake people for nothing.',
    level: 'intermediate',
    duration_minutes: 190,
    tools: 'Prometheus, Grafana, PromQL, Alertmanager',
    lessons: [
      {
        title: 'The Prometheus data model',
        content: `## Time series, labels and scraping

A series is a metric name plus a set of labels:

\`\`\`
http_requests_total{method="GET", route="/api/courses", status="200"}
\`\`\`

Prometheus **pulls** \`/metrics\` from targets on an interval. Short-lived jobs push to a Pushgateway instead.

### Metric types

| Type | Meaning |
| --- | --- |
| Counter | Monotonically increasing (requests, errors) |
| Gauge | Goes up and down (queue depth, memory) |
| Histogram | Bucketed observations (latency) |
| Summary | Client-side quantiles (rarely what you want) |

### Cardinality warning

Never label with user IDs, request IDs or raw URLs. Each unique combination is a separate series and will exhaust memory.`,
        estimated_minutes: 30,
        lab_command: 'curl -s localhost:9090/api/v1/targets | jq ".data.activeTargets[].health"',
      },
      {
        title: 'PromQL that works',
        content: `## Rates, not raw counters

A counter resets to zero on restart, so never graph it directly.

\`\`\`promql
rate(http_requests_total[5m])
\`\`\`

\`rate()\` handles resets and gives per-second average over the window.

### Error ratio

\`\`\`promql
sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))
\`\`\`

### Latency percentile from a histogram

\`\`\`promql
histogram_quantile(0.95,
  sum by (le) (rate(http_request_duration_seconds_bucket[5m])))
\`\`\`

Aggregate **by le** before applying the quantile, or the result is meaningless.`,
        estimated_minutes: 40,
        lab_command: 'promtool query instant http://localhost:9090 \'up == 0\'',
      },
      {
        title: 'The four golden signals and dashboards',
        content: `## Signals worth a dashboard row

1. **Latency** — split successful from failed requests, or errors will flatter your p99
2. **Traffic** — requests per second
3. **Errors** — explicit 5xx plus implicit wrong answers
4. **Saturation** — how full the most constrained resource is

### Dashboard design

- Top row: service-level health — one glance says up or down
- Then per-dependency rows: database, cache, upstream APIs
- Use consistent time ranges and units; annotate deploys

A dashboard should answer a question you actually ask during an incident. If nobody has looked at a panel in six months, delete it.`,
        estimated_minutes: 35,
        lab_command: 'docker run -d -p 3000:3000 --name grafana grafana/grafana-oss:11.1.0',
      },
      {
        title: 'Alerts people do not ignore',
        content: `## Alert on symptoms, not causes

Page when users are affected. A single node with high CPU in a healthy cluster is a ticket, not a page.

\`\`\`yaml
- alert: HighErrorRate
  expr: |
    sum(rate(http_requests_total{status=~"5.."}[5m]))
    / sum(rate(http_requests_total[5m])) > 0.05
  for: 10m
  labels:
    severity: page
  annotations:
    summary: "5xx rate above 5% for 10 minutes"
    runbook: "https://runbooks.example.com/high-error-rate"
\`\`\`

### The for clause

\`for: 10m\` requires the condition to hold continuously, filtering out transient spikes. Too short and you get noise; too long and you are slow.

Every paging alert needs a runbook link. If there is no action to take, it should not page.`,
        estimated_minutes: 30,
        lab_command: 'promtool check rules alerts.yml',
      },
    ],
    quiz: {
      title: 'Observability check',
      pass_score: 70,
      questions: [
        {
          prompt: 'Why use rate() instead of graphing a counter directly?',
          explanation:
            'rate() computes per-second change and correctly handles counter resets when a process restarts.',
          options: [
            { label: 'It gives per-second change and handles counter resets', correct: true },
            { label: 'It reduces storage usage', correct: false },
            { label: 'Counters cannot be graphed by Grafana', correct: false },
            { label: 'It converts counters into gauges permanently', correct: false },
          ],
        },
        {
          prompt: 'Which label is a cardinality disaster?',
          explanation:
            'A unique user ID creates a new time series per user, which explodes memory usage. Use bounded, low-cardinality labels.',
          options: [
            { label: 'user_id', correct: true },
            { label: 'http_method', correct: false },
            { label: 'status_code', correct: false },
            { label: 'region', correct: false },
          ],
        },
        {
          prompt: 'Which is NOT one of the four golden signals?',
          explanation:
            'The golden signals are latency, traffic, errors and saturation. Cost is important but is not one of them.',
          options: [
            { label: 'Cost', correct: true },
            { label: 'Latency', correct: false },
            { label: 'Saturation', correct: false },
            { label: 'Errors', correct: false },
          ],
        },
        {
          prompt: 'What does the "for" clause in an alerting rule do?',
          explanation:
            'It requires the expression to stay true for the given duration before the alert fires, suppressing transient spikes.',
          options: [
            { label: 'Requires the condition to hold for that duration before firing', correct: true },
            { label: 'Sets how long the alert stays firing after resolution', correct: false },
            { label: 'Defines the evaluation interval', correct: false },
            { label: 'Limits how many notifications are sent', correct: false },
          ],
        },
        {
          prompt: 'Alerts that page a human should be based on what?',
          explanation:
            'Symptom-based alerting ties pages to user impact. Cause-based alerts generate noise for conditions the system often absorbs.',
          options: [
            { label: 'User-visible symptoms', correct: true },
            { label: 'Any CPU spike on any node', correct: false },
            { label: 'Every application log warning', correct: false },
            { label: 'Deployment events', correct: false },
          ],
        },
      ],
    },
  },

  {
    slug: 'sre-practices-and-incident-response',
    track: 'observability-sre',
    title: 'SRE Practices & Incident Response',
    summary:
      'SLIs, SLOs, error budgets, on-call rotations, incident command and blameless postmortems.',
    description:
      'Site reliability engineering gives you a language for trading velocity against reliability. This course covers choosing SLIs users care about, setting achievable SLOs, spending error budgets deliberately, running an incident with a clear command structure, and writing postmortems that actually change the system.',
    level: 'advanced',
    duration_minutes: 180,
    tools: 'SLO tooling, PagerDuty, Runbooks, Postmortems',
    lessons: [
      {
        title: 'SLIs, SLOs and error budgets',
        content: `## Reliability is a feature with a budget

- **SLI** — a measurement: proportion of requests served successfully under 300ms
- **SLO** — a target for that SLI: 99.9% over 28 days
- **Error budget** — 100% minus the SLO: 0.1%, about 43 minutes of failure per 28 days

### Why 100% is the wrong target

Chasing 100% costs exponentially more for reliability users cannot perceive — their phone network is less reliable than your service. The budget makes the trade-off explicit.

### Budget policy

When the budget is healthy, ship faster. When it is exhausted, freeze features and spend the sprint on reliability work. Agree this policy *before* you need it.`,
        estimated_minutes: 35,
        lab_command: 'echo "budget_minutes=$(python3 -c \'print(28*24*60*0.001)\')"',
      },
      {
        title: 'On-call that is humane',
        content: `## Sustainable rotations

- At least six engineers per rotation, ideally eight
- One week on, with a clear handover document
- A hard cap of two pages per shift; beyond that, the rotation is broken and fixing alerting is the top priority
- Compensate on-call, and give time back after a bad night

### What responders need

1. An alert that states the user impact
2. A runbook with the first three commands to run
3. Dashboards linked from the alert
4. Authority to act — roll back, scale out, fail over — without asking permission

Practise with game days. The first time someone runs a failover should not be at 3am.`,
        estimated_minutes: 30,
        lab_command: 'kubectl get pods -A --field-selector=status.phase!=Running',
      },
      {
        title: 'Running an incident',
        content: `## Roles before heroics

- **Incident Commander** — coordinates, decides, does not debug
- **Operations lead** — makes the changes
- **Communications lead** — updates stakeholders and the status page
- **Scribe** — keeps a timestamped timeline

### Sequence

1. Declare early. Declaring and standing down is cheap.
2. **Mitigate before diagnosing** — roll back, fail over, shed load
3. Communicate on a regular cadence, even with nothing new
4. Stand down explicitly, and schedule the review

### Mitigation first

The goal during an incident is to stop the bleeding, not to understand it. Root cause analysis happens tomorrow, in daylight, with coffee.`,
        estimated_minutes: 35,
        lab_command: 'kubectl rollout undo deployment/api --to-revision=0',
      },
      {
        title: 'Blameless postmortems',
        content: `## Systems fail, not people

If your conclusion is "engineer should have been more careful", you have found a system that allows a tired human to cause an outage. That is the defect.

### Structure

- **Impact** — who was affected, for how long, quantified
- **Timeline** — timestamped, factual
- **Contributing factors** — plural, always
- **What went well** — reinforce it
- **Action items** — each with an owner, a due date and a ticket

### Make it stick

Track action items like any other work. A postmortem whose actions are never done is a document that taught nobody anything. Review last quarter's actions at the start of each review.`,
        estimated_minutes: 30,
        lab_command: 'git log --since="1 day ago" --oneline --all',
      },
      {
        title: 'Toil, automation and capacity',
        content: `## Cap the manual work

Toil is manual, repetitive, automatable work that scales with service size and has no enduring value. Google's guidance: keep it under 50% of an SRE's time.

### Identifying toil

Ask of any task: is it manual, repetitive, automatable, tactical, devoid of lasting value, and does it grow with traffic? Score it; automate the worst offenders first.

### Capacity planning

- Forecast organic growth from historical traffic
- Add known events: launches, marketing, seasonality
- Load test to find the actual knee in the curve, not a guess
- Keep headroom for the loss of one availability zone

Automate the provisioning so scaling is a parameter change, not a project.`,
        estimated_minutes: 30,
        lab_command: 'kubectl top nodes && kubectl top pods -A --sort-by=memory | head',
      },
    ],
    quiz: {
      title: 'SRE practice check',
      pass_score: 70,
      questions: [
        {
          prompt: 'What is an error budget?',
          explanation:
            'It is the allowed unreliability, 100% minus the SLO, which teams spend on shipping changes and risk.',
          options: [
            { label: 'The allowed unreliability implied by the SLO', correct: true },
            { label: 'The financial cost of outages', correct: false },
            { label: 'The number of bugs allowed per release', correct: false },
            { label: 'The time allocated to fixing tech debt', correct: false },
          ],
        },
        {
          prompt: 'During an incident, what should happen first?',
          explanation:
            'Mitigate first — roll back, fail over or shed load. Diagnosis can wait until users are no longer affected.',
          options: [
            { label: 'Mitigate user impact', correct: true },
            { label: 'Identify the root cause', correct: false },
            { label: 'Write the postmortem', correct: false },
            { label: 'Find who deployed the change', correct: false },
          ],
        },
        {
          prompt: 'What does the Incident Commander do?',
          explanation:
            'The IC coordinates the response and makes decisions. They deliberately avoid hands-on debugging so they keep the whole picture.',
          options: [
            { label: 'Coordinates the response and makes decisions', correct: true },
            { label: 'Personally debugs and fixes the system', correct: false },
            { label: 'Approves the postmortem document only', correct: false },
            { label: 'Manages the on-call schedule', correct: false },
          ],
        },
        {
          prompt: 'Why aim for 99.9% rather than 100% availability?',
          explanation:
            'The cost of each additional nine grows exponentially while users cannot perceive the difference beyond their own network reliability.',
          options: [
            { label: 'Each extra nine costs exponentially more for imperceptible gain', correct: true },
            { label: 'Monitoring tools cannot measure 100%', correct: false },
            { label: 'Cloud providers forbid 100% SLOs', correct: false },
            { label: 'It leaves room for scheduled downtime only', correct: false },
          ],
        },
        {
          prompt: 'Which of these is toil?',
          explanation:
            'Toil is manual, repetitive, automatable work that scales with the service and leaves no lasting improvement behind.',
          options: [
            { label: 'Manually restarting a stuck job every morning', correct: true },
            { label: 'Designing a new autoscaling policy', correct: false },
            { label: 'Writing a postmortem', correct: false },
            { label: 'Reviewing an architecture proposal', correct: false },
          ],
        },
      ],
    },
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 190);
}

/**
 * Naively split a .sql file into individual statements.
 * schema.sql contains no stored procedures or custom delimiters.
 */
function splitSqlStatements(sql) {
  const withoutComments = sql
    .split('\n')
    .filter((line) => !/^\s*--/.test(line))
    .join('\n');

  return withoutComments
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function applySchema(conn) {
  if (!fs.existsSync(SCHEMA_PATH)) {
    throw new Error(`schema.sql not found at ${SCHEMA_PATH}`);
  }
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const statements = splitSqlStatements(sql);

  console.log(`> Applying schema.sql (${statements.length} statements)...`);
  for (const statement of statements) {
    try {
      await conn.query(statement);
    } catch (err) {
      // Tolerate benign "already exists" style errors so the script stays idempotent.
      const benign = [
        'ER_TABLE_EXISTS_ERROR',
        'ER_DUP_KEYNAME',
        'ER_DUP_FIELDNAME',
        'ER_DB_CREATE_EXISTS',
      ];
      if (benign.includes(err.code)) {
        continue;
      }
      console.error('  ! Failed statement:\n', statement.slice(0, 200));
      throw err;
    }
  }
  console.log('  ✓ Schema applied');
}

async function seedTracks(conn) {
  const map = new Map();
  for (const track of TRACKS) {
    await conn.query(
      `INSERT INTO tracks (slug, title, description, color_token)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         description = VALUES(description),
         color_token = VALUES(color_token)`,
      [track.slug, track.title, track.description, track.color_token]
    );
    const [rows] = await conn.query('SELECT id FROM tracks WHERE slug = ? LIMIT 1', [track.slug]);
    if (!rows.length) throw new Error(`Track ${track.slug} was not inserted`);
    map.set(track.slug, rows[0].id);
  }
  console.log(`  ✓ ${TRACKS.length} tracks`);
  return map;
}

async function seedCourse(conn, course, trackMap) {
  const trackId = trackMap.get(course.track);
  if (!trackId) throw new Error(`Unknown track "${course.track}" for course ${course.slug}`);

  await conn.query(
    `INSERT INTO courses
       (slug, track_id, title, summary, description, level, duration_minutes, tools, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       track_id = VALUES(track_id),
       title = VALUES(title),
       summary = VALUES(summary),
       description = VALUES(description),
       level = VALUES(level),
       duration_minutes = VALUES(duration_minutes),
       tools = VALUES(tools),
       is_published = 1`,
    [
      course.slug,
      trackId,
      course.title,
      course.summary,
      course.description,
      course.level,
      course.duration_minutes,
      course.tools,
    ]
  );

  const [courseRows] = await conn.query('SELECT id FROM courses WHERE slug = ? LIMIT 1', [
    course.slug,
  ]);
  const courseId = courseRows[0].id;

  // --- lessons -----------------------------------------------------
  const lessonIds = [];
  for (let i = 0; i < course.lessons.length; i += 1) {
    const lesson = course.lessons[i];
    const position = i + 1;
    const lessonSlug = slugify(lesson.title);

    const [existing] = await conn.query(
      'SELECT id FROM lessons WHERE course_id = ? AND slug = ? LIMIT 1',
      [courseId, lessonSlug]
    );

    if (existing.length) {
      await conn.query(
        `UPDATE lessons
            SET position = ?, title = ?, content_markdown = ?, estimated_minutes = ?, lab_command = ?
          WHERE id = ?`,
        [
          position,
          lesson.title,
          lesson.content,
          lesson.estimated_minutes,
          lesson.lab_command || null,
          existing[0].id,
        ]
      );
      lessonIds.push(existing[0].id);
    } else {
      const [res] = await conn.query(
        `INSERT INTO lessons
           (course_id, position, title, slug, content_markdown, estimated_minutes, lab_command)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          courseId,
          position,
          lesson.title,
          lessonSlug,
          lesson.content,
          lesson.estimated_minutes,
          lesson.lab_command || null,
        ]
      );
      lessonIds.push(res.insertId);
    }
  }

  // --- quiz --------------------------------------------------------
  let quizId = null;
  if (course.quiz) {
    const [quizRows] = await conn.query('SELECT id FROM quizzes WHERE course_id = ? LIMIT 1', [
      courseId,
    ]);

    if (quizRows.length) {
      quizId = quizRows[0].id;
      await conn.query('UPDATE quizzes SET title = ?, pass_score = ? WHERE id = ?', [
        course.quiz.title,
        course.quiz.pass_score,
        quizId,
      ]);
    } else {
      const [res] = await conn.query(
        'INSERT INTO quizzes (course_id, title, pass_score) VALUES (?, ?, ?)',
        [courseId, course.quiz.title, course.quiz.pass_score]
      );
      quizId = res.insertId;
    }

    for (let q = 0; q < course.quiz.questions.length; q += 1) {
      const question = course.quiz.questions[q];
      const position = q + 1;

      const [qRows] = await conn.query(
        'SELECT id FROM quiz_questions WHERE quiz_id = ? AND position = ? LIMIT 1',
        [quizId, position]
      );

      let questionId;
      if (qRows.length) {
        questionId = qRows[0].id;
        await conn.query(
          'UPDATE quiz_questions SET prompt = ?, explanation = ? WHERE id = ?',
          [question.prompt, question.explanation, questionId]
        );
        await conn.query('DELETE FROM quiz_options WHERE question_id = ?', [questionId]);
      } else {
        const [res] = await conn.query(
          'INSERT INTO quiz_questions (quiz_id, position, prompt, explanation) VALUES (?, ?, ?, ?)',
          [quizId, position, question.prompt, question.explanation]
        );
        questionId = res.insertId;
      }

      for (const option of question.options) {
        await conn.query(
          'INSERT INTO quiz_options (question_id, label, is_correct) VALUES (?, ?, ?)',
          [questionId, option.label, option.correct ? 1 : 0]
        );
      }
    }
  }

  return { courseId, lessonIds, quizId };
}

async function seedDemoUser(conn, seeded) {
  const [existing] = await conn.query('SELECT id FROM users WHERE email = ? LIMIT 1', [
    DEMO_USER.email,
  ]);

  let userId;
  if (existing.length) {
    userId = existing[0].id;
    console.log('  ✓ Demo user already present');
  } else {
    const hash = await bcrypt.hash(DEMO_USER.password, 10);
    const [res] = await conn.query(
      'INSERT INTO users (name, email, password_hash, role, job_title) VALUES (?, ?, ?, ?, ?)',
      [DEMO_USER.name, DEMO_USER.email, hash, DEMO_USER.role, DEMO_USER.job_title]
    );
    userId = res.insertId;
    console.log(`  ✓ Demo user created (${DEMO_USER.email} / ${DEMO_USER.password})`);
  }

  // Enrol the demo learner in the first two seeded courses.
  const enrolTargets = seeded.slice(0, 2);
  for (const target of enrolTargets) {
    await conn.query(
      'INSERT IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)',
      [userId, target.courseId]
    );
  }

  // Complete the first two lessons of the first course, start the third.
  if (enrolTargets.length) {
    const first = enrolTargets[0];
    const completed = first.lessonIds.slice(0, 2);
    const inProgress = first.lessonIds.slice(2, 3);

    for (const lessonId of completed) {
      await conn.query(
        `INSERT INTO lesson_progress (user_id, lesson_id, course_id, status, completed_at)
         VALUES (?, ?, ?, 'completed', NOW())
         ON DUPLICATE KEY UPDATE status = 'completed', completed_at = NOW()`,
        [userId, lessonId, first.courseId]
      );
    }
    for (const lessonId of inProgress) {
      await conn.query(
        `INSERT INTO lesson_progress (user_id, lesson_id, course_id, status, completed_at)
         VALUES (?, ?, ?, 'in_progress', NULL)
         ON DUPLICATE KEY UPDATE status = VALUES(status)`,
        [userId, lessonId, first.courseId]
      );
    }
  }

  // A sample quiz attempt on the second enrolled course.
  if (enrolTargets.length > 1 && enrolTargets[1].quizId) {
    const quizId = enrolTargets[1].quizId;
    const [attempts] = await conn.query(
      'SELECT id FROM quiz_attempts WHERE user_id = ? AND quiz_id = ? LIMIT 1',
      [userId, quizId]
    );
    if (!attempts.length) {
      await conn.query(
        'INSERT INTO quiz_attempts (user_id, quiz_id, score, passed, answers) VALUES (?, ?, ?, ?, ?)',
        [userId, quizId, 75, 1, JSON.stringify({})]
      );
    }
  }

  console.log('  ✓ Demo enrollments, lesson progress and quiz attempt');
  return userId;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  console.log('=== DevOps Academy database seed ===');
  console.log(`> Database: ${process.env.DB_NAME || '(DB_NAME unset)'} @ ${process.env.DB_HOST || 'localhost'}`);

  let conn;
  try {
    conn = await pool.getConnection();
  } catch (err) {
    console.error('✗ Could not connect to MySQL. Check DB_HOST/DB_USER/DB_PASSWORD/DB_NAME.');
    console.error(`  ${err.code || ''} ${err.message}`);
    throw err;
  }

  try {
    await applySchema(conn);

    console.log('> Seeding content...');
    const trackMap = await seedTracks(conn);

    const seeded = [];
    for (const course of COURSES) {
      const result = await seedCourse(conn, course, trackMap);
      seeded.push(result);
      console.log(
        `  ✓ ${course.title} (${course.lessons.length} lessons, ${
          course.quiz ? course.quiz.questions.length : 0
        } quiz questions)`
      );
    }

    console.log('> Seeding demo learner...');
    await seedDemoUser(conn, seeded);

    const [[{ courses }]] = await conn.query('SELECT COUNT(*) AS courses FROM courses');
    const [[{ lessons }]] = await conn.query('SELECT COUNT(*) AS lessons FROM lessons');
    const [[{ quizzes }]] = await conn.query('SELECT COUNT(*) AS quizzes FROM quizzes');

    console.log('=== Seed complete ===');
    console.log(`  tracks:  ${TRACKS.length}`);
    console.log(`  courses: ${courses}`);
    console.log(`  lessons: ${lessons}`);
    console.log(`  quizzes: ${quizzes}`);
    console.log(`  demo login: ${DEMO_USER.email} / ${DEMO_USER.password}`);
  } finally {
    conn.release();
  }
}

main()
  .then(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('✗ Seed failed:', err.message);
    if (process.env.NODE_ENV !== 'production' && err.stack) {
      console.error(err.stack);
    }
    await pool.end().catch(() => {});
    process.exit(1);
  });