const { pool } = require('../config/db');
const { HttpError } = require('../middleware/errorHandler');

const VALID_STATUSES = ['not_started', 'in_progress', 'completed'];

async function getCourseCompletion(userId, courseId) {
  const [[totals]] = await pool.query(
    'SELECT COUNT(*) AS total FROM lessons WHERE course_id = ?',
    [courseId]
  );
  const [[done]] = await pool.query(
    "SELECT COUNT(*) AS completed FROM lesson_progress WHERE user_id = ? AND course_id = ? AND status = 'completed'",
    [userId, courseId]
  );
  const total = Number(totals?.total || 0);
  const completed = Number(done?.completed || 0);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percent };
}

/**
 * POST /api/progress/lesson/:lessonId  { status }
 */
async function setLessonProgress(req, res, next) {
  try {
    const lessonId = Number(req.params.lessonId);
    if (!Number.isInteger(lessonId) || lessonId <= 0) {
      throw new HttpError(400, 'A valid lesson id is required');
    }

    const status = String(req.body?.status || 'completed').trim();
    if (!VALID_STATUSES.includes(status)) {
      throw new HttpError(400, `status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const [lessonRows] = await pool.query(
      `SELECT l.id, l.course_id, l.title, l.position, c.slug AS course_slug, c.title AS course_title
         FROM lessons l
         JOIN courses c ON c.id = l.course_id
        WHERE l.id = ?
        LIMIT 1`,
      [lessonId]
    );
    const lesson = lessonRows[0];
    if (!lesson) throw new HttpError(404, 'Lesson not found');

    // Auto-enrol the learner if they are not enrolled yet.
    await pool.query(
      'INSERT IGNORE INTO enrollments (user_id, course_id, enrolled_at) VALUES (?, ?, NOW())',
      [req.userId, lesson.course_id]
    );

    const completedAt = status === 'completed' ? new Date() : null;

    await pool.query(
      `INSERT INTO lesson_progress (user_id, lesson_id, course_id, status, completed_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         course_id = VALUES(course_id),
         completed_at = VALUES(completed_at)`,
      [req.userId, lesson.id, lesson.course_id, status, completedAt]
    );

    const progress = await getCourseCompletion(req.userId, lesson.course_id);

    // Find the next incomplete lesson in this course, if any.
    const [nextRows] = await pool.query(
      `SELECT l.id, l.title, l.position
         FROM lessons l
         LEFT JOIN lesson_progress lp
                ON lp.lesson_id = l.id AND lp.user_id = ?
        WHERE l.course_id = ?
          AND (lp.status IS NULL OR lp.status <> 'completed')
        ORDER BY l.position ASC, l.id ASC
        LIMIT 1`,
      [req.userId, lesson.course_id]
    );

    res.json({
      lessonId: lesson.id,
      status,
      course: {
        id: lesson.course_id,
        slug: lesson.course_slug,
        title: lesson.course_title
      },
      progress,
      nextLesson: nextRows[0] || null
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/progress/course/:slug
 */
async function getCourseProgress(req, res, next) {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) throw new HttpError(400, 'A course slug is required');

    const [courseRows] = await pool.query(
      'SELECT id, slug, title FROM courses WHERE slug = ? LIMIT 1',
      [slug]
    );
    const course = courseRows[0];
    if (!course) throw new HttpError(404, 'Course not found');

    const [[enrolledRow]] = await pool.query(
      'SELECT COUNT(*) AS c FROM enrollments WHERE user_id = ? AND course_id = ?',
      [req.userId, course.id]
    );

    const [lessons] = await pool.query(
      `SELECT l.id, l.title, l.position, l.estimated_minutes,
              COALESCE(lp.status, 'not_started') AS status,
              lp.completed_at
         FROM lessons l
         LEFT JOIN lesson_progress lp
                ON lp.lesson_id = l.id AND lp.user_id = ?
        WHERE l.course_id = ?
        ORDER BY l.position ASC, l.id ASC`,
      [req.userId, course.id]
    );

    const progress = await getCourseCompletion(req.userId, course.id);
    const nextLesson = lessons.find((l) => l.status !== 'completed') || null;

    res.json({
      course,
      enrolled: Number(enrolledRow?.c || 0) > 0,
      lessons,
      progress,
      nextLesson
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/progress/dashboard
 */
async function getDashboard(req, res, next) {
  try {
    const userId = req.userId;

    const [[enrolledRow]] = await pool.query(
      'SELECT COUNT(*) AS enrolled_courses FROM enrollments WHERE user_id = ?',
      [userId]
    );

    const [[lessonsRow]] = await pool.query(
      "SELECT COUNT(*) AS lessons_completed FROM lesson_progress WHERE user_id = ? AND status = 'completed'",
      [userId]
    );

    const [[minutesRow]] = await pool.query(
      `SELECT COALESCE(SUM(l.estimated_minutes), 0) AS minutes_learned
         FROM lesson_progress lp
         JOIN lessons l ON l.id = lp.lesson_id
        WHERE lp.user_id = ? AND lp.status = 'completed'`,
      [userId]
    );

    const [[quizRow]] = await pool.query(
      `SELECT COUNT(*) AS attempts,
              COALESCE(ROUND(AVG(score)), 0) AS average_score,
              COALESCE(SUM(passed), 0) AS passed_count
         FROM quiz_attempts
        WHERE user_id = ?`,
      [userId]
    );

    const [courses] = await pool.query(
      `SELECT c.id, c.slug, c.title, c.summary, c.level, c.duration_minutes, c.tools,
              t.title AS track_title, t.slug AS track_slug, t.color_token,
              e.enrolled_at,
              (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count,
              (SELECT COUNT(*) FROM lesson_progress lp
                WHERE lp.user_id = ? AND lp.course_id = c.id AND lp.status = 'completed') AS completed_count
         FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         LEFT JOIN tracks t ON t.id = c.track_id
        WHERE e.user_id = ?
        ORDER BY e.enrolled_at DESC`,
      [userId, userId]
    );

    const enrolledCourses = courses.map((c) => {
      const total = Number(c.lesson_count || 0);
      const completed = Number(c.completed_count || 0);
      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        summary: c.summary,
        level: c.level,
        duration_minutes: c.duration_minutes,
        tools: c.tools,
        track_title: c.track_title,
        track_slug: c.track_slug,
        color_token: c.color_token,
        enrolled_at: c.enrolled_at,
        lesson_count: total,
        completed_count: completed,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    });

    // Continue learning: most recently touched course that still has work left,
    // falling back to the most recent enrollment.
    let continueLearning = null;
    const [recentTouched] = await pool.query(
      `SELECT lp.course_id, MAX(COALESCE(lp.completed_at, NOW())) AS last_touched
         FROM lesson_progress lp
        WHERE lp.user_id = ?
        GROUP BY lp.course_id
        ORDER BY last_touched DESC`,
      [userId]
    );

    const orderedCandidates = [];
    for (const row of recentTouched) {
      const match = enrolledCourses.find((c) => c.id === row.course_id);
      if (match) orderedCandidates.push(match);
    }
    for (const c of enrolledCourses) {
      if (!orderedCandidates.some((x) => x.id === c.id)) orderedCandidates.push(c);
    }

    const target =
      orderedCandidates.find((c) => c.percent < 100) || orderedCandidates[0] || null;

    if (target) {
      const [nextRows] = await pool.query(
        `SELECT l.id, l.title, l.position, l.estimated_minutes
           FROM lessons l
           LEFT JOIN lesson_progress lp
                  ON lp.lesson_id = l.id AND lp.user_id = ?
          WHERE l.course_id = ?
            AND (lp.status IS NULL OR lp.status <> 'completed')
          ORDER BY l.position ASC, l.id ASC
          LIMIT 1`,
        [userId, target.id]
      );
      continueLearning = {
        course: target,
        nextLesson: nextRows[0] || null,
        percent: target.percent
      };
    }

    const [recentLessons] = await pool.query(
      `SELECT 'lesson' AS type, l.title AS title, c.title AS course_title, c.slug AS course_slug,
              lp.status AS detail, COALESCE(lp.completed_at, NOW()) AS occurred_at, l.id AS ref_id
         FROM lesson_progress lp
         JOIN lessons l ON l.id = lp.lesson_id
         JOIN courses c ON c.id = lp.course_id
        WHERE lp.user_id = ?
        ORDER BY occurred_at DESC
        LIMIT 8`,
      [userId]
    );

    const [recentQuizzes] = await pool.query(
      `SELECT 'quiz' AS type, q.title AS title, c.title AS course_title, c.slug AS course_slug,
              CONCAT(qa.score, '%') AS detail, qa.created_at AS occurred_at, qa.quiz_id AS ref_id,
              qa.passed
         FROM quiz_attempts qa
         JOIN quizzes q ON q.id = qa.quiz_id
         JOIN courses c ON c.id = q.course_id
        WHERE qa.user_id = ?
        ORDER BY qa.created_at DESC
        LIMIT 8`,
      [userId]
    );

    const recentActivity = [...recentLessons, ...recentQuizzes]
      .sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at))
      .slice(0, 10);

    res.json({
      stats: {
        enrolledCourses: Number(enrolledRow?.enrolled_courses || 0),
        lessonsCompleted: Number(lessonsRow?.lessons_completed || 0),
        minutesLearned: Number(minutesRow?.minutes_learned || 0),
        quizAttempts: Number(quizRow?.attempts || 0),
        averageQuizScore: Number(quizRow?.average_score || 0),
        quizzesPassed: Number(quizRow?.passed_count || 0)
      },
      continueLearning,
      enrolledCourses,
      recentActivity
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  setLessonProgress,
  getCourseProgress,
  getDashboard
};