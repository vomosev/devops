'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/AuthContext';
import * as api from '../../lib/api';
import PageHeader from '../../components/layout/PageHeader';
import Card, { CardHeader, CardBody, CardFooter } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { formatDate } from '../../lib/formatters';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, refreshUser, logout } = useAuth();

  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setJobTitle(user.job_title || '');
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!saved) return undefined;
    const timer = setTimeout(() => setSaved(false), 4000);
    return () => clearTimeout(timer);
  }, [saved]);

  async function handleSave(event) {
    event.preventDefault();
    const errors = {};
    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'Please enter your full name (at least 2 characters).';
    }
    if (jobTitle.length > 120) {
      errors.jobTitle = 'Job title must be 120 characters or fewer.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.updateProfile({ name: name.trim(), job_title: jobTitle.trim() });
      await refreshUser();
      setSaved(true);
    } catch (err) {
      setError(err?.message || 'We could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      setLogoutOpen(false);
      router.push('/');
    } catch (err) {
      setError(err?.message || 'Log out failed. Please try again.');
      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Account"
          title="Your profile"
          description="Manage the details that appear across your DevOps Academy learning record."
        />
        <Card padding="lg">
          <CardBody>
            <div className="cluster" style={undefined}>
              <Spinner size="md" label="Loading your profile" />
            </div>
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-block" />
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Account"
          title="Your profile"
          description="Sign in to review your learning record and update your details."
        />
        <EmptyState
          variant="empty"
          title="You need to be signed in"
          description="Log in with your DevOps Academy account to view and edit your profile."
          action={<Button as={Link} href="/login" variant="primary">Go to login</Button>}
        />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Account"
        title="Your profile"
        description="Update how your name appears on certificates, leaderboards and team reports."
        actions={
          <Button as={Link} href="/dashboard" variant="secondary" size="sm">
            Back to dashboard
          </Button>
        }
      />

      <div className="grid grid-2">
        <Card padding="lg">
          <CardHeader>
            <h2>Account details</h2>
            <p className="text-muted">These details come from your DevOps Academy account.</p>
          </CardHeader>
          <CardBody>
            <dl className="detail-list">
              <div className="detail-row">
                <dt className="text-muted">Name</dt>
                <dd className="user-text">{user.name}</dd>
              </div>
              <div className="detail-row">
                <dt className="text-muted">Email</dt>
                <dd className="user-text">{user.email}</dd>
              </div>
              <div className="detail-row">
                <dt className="text-muted">Job title</dt>
                <dd className="user-text">{user.job_title || 'Not set yet'}</dd>
              </div>
              <div className="detail-row">
                <dt className="text-muted">Role</dt>
                <dd>
                  <Badge tone={user.role === 'instructor' ? 'accent' : 'neutral'} size="sm">
                    {user.role === 'instructor' ? 'Instructor' : 'Learner'}
                  </Badge>
                </dd>
              </div>
              <div className="detail-row">
                <dt className="text-muted">Member since</dt>
                <dd>{user.created_at ? formatDate(user.created_at) : 'Recently'}</dd>
              </div>
            </dl>
          </CardBody>
          <CardFooter>
            <Button variant="danger" size="md" onClick={() => setLogoutOpen(true)}>
              Log out
            </Button>
          </CardFooter>
        </Card>

        <Card padding="lg" as="section">
          <CardHeader>
            <h2>Edit profile</h2>
            <p className="text-muted">Change your display name and the role you are training for.</p>
          </CardHeader>
          <CardBody>
            <form className="stack" onSubmit={handleSave} noValidate>
              <Input
                id="profile-name"
                label="Full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Alex Mbeki"
                error={fieldErrors.name}
                required
                disabled={saving}
              />
              <Input
                id="profile-job-title"
                label="Job title"
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                placeholder="Platform Engineer"
                hint="Used to recommend tracks such as SRE, Kubernetes or IaC."
                error={fieldErrors.jobTitle}
                disabled={saving}
              />
              <Input
                id="profile-email"
                label="Email address"
                type="email"
                value={user.email}
                onChange={() => {}}
                hint="Your sign-in email cannot be changed here."
                disabled
              />

              {error ? (
                <p className="form-error user-text" role="alert">
                  {error}
                </p>
              ) : null}
              {saved ? (
                <p className="form-success" role="status">
                  Profile saved. Your new details are live across the platform.
                </p>
              ) : null}

              <Button type="submit" variant="primary" size="md" loading={saving} disabled={saving}>
                {saving ? 'Saving changes' : 'Save changes'}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>

      <Modal
        open={logoutOpen}
        onClose={() => (loggingOut ? null : setLogoutOpen(false))}
        title="Log out of DevOps Academy?"
        description="Your progress is saved. You can pick up the next lesson whenever you sign back in."
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setLogoutOpen(false)} disabled={loggingOut}>
              Stay signed in
            </Button>
            <Button variant="danger" size="md" onClick={handleLogout} loading={loggingOut} disabled={loggingOut}>
              Log out
            </Button>
          </>
        }
      >
        <p>
          You are signed in as <strong className="user-text">{user.email}</strong>.
        </p>
      </Modal>
    </div>
  );
}