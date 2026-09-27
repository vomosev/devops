'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthForm from '../../components/AuthForm';
import Card, { CardBody } from '../../components/ui/Card';
import { useAuth } from '../../lib/AuthContext';

export default function SignupPage() {
  const router = useRouter();
  const { signup, refreshUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(values) {
    setError('');
    setSubmitting(true);
    try {
      await signup({
        name: values.name,
        email: values.email,
        password: values.password,
        job_title: values.jobTitle || values.job_title || '',
      });
      await refreshUser();
      router.push('/dashboard');
    } catch (err) {
      setError(
        err?.message ||
          'We could not create your account. Please check your details and try again.'
      );
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page stack">
      <div className="auth-card-wrap">
        <Card padding="lg">
          <CardBody>
            <p className="eyebrow">Create your account</p>
            <h1>Start building real DevOps skill</h1>
            <p className="text-muted">
              Join engineers levelling up on CI/CD pipelines, Kubernetes operations,
              Terraform modules and SRE practice. Progress and quiz scores are saved to
              your dashboard.
            </p>
            <AuthForm
              mode="signup"
              onSubmit={handleSubmit}
              submitting={submitting}
              error={error}
            />
          </CardBody>
        </Card>
      </div>
    </section>
  );
}