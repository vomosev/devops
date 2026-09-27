'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getQuiz, submitQuiz, ApiError } from '../../../lib/api';
import { useAuth } from '../../../lib/AuthContext';
import QuizPanel from '../../../components/QuizPanel';
import PageHeader from '../../../components/layout/PageHeader';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import EmptyState from '../../../components/ui/EmptyState';
import Badge from '../../../components/ui/Badge';
import Card, { CardBody } from '../../../components/ui/Card';

export default function QuizPage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : '';
  const { user, loading: authLoading } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null);

  const loadQuiz = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await getQuiz(slug);
      if (!data || !data.quiz) {
        setQuiz(null);
        setNotFound(true);
      } else {
        setQuiz(data.quiz);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
        setQuiz(null);
      } else {
        setError(err && err.message ? err.message : 'We could not reach the training API.');
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const handleSubmit = useCallback(
    async (answers) => {
      if (!quiz) return;
      setSubmitting(true);
      setSubmitError(null);
      try {
        const data = await submitQuiz(quiz.id, answers);
        setResult(data && data.result ? data.result : data);
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setSubmitError('Your session expired. Please log in again to record this attempt.');
        } else {
          setSubmitError(err && err.message ? err.message : 'Submitting your answers failed. Try again.');
        }
      } finally {
        setSubmitting(false);
      }
    },
    [quiz]
  );

  const handleRetake = useCallback(() => {
    setResult(null);
    setSubmitError(null);
  }, []);

  if (authLoading || loading) {
    return (
      <section className="stack">
        <PageHeader
          eyebrow="Module assessment"
          title="Loading quiz"
          description="Fetching the questions for this module from the training API."
        />
        <div className="loading-panel">
          <Spinner size="lg" label="Loading quiz" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="stack">
        <PageHeader eyebrow="Module assessment" title="Quiz unavailable" />
        <EmptyState
          variant="error"
          title="We couldn't load this quiz"
          description={error}
          action={
            <Button variant="primary" onClick={loadQuiz}>
              Retry
            </Button>
          }
        />
      </section>
    );
  }

  if (notFound || !quiz) {
    return (
      <section className="stack">
        <PageHeader eyebrow="Module assessment" title="No quiz for this course yet" />
        <EmptyState
          title="This module has no assessment published"
          description="The instructor hasn't attached an end-of-module quiz to this course yet. Work through the lessons and check back soon."
          action={
            <Button as={Link} href={`/courses/${slug}`} variant="primary">
              Back to course
            </Button>
          }
        />
      </section>
    );
  }

  if (!user) {
    return (
      <section className="stack">
        <PageHeader
          eyebrow="Module assessment"
          title={quiz.title || 'Module quiz'}
          description="Sign in to take this assessment and record your score against your skill profile."
        />
        <EmptyState
          title="Log in to take the quiz"
          description="Quiz attempts are saved to your learner profile, so you need an account before you can start."
          action={
            <div className="cluster">
              <Button as={Link} href="/login" variant="primary">
                Log in
              </Button>
              <Button as={Link} href="/signup" variant="secondary">
                Create account
              </Button>
            </div>
          }
        />
      </section>
    );
  }

  const passScore = typeof quiz.pass_score === 'number' ? quiz.pass_score : 70;
  const questionCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0;

  return (
    <section className="stack">
      <PageHeader
        eyebrow="Module assessment"
        title={quiz.title || 'Module quiz'}
        description={`${questionCount} multiple-choice questions. You need ${passScore}% or higher to pass and mark this module complete.`}
        actions={
          <Button as={Link} href={`/courses/${slug}`} variant="ghost">
            Back to course
          </Button>
        }
      />

      {result ? (
        <Card>
          <CardBody>
            <div className="cluster quiz-result-head">
              <span className="quiz-score">{Math.round(result.score ?? 0)}%</span>
              <Badge tone={result.passed ? 'success' : 'danger'} size="md">
                {result.passed ? 'Passed' : 'Not passed yet'}
              </Badge>
            </div>
            <p>
              {result.passed
                ? `Nice work — you scored above the ${passScore}% pass mark. Your attempt has been saved to your dashboard.`
                : `You need ${passScore}% to pass. Review the explanations below, revisit the lessons, and retake the quiz when you're ready.`}
            </p>
            <div className="cluster">
              <Button variant="primary" onClick={handleRetake}>
                Retake quiz
              </Button>
              <Button as={Link} href={`/courses/${slug}`} variant="secondary">
                Return to course
              </Button>
              <Button as={Link} href="/dashboard" variant="ghost">
                View dashboard
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {submitError ? (
        <Card>
          <CardBody>
            <p className="field-error" role="alert">
              {submitError}
            </p>
          </CardBody>
        </Card>
      ) : null}

      <QuizPanel
        quiz={quiz}
        onSubmit={handleSubmit}
        submitting={submitting}
        result={result}
        onRetake={handleRetake}
      />
    </section>
  );
}