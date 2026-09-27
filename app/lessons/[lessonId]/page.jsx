'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import * as api from '../../../lib/api';
import { useAuth } from '../../../lib/AuthContext';
import Button from '../../../components/ui/Button';
import Card, { CardBody, CardFooter, CardHeader } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import PageHeader from '../../../components/layout/PageHeader';
import { formatDuration } from '../../../lib/formatters';

/* ---------- Minimal markdown renderer (headings, lists, code fences, prose) ---------- */

function renderInline(text) {
  const nodes = [];
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)\s]+\))/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`')) {
      nodes.push(<code key={`c${key++}`}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={`b${key++}`}>{token.slice(2, -2)}</strong>);
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      if (linkMatch) {
        nodes.push(
          <a key={`a${key++}`} href={linkMatch[2]} rel="noreferrer noopener" target="_blank">
            {linkMatch[1]}
          </a>
        );
      } else {
        nodes.push(token);
      }
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length ? nodes : text;
}

function parseMarkdown(markdown) {
  const source = typeof markdown === 'string' ? markdown : '';
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    // Fenced code block
    if (/^```/.test(line.trim())) {
      const language = line.trim().slice(3).trim();
      const code = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1; // skip closing fence
      blocks.push({ type: 'code', language, content: code.join('\n') });
      continue;
    }

    // Heading
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, content: heading[2].trim() });
      index += 1;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push({ type: 'quote', content: quote.join(' ') });
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*+]\s+/, ''));
        index += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+[.)]\s+/, ''));
        index += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Paragraph
    const paragraph = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^```/.test(lines[index].trim()) &&
      !/^(#{1,6})\s+/.test(lines[index]) &&
      !/^\s*[-*+]\s+/.test(lines[index]) &&
      !/^\s*\d+[.)]\s+/.test(lines[index]) &&
      !/^>\s?/.test(lines[index])
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: 'p', content: paragraph.join(' ') });
  }

  return blocks;
}

function MarkdownBody({ markdown }) {
  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);

  if (!blocks.length) {
    return <p className="text-muted">This lesson has no written content yet. Check back soon.</p>;
  }

  return (
    <div className="lesson-body">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading': {
            const Tag = `h${Math.min(block.level + 1, 6)}`;
            return <Tag key={i}>{renderInline(block.content)}</Tag>;
          }
          case 'code':
            return (
              <pre key={i} className="code-block">
                <code>{block.content}</code>
              </pre>
            );
          case 'ul':
            return (
              <ul key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ol>
            );
          case 'quote':
            return <blockquote key={i}>{renderInline(block.content)}</blockquote>;
          default:
            return <p key={i}>{renderInline(block.content)}</p>;
        }
      })}
    </div>
  );
}

/* ---------- Lab command block with copy button ---------- */

function LabCommand({ command }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = useCallback(async () => {
    setCopyError('');
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(command);
        setCopied(true);
        return;
      }
      throw new Error('Clipboard unavailable');
    } catch (err) {
      setCopyError('Copy is unavailable in this browser — select the text manually.');
    }
  }, [command]);

  return (
    <Card className="lab-card">
      <CardHeader>
        <div className="cluster cluster-between">
          <div className="cluster">
            <Badge tone="accent" size="sm">
              Hands-on lab
            </Badge>
            <span className="text-muted text-sm">Run this in your terminal</span>
          </div>
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy command'}
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        <pre className="code-block">
          <code>{command}</code>
        </pre>
        {copyError ? <p className="field-error">{copyError}</p> : null}
      </CardBody>
    </Card>
  );
}

/* ---------- Loading skeleton with reserved height ---------- */

function LessonSkeleton() {
  return (
    <div className="stack" aria-hidden="true">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-block" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-block" />
    </div>
  );
}

/* ---------- Page ---------- */

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const lessonId = Array.isArray(params?.lessonId) ? params.lessonId[0] : params?.lessonId;

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('not_started');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!lessonId) return undefined;

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getLesson(lessonId)
      .then((data) => {
        if (cancelled) return;
        setLesson(data);
        setStatus(data?.status || 'not_started');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setLesson(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lessonId, reloadKey]);

  const handleMarkComplete = useCallback(async () => {
    if (!lessonId) return;
    setSaving(true);
    setSaveError('');
    try {
      const next = status === 'completed' ? 'in_progress' : 'completed';
      await api.setLessonProgress(lessonId, next);
      setStatus(next);
    } catch (err) {
      if (err && err.status === 401) {
        setSaveError('Your session expired. Please log in again to save progress.');
      } else {
        setSaveError(err?.message || 'Could not save your progress. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }, [lessonId, status]);

  if (loading || authLoading) {
    return (
      <section className="page-section">
        <PageHeader eyebrow="Lesson" title="Loading lesson…" description="Fetching the lesson content and your progress." />
        <LessonSkeleton />
      </section>
    );
  }

  if (error) {
    const notFound = error.status === 404;
    const unauthorised = error.status === 401;

    return (
      <section className="page-section">
        <EmptyState
          variant="error"
          title={
            notFound
              ? 'We could not find that lesson'
              : unauthorised
              ? 'Log in to open this lesson'
              : 'The lesson could not be loaded'
          }
          description={
            notFound
              ? 'The lesson may have been renamed or removed from its course. Browse the catalogue to pick up where you left off.'
              : unauthorised
              ? 'This lesson is part of an enrolled course. Sign in with your DevOps Academy account to continue.'
              : error.message || 'The training API did not respond. Check your connection and try again.'
          }
          action={
            unauthorised ? (
              <Button as="a" href="/login" variant="primary">
                Log in
              </Button>
            ) : notFound ? (
              <Button as="a" href="/courses" variant="primary">
                Browse courses
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setReloadKey((k) => k + 1)}>
                Retry
              </Button>
            )
          }
        />
      </section>
    );
  }

  if (!lesson) {
    return (
      <section className="page-section">
        <EmptyState
          variant="empty"
          title="Nothing to read here yet"
          description="This lesson has not been published. Pick another module from the catalogue in the meantime."
          action={
            <Button as="a" href="/courses" variant="primary">
              Browse courses
            </Button>
          }
        />
      </section>
    );
  }

  const completed = status === 'completed';
  const courseHref = lesson.course_slug ? `/courses/${lesson.course_slug}` : '/courses';

  return (
    <article className="page-section lesson-page">
      <PageHeader
        eyebrow={lesson.course_title || 'Lesson'}
        title={lesson.title}
        description={`Lesson ${lesson.position || 1}${
          lesson.estimated_minutes ? ` · ${formatDuration(lesson.estimated_minutes)} of focused practice` : ''
        }`}
        actions={
          <Button as={Link} href={courseHref} variant="ghost" size="sm">
            Back to course
          </Button>
        }
      />

      <div className="cluster">
        <Badge tone={completed ? 'success' : 'neutral'} size="sm">
          {completed ? 'Completed' : status === 'in_progress' ? 'In progress' : 'Not started'}
        </Badge>
        {lesson.estimated_minutes ? (
          <Badge tone="neutral" size="sm">
            {formatDuration(lesson.estimated_minutes)}
          </Badge>
        ) : null}
      </div>

      <Card padding="lg">
        <CardBody>
          <MarkdownBody markdown={lesson.content_markdown} />
        </CardBody>
      </Card>

      {lesson.lab_command ? <LabCommand command={lesson.lab_command} /> : null}

      <Card>
        <CardBody>
          {user ? (
            <div className="cluster cluster-between">
              <div className="stack-tight">
                <p className="text-muted text-sm">
                  {completed
                    ? 'Nice work — this lesson is logged against your skill progress.'
                    : 'Finished the walkthrough and the lab? Mark it complete to update your dashboard.'}
                </p>
                {saveError ? <p className="field-error">{saveError}</p> : null}
              </div>
              <Button
                variant={completed ? 'secondary' : 'primary'}
                onClick={handleMarkComplete}
                loading={saving}
                disabled={saving}
              >
                {completed ? 'Mark as in progress' : 'Mark complete'}
              </Button>
            </div>
          ) : (
            <div className="cluster cluster-between">
              <p className="text-muted text-sm">
                Log in to track your progress through this course and unlock the end-of-module quiz.
              </p>
              <Button variant="primary" onClick={() => router.push('/login')}>
                Log in to track progress
              </Button>
            </div>
          )}
        </CardBody>
        <CardFooter>
          <nav className="cluster cluster-between lesson-nav" aria-label="Lesson navigation">
            {lesson.prev_lesson_id ? (
              <Button as={Link} href={`/lessons/${lesson.prev_lesson_id}`} variant="ghost" size="sm">
                ← Previous lesson
              </Button>
            ) : (
              <Button as={Link} href={courseHref} variant="ghost" size="sm">
                ← Course overview
              </Button>
            )}

            {lesson.next_lesson_id ? (
              <Button as={Link} href={`/lessons/${lesson.next_lesson_id}`} variant="primary" size="sm">
                Next lesson →
              </Button>
            ) : lesson.course_slug ? (
              <Button as={Link} href={`/quizzes/${lesson.course_slug}`} variant="primary" size="sm">
                Take the module quiz →
              </Button>
            ) : null}
          </nav>
        </CardFooter>
      </Card>
    </article>
  );
}