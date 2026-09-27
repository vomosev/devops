'use strict';

const { pool } = require('../config/db');
const { HttpError } = require('../middleware/errorHandler');

/**
 * Load a quiz (with questions + options) for a course identified by slug or id.
 * Returns null when the course has no quiz.
 */
async function loadQuizForCourse(courseSlugOrId) {
  const isNumeric = /^\d+$/.test(String(courseSlugOrId));

  const [courseRows] = await pool.query(
    isNumeric
      ? 'SELECT id, slug, title FROM courses WHERE id = ? LIMIT 1'
      : 'SELECT id, slug, title FROM courses WHERE slug = ? LIMIT 1',
    [isNumeric ? Number(courseSlugOrId) : String(courseSlugOrId)]
  );

  if (!courseRows.length) {
    throw new HttpError(404, 'Course not found');
  }

  const course = courseRows[0];

  const [quizRows] = await pool.query(
    'SELECT id, course_id, title, pass_score FROM quizzes WHERE course_id = ? ORDER BY id ASC LIMIT 1',
    [course.id]
  );

  if (!quizRows.length) {
    return { course, quiz: null, questions: [] };
  }

  const quiz = quizRows[0];

  const [questionRows] = await pool.query(
    'SELECT id, quiz_id, position, prompt, explanation FROM quiz_questions WHERE quiz_id = ? ORDER BY position ASC, id ASC',
    [quiz.id]
  );

  let optionRows = [];
  if (questionRows.length) {
    const questionIds = questionRows.map((q) => q.id);
    const placeholders = questionIds.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT id, question_id, label, is_correct FROM quiz_options WHERE question_id IN (${placeholders}) ORDER BY id ASC`,
      questionIds
    );
    optionRows = rows;
  }

  const questions = questionRows.map((q) => ({
    ...q,
    options: optionRows.filter((o) => o.question_id === q.id),
  }));

  return { course, quiz, questions };
}

function stripAnswers(questions) {
  return questions.map((q) => ({
    id: q.id,
    position: q.position,
    prompt: q.prompt,
    options: q.options.map((o) => ({ id: o.id, label: o.label })),
  }));
}

/**
 * GET /api/quizzes/course/:slug
 */
async function getQuiz(req, res, next) {
  try {
    const slug = req.params.slug;
    if (!slug) throw new HttpError(400, 'Course slug is required');

    const { course, quiz, questions } = await loadQuizForCourse(slug);

    if (!quiz) {
      return res.json({
        course: { id: course.id, slug: course.slug, title: course.title },
        quiz: null,
        message: 'No quiz is available for this course yet.',
      });
    }

    let lastAttempt = null;
    if (req.session && req.session.userId) {
      const [attemptRows] = await pool.query(
        'SELECT id, score, passed, created_at FROM quiz_attempts WHERE user_id = ? AND quiz_id = ? ORDER BY created_at DESC, id DESC LIMIT 1',
        [req.session.userId, quiz.id]
      );
      lastAttempt = attemptRows.length
        ? {
            id: attemptRows[0].id,
            score: Number(attemptRows[0].score),
            passed: Boolean(attemptRows[0].passed),
            created_at: attemptRows[0].created_at,
          }
        : null;
    }

    return res.json({
      course: { id: course.id, slug: course.slug, title: course.title },
      quiz: {
        id: quiz.id,
        title: quiz.title,
        pass_score: Number(quiz.pass_score),
        course_id: quiz.course_id,
        question_count: questions.length,
        questions: stripAnswers(questions),
      },
      lastAttempt,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/quizzes/:quizId/submit
 * Body: { answers: { [questionId]: optionId } }
 */
async function submitQuiz(req, res, next) {
  try {
    const quizId = Number(req.params.quizId);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      throw new HttpError(400, 'A valid quiz id is required');
    }

    const body = req.body || {};
    const rawAnswers = body.answers;
    if (!rawAnswers || typeof rawAnswers !== 'object' || Array.isArray(rawAnswers)) {
      throw new HttpError(400, 'answers must be an object mapping questionId to optionId');
    }

    const [quizRows] = await pool.query(
      `SELECT q.id, q.course_id, q.title, q.pass_score, c.slug AS course_slug, c.title AS course_title
         FROM quizzes q
         JOIN courses c ON c.id = q.course_id
        WHERE q.id = ? LIMIT 1`,
      [quizId]
    );

    if (!quizRows.length) {
      throw new HttpError(404, 'Quiz not found');
    }
    const quiz = quizRows[0];

    const [questionRows] = await pool.query(
      'SELECT id, position, prompt, explanation FROM quiz_questions WHERE quiz_id = ? ORDER BY position ASC, id ASC',
      [quizId]
    );

    if (!questionRows.length) {
      throw new HttpError(400, 'This quiz has no questions yet');
    }

    const questionIds = questionRows.map((q) => q.id);
    const placeholders = questionIds.map(() => '?').join(',');
    const [optionRows] = await pool.query(
      `SELECT id, question_id, label, is_correct FROM quiz_options WHERE question_id IN (${placeholders}) ORDER BY id ASC`,
      questionIds
    );

    const normalizedAnswers = {};
    for (const key of Object.keys(rawAnswers)) {
      const qId = Number(key);
      const oId = Number(rawAnswers[key]);
      if (Number.isInteger(qId) && Number.isInteger(oId)) {
        normalizedAnswers[qId] = oId;
      }
    }

    let correctCount = 0;
    const results = questionRows.map((question) => {
      const options = optionRows.filter((o) => o.question_id === question.id);
      const correctOption = options.find((o) => Number(o.is_correct) === 1) || null;
      const selectedOptionId = Object.prototype.hasOwnProperty.call(normalizedAnswers, question.id)
        ? normalizedAnswers[question.id]
        : null;
      const selectedOption = options.find((o) => o.id === selectedOptionId) || null;
      const isCorrect = Boolean(correctOption && selectedOption && correctOption.id === selectedOption.id);
      if (isCorrect) correctCount += 1;

      return {
        questionId: question.id,
        position: question.position,
        prompt: question.prompt,
        explanation: question.explanation,
        selectedOptionId: selectedOption ? selectedOption.id : null,
        selectedLabel: selectedOption ? selectedOption.label : null,
        correctOptionId: correctOption ? correctOption.id : null,
        correctLabel: correctOption ? correctOption.label : null,
        isCorrect,
      };
    });

    const total = questionRows.length;
    const score = Math.round((correctCount / total) * 100);
    const passScore = Number(quiz.pass_score) || 70;
    const passed = score >= passScore;

    let attemptId = null;
    try {
      const [insertResult] = await pool.query(
        'INSERT INTO quiz_attempts (user_id, quiz_id, score, passed, answers, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [req.userId, quiz.id, score, passed ? 1 : 0, JSON.stringify(normalizedAnswers)]
      );
      attemptId = insertResult.insertId;
    } catch (dbErr) {
      // Persisting the attempt should not hide the grading result from the learner.
      console.error('Failed to store quiz attempt:', dbErr.message);
    }

    return res.json({
      attemptId,
      quizId: quiz.id,
      quizTitle: quiz.title,
      course: { id: quiz.course_id, slug: quiz.course_slug, title: quiz.course_title },
      score,
      passScore,
      passed,
      correctCount,
      totalQuestions: total,
      results,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/quizzes/:quizId/attempts
 */
async function listAttempts(req, res, next) {
  try {
    const quizId = Number(req.params.quizId);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      throw new HttpError(400, 'A valid quiz id is required');
    }

    const [rows] = await pool.query(
      `SELECT id, quiz_id, score, passed, answers, created_at
         FROM quiz_attempts
        WHERE user_id = ? AND quiz_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 50`,
      [req.userId, quizId]
    );

    const attempts = rows.map((row) => {
      let answers = {};
      if (row.answers) {
        if (typeof row.answers === 'object') {
          answers = row.answers;
        } else {
          try {
            answers = JSON.parse(row.answers);
          } catch (parseErr) {
            answers = {};
          }
        }
      }
      return {
        id: row.id,
        quizId: row.quiz_id,
        score: Number(row.score),
        passed: Boolean(row.passed),
        answers,
        created_at: row.created_at,
      };
    });

    const best = attempts.reduce((acc, a) => (acc === null || a.score > acc ? a.score : acc), null);

    return res.json({ attempts, count: attempts.length, bestScore: best });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getQuiz,
  submitQuiz,
  listAttempts,
};