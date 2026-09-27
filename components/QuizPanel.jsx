'use client';

import { useEffect, useMemo, useState } from 'react';
import Card, { CardHeader, CardBody, CardFooter } from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import ProgressBar from './ui/ProgressBar';

export default function QuizPanel({ quiz, onSubmit, submitting = false, result = null, onRetake }) {
  const questions = useMemo(() => (Array.isArray(quiz?.questions) ? quiz.questions : []), [quiz]);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    setAnswers({});
  }, [quiz?.id]);

  const answeredCount = questions.filter((q) => answers[q.id] != null).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  const resultsByQuestion = useMemo(() => {
    const map = new Map();
    const list = Array.isArray(result?.results) ? result.results : [];
    list.forEach((entry) => {
      const key = entry.questionId ?? entry.question_id ?? entry.id;
      if (key != null) map.set(String(key), entry);
    });
    return map;
  }, [result]);

  function selectOption(questionId, optionId) {
    if (result || submitting) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!allAnswered || submitting || result) return;
    if (typeof onSubmit === 'function') onSubmit(answers);
  }

  function handleRetake() {
    setAnswers({});
    if (typeof onRetake === 'function') onRetake();
  }

  if (!quiz || questions.length === 0) {
    return (
      <Card padding="lg">
        <CardBody>
          <h2>No questions available yet</h2>
          <p className="text-muted">
            This module&apos;s knowledge check is still being authored. Work through the lessons and
            check back soon.
          </p>
        </CardBody>
      </Card>
    );
  }

  const passScore = quiz.pass_score ?? quiz.passScore ?? 70;
  const score = result ? Number(result.score ?? 0) : 0;
  const passed = result ? Boolean(result.passed) : false;

  return (
    <div className="stack quiz-panel">
      {result ? (
        <Card padding="lg" className="quiz-result-card">
          <CardHeader>
            <div className="cluster cluster-between">
              <h2>{passed ? 'Module passed' : 'Not quite there yet'}</h2>
              <Badge tone={passed ? 'success' : 'danger'} size="md">
                {passed ? 'Passed' : 'Failed'}
              </Badge>
            </div>
          </CardHeader>
          <CardBody>
            <p>
              You scored <strong>{score}%</strong>. A score of {passScore}% or higher is required to
              clear this knowledge check.
            </p>
            <ProgressBar
              value={score}
              max={100}
              label="Your score"
              showValue
              size="lg"
            />
          </CardBody>
          <CardFooter>
            <div className="cluster">
              <Button variant="primary" size="md" onClick={handleRetake}>
                Retake quiz
              </Button>
            </div>
          </CardFooter>
        </Card>
      ) : (
        <Card padding="md" className="quiz-progress-card">
          <CardBody>
            <ProgressBar
              value={answeredCount}
              max={questions.length}
              label={`Answered ${answeredCount} of ${questions.length} questions`}
              showValue={false}
              size="md"
            />
          </CardBody>
        </Card>
      )}

      <form className="stack" onSubmit={handleSubmit} noValidate>
        {questions.map((question, index) => {
          const qid = String(question.id);
          const entry = resultsByQuestion.get(qid);
          const correctOptionId =
            entry?.correctOptionId ?? entry?.correct_option_id ?? null;
          const selectedId = result
            ? entry?.selectedOptionId ?? entry?.selected_option_id ?? answers[question.id]
            : answers[question.id];
          const isCorrect = entry ? Boolean(entry.correct ?? entry.isCorrect) : null;
          const options = Array.isArray(question.options) ? question.options : [];

          return (
            <Card key={qid} padding="lg" className="quiz-question-card">
              <CardHeader>
                <div className="cluster cluster-between">
                  <span className="badge badge-neutral badge-sm">
                    Question {index + 1} of {questions.length}
                  </span>
                  {entry ? (
                    <Badge tone={isCorrect ? 'success' : 'danger'} size="sm">
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </Badge>
                  ) : null}
                </div>
                <h3 className="user-text">{question.prompt}</h3>
              </CardHeader>

              <CardBody>
                <ul className="quiz-options" role="radiogroup" aria-label={question.prompt}>
                  {options.map((option) => {
                    const oid = String(option.id);
                    const checked = String(selectedId ?? '') === oid;
                    const showCorrect =
                      entry && correctOptionId != null && String(correctOptionId) === oid;
                    const showWrong = entry && checked && !showCorrect;
                    const stateClass = showCorrect
                      ? ' quiz-option-correct'
                      : showWrong
                      ? ' quiz-option-wrong'
                      : '';

                    return (
                      <li key={oid} className="quiz-option-item">
                        <label
                          className={`quiz-option${checked ? ' quiz-option-selected' : ''}${stateClass}`}
                          htmlFor={`q${qid}-o${oid}`}
                        >
                          <input
                            type="radio"
                            id={`q${qid}-o${oid}`}
                            name={`question-${qid}`}
                            className="quiz-option-input"
                            value={oid}
                            checked={checked}
                            disabled={submitting || Boolean(result)}
                            onChange={() => selectOption(question.id, option.id)}
                          />
                          <span className="quiz-option-marker" aria-hidden="true" />
                          <span className="quiz-option-label user-text">{option.label}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>

                {entry && (entry.explanation || question.explanation) ? (
                  <p className="quiz-explanation user-text">
                    {entry.explanation || question.explanation}
                  </p>
                ) : null}
              </CardBody>
            </Card>
          );
        })}

        {!result ? (
          <div className="cluster cluster-between quiz-actions">
            <p className="text-muted">
              {allAnswered
                ? 'All questions answered — submit when you are ready.'
                : `Answer all ${questions.length} questions to enable submission.`}
            </p>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              disabled={!allAnswered || submitting}
            >
              Submit answers
            </Button>
          </div>
        ) : null}
      </form>
    </div>
  );
}