'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import * as api from '../../../lib/api';
import { useAuth } from '../../../lib/AuthContext';
import LessonSidebar from '../../../components/LessonSidebar';
import PageHeader from '../../../components/layout/PageHeader';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Card, { CardBody, CardFooter, CardHeader } from '../../../components/ui/Card';
import ProgressBar from '../../../components/ui/ProgressBar';
import EmptyState from '../../../components/ui/EmptyState';
import Spinner from '../../../components/ui/Spinner';
import { formatDuration, levelLabel, percent } from '../../../lib/formatters';

function parseTools(tools) {
  if (!tools) return [];
  if (Array.isArray(tools)) return tools.filter(Boolean);
  if (typeof tools === 'string') {
    const trimmed = tools.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (err) {
      // fall through to comma-separated parsing
    }
    return trimmed
      .split(',')
      .map((tool) => tool.trim())
      .filter(Boolean);
  }
  return [];
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params?.slug === 'string' ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : '';
  const { user, loading: authLoading } = useAuth();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadCourse = useCallback(async () => {
    if (!slug) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await api.getCourse(slug);
      const detail = data && data.course ? data.course : data;
      if (!detail || !detail.id) {
        setNotFound(true);
        setCourse(null);
        setLessons([]);
      } else {
        setCourse(detail);
        setLessons(Array.isArray(detail.lessons) ? detail.lessons : Array.isArray(data?.lessons) ? data.lessons : []);
      }
    } catch (err) {
      if (err && err.status === 404) {
        setNotFound(true);
      } else {
        setError(err && err.message ? err.message : 'We could not reach the training API.');
      }
      setCourse(null);
      setLessons([]);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await loadCourse();
    })();
    return () => {
      active = false;
    };
  }, [loadCourse]);

  const completedCount = lessons.filter((lesson) => lesson.status === 'completed').length;
  const totalLessons = lessons.length;
  const completion = percent(completedCount, totalLessons);
  const nextLesson =
    lessons.find((lesson) => lesson.status !== 'completed') || (lessons.length ? lessons[0] : null);
  const isEnrolled = Boolean(course && (course.is_enrolled || course.enrolled));
  const tools = parseTools(course?.tools);
  const quizId = course?.quiz_id || course?.quizId || null;

  async function handleEnroll() {
    if (!course) return;
    setActionError('');
    if (!user) {
      router.push('/login');
      return;
    }
    setEnrolling(true);
    try {
      if (!isEnrolled) {
        await api.enroll(course.slug);
      }
      if (nextLesson && nextLesson.id) {
        router.push(`/lessons/${nextLesson.id}`);
      } else {
        await loadCourse();
      }
    } catch (err) {
      setActionError(err && err.message ? err.message : 'Enrolment failed. Please try again.');
    } finally {
      setEnrolling(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="page-shell">
        <div className="stack">
          <div className="skeleton skeleton-title" aria-hidden="true" />
          <div className="skeleton skeleton-text" aria-hidden="true" />
          <div className="skeleton skeleton-block" aria-hidden="true" />
          <div className="skeleton skeleton-block" aria-hidden="true" />
          <p className="visually-hidden" role="status">
            <Spinner size="sm" label="Loading course" /> Loading course details
          </p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="page-shell">
        <EmptyState
          variant="empty"
          title="That course is not in the catalogue"
          description="The course you followed may have been retired or the link is misspelled. Browse the catalogue for current DevOps tracks."
          action={
            <Button as="link" href="/courses" variant="primary">
              Browse all courses
            </Button>
          }
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <EmptyState
          variant="error"
          title="We could not load this course"
          description={error}
          action={
            <Button variant="primary" onClick={loadCourse}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={course.track_title || 'DevOps track'}
        title={course.title}
        description={course.summary}
        actions={
          <Button
            variant="primary"
            size="lg"
            onClick={handleEnroll}
            loading={enrolling}
            disabled={enrolling}
          >
            {isEnrolled ? 'Continue learning' : 'Enrol in this course'}
          </Button>
        }
      />

      <div className="cluster course-meta">
        {course.track_title ? <Badge tone="accent">{course.track_title}</Badge> : null}
        <Badge tone="neutral">{levelLabel(course.level)}</Badge>
        <Badge tone="neutral">{formatDuration(course.duration_minutes || 0)}</Badge>
        <Badge tone="neutral">
          {totalLessons} {totalLessons === 1 ? 'lesson' : 'lessons'}
        </Badge>
      </div>

      {actionError ? (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      ) : null}

      {!user ? (
        <Card padding="md">
          <CardBody>
            <h2>Sign in to track your progress</h2>
            <p>
              You can read every lesson outline here, but enrolment, lesson completion and quiz
              scores are stored against your account.
            </p>
            <div className="cluster">
              <Button as="link" href="/login" variant="primary">
                Log in
              </Button>
              <Button as="link" href="/signup" variant="secondary">
                Create an account
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : isEnrolled ? (
        <Card padding="md">
          <CardBody>
            <ProgressBar
              value={completedCount}
              max={totalLessons || 1}
              label={`${completedCount} of ${totalLessons} lessons complete`}
              showValue
              size="md"
            />
            {nextLesson ? (
              <p>
                Up next:{' '}
                <Link href={`/lessons/${nextLesson.id}`}>{nextLesson.title}</Link>
              </p>
            ) : (
              <p>Every lesson is complete — take the module quiz to lock in your score.</p>
            )}
          </CardBody>
        </Card>
      ) : null}

      <div className="course-detail-grid">
        <div className="stack">
          <section>
            <h2>About this course</h2>
            <div className="lesson-body">
              {String(course.description || course.summary || '')
                .split(/\n{2,}/)
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
            </div>
          </section>

          {tools.length ? (
            <section>
              <h2>Tooling you will practise</h2>
              <div className="cluster">
                {tools.map((tool) => (
                  <Badge key={tool} tone="neutral" size="sm">
                    {tool}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2>Curriculum</h2>
            {totalLessons === 0 ? (
              <EmptyState
                variant="empty"
                title="Lessons are being authored"
                description="This course has no published lessons yet. Check back shortly — new modules ship every sprint."
              />
            ) : (
              <LessonSidebar
                courseSlug={course.slug}
                lessons={lessons}
                currentLessonId={null}
                quizId={quizId}
              />
            )}
          </section>
        </div>

        <aside className="stack">
          <Card padding="md">
            <CardHeader>
              <h3>Module quiz</h3>
            </CardHeader>
            <CardBody>
              <p>
                {quizId
                  ? 'Validate what you have learned with a short multiple-choice assessment. You need 70% to pass and it can be retaken.'
                  : 'A graded assessment for this course is not published yet.'}
              </p>
            </CardBody>
            <CardFooter>
              <Button
                as="link"
                href={`/quizzes/${course.slug}`}
                variant={quizId ? 'secondary' : 'ghost'}
                disabled={!quizId}
                fullWidth
              >
                {quizId ? 'Open the quiz' : 'Quiz coming soon'}
              </Button>
            </CardFooter>
          </Card>

          <Card padding="md">
            <CardHeader>
              <h3>At a glance</h3>
            </CardHeader>
            <CardBody>
              <ul className="meta-list">
                <li>Level: {levelLabel(course.level)}</li>
                <li>Estimated time: {formatDuration(course.duration_minutes || 0)}</li>
                <li>
                  Lessons: {totalLessons} ({completion}% complete)
                </li>
                <li>Track: {course.track_title || 'General DevOps'}</li>
              </ul>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}