'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthForm from '../../components/AuthForm';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';
import PageHeader from '../../components/layout/PageHeader';
import { useAuth } from '../../lib/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login, refreshUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  async function handleSubmit(values) {
    setError('');
    setSubmitting(true);
    try {
      await login({ email: values.email, password: values.password });
      await refreshUser();
      router.push('/dashboard');
    } catch (err) {
      const message =
        err && err.message
          ? err.message
          : 'We could not sign you in. Check your details and try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Welcome back"
        title="Log in to DevOps Academy"
        description="Pick up your pipelines, clusters and Terraform modules exactly where you left off."
      />

      <div className="auth-layout">
        <Card padding="lg" className="auth-card">
          <CardHeader>
            <h2 className="auth-card-title">Sign in</h2>
            <p className="auth-card-note">
              Use the email address you registered with. Sessions stay active for seven days.
            </p>
          </CardHeader>
          <CardBody>
            <AuthForm
              mode="login"
              onSubmit={handleSubmit}
              submitting={submitting}
              error={error}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}