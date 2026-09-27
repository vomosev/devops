import Link from 'next/link';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';

export const metadata = {
  title: 'Page not found — DevOps Academy',
  description: 'The page you were looking for is no longer part of this cluster.',
};

export default function NotFound() {
  return (
    <section className="page-section">
      <EmptyState
        variant="empty"
        title="That page has drifted out of the cluster"
        description="The route you requested was never scheduled, or it has since been drained. Head back to the catalogue and pick up a track — CI/CD, Kubernetes, Terraform or SRE."
        action={
          <Button as={Link} href="/courses" variant="primary" size="md">
            Browse courses
          </Button>
        }
      />
    </section>
  );
}