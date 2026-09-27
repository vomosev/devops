'use client';

import Link from 'next/link';
import Card, { CardHeader, CardBody, CardFooter } from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import ProgressBar from './ui/ProgressBar';
import { formatDuration, levelLabel, truncate, percent } from '../lib/formatters';

function levelTone(level) {
  switch (level) {
    case 'beginner':
      return 'success';
    case 'intermediate':
      return 'accent';
    case 'advanced':
      return 'warning';
    default:
      return 'neutral';
  }
}

export default function CourseCard({ course, progress }) {
  if (!course) return null;

  const slug = course.slug || '';
  const title = course.title || 'Untitled course';
  const summary = course.summary || course.description || 'Course details are being finalised.';
  const lessonCount = Number(course.lesson_count ?? course.lessonCount ?? 0);
  const minutes = Number(course.duration_minutes ?? course.durationMinutes ?? 0);
  const trackTitle = course.track_title || course.trackTitle || null;

  const completed = Number(
    progress?.completed ?? progress?.completed_lessons ?? course.completed_lessons ?? 0
  );
  const total = Number(progress?.total ?? progress?.total_lessons ?? lessonCount ?? 0);
  const hasProgress = progress != null || (course.enrolled && total > 0);
  const pct = total > 0 ? percent(completed, total) : 0;

  const isEnrolled = Boolean(course.enrolled ?? progress?.enrolled);
  const ctaLabel = !isEnrolled ? 'View course' : pct >= 100 ? 'Review course' : 'Continue';

  return (
    <Card className="course-card" interactive padding="md">
      <CardHeader>
        <div className="cluster course-card-tags">
          {trackTitle ? <Badge tone="accent" size="sm">{trackTitle}</Badge> : null}
          {course.level ? (
            <Badge tone={levelTone(course.level)} size="sm">
              {levelLabel(course.level)}
            </Badge>
          ) : null}
        </div>
        <h3 className="course-title">
          <Link href={`/courses/${slug}`}>{title}</Link>
        </h3>
      </CardHeader>

      <CardBody>
        <p className="course-card-summary">{truncate(summary, 160)}</p>

        <div className="cluster course-card-meta">
          <span className="course-card-meta-item">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path
                d="M3 2.5h7a1.5 1.5 0 0 1 1.5 1.5v9.5L8 12l-3.5 1.5V4A1.5 1.5 0 0 1 6 2.5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </svg>
            {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
          </span>
          <span className="course-card-meta-item">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 4.5V8l2.4 1.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            {formatDuration(minutes)}
          </span>
        </div>

        {hasProgress ? (
          <ProgressBar
            value={completed}
            max={total || 1}
            label={total > 0 ? `${completed} of ${total} lessons complete` : 'Not started'}
            showValue
            size="sm"
          />
        ) : null}
      </CardBody>

      <CardFooter>
        <Button as={Link} href={`/courses/${slug}`} variant="secondary" size="sm">
          {ctaLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}