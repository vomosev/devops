'use client';

import Link from 'next/link';
import Badge from './ui/Badge';
import { formatDuration } from '../lib/formatters';

export default function LessonSidebar({
  courseSlug,
  lessons = [],
  currentLessonId = null,
  quizId = null,
}) {
  const safeLessons = Array.isArray(lessons) ? lessons : [];

  if (safeLessons.length === 0) {
    return (
      <nav className="lesson-sidebar" aria-label="Course lessons">
        <p className="text-muted">No lessons have been published for this course yet.</p>
      </nav>
    );
  }

  return (
    <nav className="lesson-sidebar" aria-label="Course lessons">
      <ol className="lesson-list">
        {safeLessons.map((lesson, index) => {
          const id = lesson.id ?? lesson.lesson_id;
          const isCurrent =
            currentLessonId != null && String(currentLessonId) === String(id);
          const status = lesson.status || 'not_started';
          const isComplete = status === 'completed';
          const position = lesson.position ?? index + 1;
          const minutes = lesson.estimated_minutes ?? lesson.estimatedMinutes ?? 0;

          return (
            <li key={id ?? `lesson-${index}`} className="lesson-list-item">
              <Link
                href={`/lessons/${id}`}
                className={`lesson-row${isCurrent ? ' is-current' : ''}${
                  isComplete ? ' is-complete' : ''
                }`}
                aria-current={isCurrent ? 'page' : undefined}
              >
                <span className="lesson-row-index" aria-hidden="true">
                  {isComplete ? (
                    <svg
                      viewBox="0 0 16 16"
                      width="16"
                      height="16"
                      focusable="false"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 8.5l3.2 3.2L13 5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    position
                  )}
                </span>

                <span className="lesson-row-main">
                  <span className="lesson-row-title course-title">{lesson.title}</span>
                  <span className="lesson-row-meta">
                    {minutes > 0 ? formatDuration(minutes) : 'Self-paced'}
                  </span>
                </span>

                <span className="lesson-row-status">
                  {isComplete ? (
                    <Badge tone="success" size="sm">
                      Done
                    </Badge>
                  ) : status === 'in_progress' ? (
                    <Badge tone="accent" size="sm">
                      In progress
                    </Badge>
                  ) : (
                    <Badge tone="neutral" size="sm">
                      To do
                    </Badge>
                  )}
                </span>
              </Link>
            </li>
          );
        })}

        {quizId && courseSlug ? (
          <li className="lesson-list-item">
            <Link href={`/quizzes/${courseSlug}`} className="lesson-row lesson-row-quiz">
              <span className="lesson-row-index" aria-hidden="true">
                <svg
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  focusable="false"
                  aria-hidden="true"
                >
                  <path
                    d="M8 1.5l1.9 4 4.4.6-3.2 3.1.8 4.3L8 11.5l-3.9 2 .8-4.3L1.7 6.1l4.4-.6z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="lesson-row-main">
                <span className="lesson-row-title">Module quiz</span>
                <span className="lesson-row-meta">Check what you have learned</span>
              </span>
              <span className="lesson-row-status">
                <Badge tone="warning" size="sm">
                  Quiz
                </Badge>
              </span>
            </Link>
          </li>
        ) : null}
      </ol>
    </nav>
  );
}