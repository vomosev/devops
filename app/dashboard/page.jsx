'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/AuthContext';
import * as api from '../../lib/api';
import PageHeader from '../../components/layout/PageHeader';
import StatCard from '../../components/StatCard';
import CourseCard from '../../components/CourseCard';
import Table from '../../components/ui/Table';
import ProgressBar from '../../components/ui/ProgressBar';
import Card, { CardHeader, CardBody, CardFooter } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import { formatDate, formatDuration, percent } from '../../lib/formatters';

function DashboardSkeleton() {
  return (
    <div className="stack" aria-hidden="true">
      <div className="grid grid-4">
        {[0, 1, 2, 3].map((i) => (
          <div className="skeleton skeleton-stat" key={i} />
        ))}
      </div>
      <div className="skeleton skeleton-panel" />
      <div className="grid grid-3">
        {[0, 1, 2].map((i) => (
          <div className="skeleton skeleton-card" key={i} />
        ))}
      </div>
    </div>
  );
}

const activityColumns = [
  {
    key: 'title',
    header: 'Lesson',
    render: (row) => (
      <span className="cell-title user-text">{row.lesson_title || row.title || 'Lesson'}</span>
    ),
  },
  {
    key: 'course_title',
    header: 'Course',
    render: (row) => <span className="user-text">{row.course_title || '—'}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <Badge tone={row.status === 'completed' ? 'success' : 'accent'} size="sm">
        {row.status === 'completed' ? 'Completed' : 'In progress'}
      </Badge>
    ),
  },
  {
    key: 'completed_at',
    header: 'When',
    align: 'right',
    render: (row) => (
      <span className="text-muted">{formatDate(row.completed_at || row.updated_at)}</span>
    ),
  },
];

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getDashboard();
      setData(result || null);
    } catch (err) {
      setError(err?.message || 'We could not reach the training API. Please try again.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      load();
    }
  }, [user, load]);

  if (authLoading) {
    return (
      <section className="page-shell">
        <div className="center-state">
          <Spinner size="lg" label="Checking your session" />
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="page-shell">
        <EmptyState
          variant="empty"
          title="Sign in to see your dashboard"
          description="Your progress, quiz scores and enrolled courses live behind your DevOps Academy account."
          action={<Button as={Link} href="/login" variant="primary">Log in</Button>}
        />
      </section>
    );
  }

  const stats = data?.stats || {};
  const continueCourse = data?.continueLearning || data?.continue_learning || null;
  const courses = Array.isArray(data?.courses) ? data.courses : [];
  const activity = Array.isArray(data?.recentActivity)
    ? data.recentActivity
    : Array.isArray(data?.recent_activity)
      ? data.recent_activity
      : [];

  return (
    <section className="page-shell">
      <PageHeader
        eyebrow="Your workspace"
        title={`Welcome back, ${user.name ? user.name.split(' ')[0] : 'engineer'}`}
        description="Track your pipeline skills, pick up where you left off, and review recent lesson activity across your enrolled DevOps tracks."
        actions={
          <Button as={Link} href="/courses" variant="secondary" size="md">
            Browse courses
          </Button>
        }
      />

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <EmptyState
          variant="error"
          title="Dashboard unavailable"
          description={error}
          action={
            <Button variant="primary" onClick={load}>
              Retry
            </Button>
          }
        />
      ) : (
        <div className="stack">
          <div className="grid grid-4">
            <StatCard
              label="Courses enrolled"
              value={Number(stats.enrolledCourses ?? stats.enrolled_courses ?? courses.length ?? 0)}
              icon="stack"
            />
            <StatCard
              label="Lessons completed"
              value={Number(stats.lessonsCompleted ?? stats.lessons_completed ?? 0)}
              icon="check"
            />
            <StatCard
              label="Minutes learned"
              value={Number(stats.minutesLearned ?? stats.minutes_learned ?? 0)}
              unit="min"
              icon="clock"
            />
            <StatCard
              label="Average quiz score"
              value={Math.round(Number(stats.averageQuizScore ?? stats.average_quiz_score ?? 0))}
              unit="%"
              icon="target"
            />
          </div>

          {continueCourse ? (
            <Card padding="lg">
              <CardHeader>
                <span className="eyebrow">Continue learning</span>
                <h2 className="course-title">{continueCourse.title || continueCourse.course_title}</h2>
              </CardHeader>
              <CardBody>
                <p>
                  {continueCourse.nextLessonTitle || continueCourse.next_lesson_title
                    ? `Next up: ${continueCourse.nextLessonTitle || continueCourse.next_lesson_title}`
                    : 'You have finished every lesson in this course — try the module quiz to lock the knowledge in.'}
                </p>
                <ProgressBar
                  value={Number(continueCourse.completedLessons ?? continueCourse.completed_lessons ?? 0)}
                  max={Number(continueCourse.totalLessons ?? continueCourse.total_lessons ?? 0) || 1}
                  label="Course completion"
                  showValue
                  size="md"
                />
              </CardBody>
              <CardFooter>
                <div className="cluster">
                  {continueCourse.nextLessonId || continueCourse.next_lesson_id ? (
                    <Button
                      as={Link}
                      href={`/lessons/${continueCourse.nextLessonId || continueCourse.next_lesson_id}`}
                      variant="primary"
                    >
                      Resume lesson
                    </Button>
                  ) : null}
                  {continueCourse.slug ? (
                    <Button as={Link} href={`/courses/${continueCourse.slug}`} variant="ghost">
                      Course overview
                    </Button>
                  ) : null}
                  <span className="text-muted">
                    {percent(
                      Number(continueCourse.completedLessons ?? continueCourse.completed_lessons ?? 0),
                      Number(continueCourse.totalLessons ?? continueCourse.total_lessons ?? 0),
                    )}
                    % complete ·{' '}
                    {formatDuration(Number(continueCourse.duration_minutes ?? continueCourse.durationMinutes ?? 0))}
                  </span>
                </div>
              </CardFooter>
            </Card>
          ) : null}

          <section>
            <h2>Your enrolled courses</h2>
            {courses.length === 0 ? (
              <EmptyState
                variant="empty"
                title="You haven't enrolled yet"
                description="Pick a track — CI/CD pipelines, Kubernetes operations, Terraform modules or SRE observability — and start your first lesson today."
                action={
                  <Button as={Link} href="/courses" variant="primary">
                    Browse courses
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-3">
                {courses.map((course) => (
                  <CourseCard
                    key={course.id || course.slug}
                    course={course}
                    progress={{
                      completed: Number(course.completedLessons ?? course.completed_lessons ?? 0),
                      total: Number(course.totalLessons ?? course.total_lessons ?? course.lesson_count ?? 0),
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2>Recent activity</h2>
            <Table
              columns={activityColumns}
              rows={activity}
              loading={false}
              emptyMessage="No lesson activity recorded yet. Complete a lesson to see it here."
            />
          </section>
        </div>
      )}
    </section>
  );
}