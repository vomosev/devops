const { pool } = require('../config/db');
const { HttpError } = require('../middleware/errorHandler');

/**
 * GET /api/lessons/:id
 * Returns a lesson with its course context, prev/next navigation and, when a
 * session is present, the requesting user's progress status for that lesson.
 */
async function getLesson(req, res, next) {
  try {
    const lessonId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(lessonId) || lessonId <= 0) {
      throw new HttpError(400, 'A valid lesson id is required');
    }

    const userId = req.session && req.session.userId ? req.session.userId : null;

    const [rows] = await pool.query(
      `SELECT l.id,
              l.course_id,
              l.position,
              l.title,
              l.slug,
              l.content_markdown,
              l.estimated_minutes,
              l.lab_command,
              c.slug  AS course_slug,
              c.title AS course_title,
              t.title AS track_title
         FROM lessons l
         JOIN courses c ON c.id = l.course_id
         LEFT JOIN tracks t ON t.id = c.track_id
        WHERE l.id = ?
        LIMIT 1`,
      [lessonId]
    );

    if (!rows.length) {
      throw new HttpError(404, 'Lesson not found');
    }

    const lesson = rows[0];

    const [siblings] = await pool.query(
      `SELECT id, position, title, estimated_minutes
         FROM lessons
        WHERE course_id = ?
        ORDER BY position ASC, id ASC`,
      [lesson.course_id]
    );

    const index = siblings.findIndex((row) => row.id === lesson.id);
    const previous = index > 0 ? siblings[index - 1] : null;
    const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;

    let status = 'not_started';
    let completedAt = null;
    let enrolled = false;
    let quizId = null;

    const [quizRows] = await pool.query(
      'SELECT id FROM quizzes WHERE course_id = ? ORDER BY id ASC LIMIT 1',
      [lesson.course_id]
    );
    if (quizRows.length) {
      quizId = quizRows[0].id;
    }

    if (userId) {
      const [progressRows] = await pool.query(
        `SELECT status, completed_at
           FROM lesson_progress
          WHERE user_id = ? AND lesson_id = ?
          LIMIT 1`,
        [userId, lesson.id]
      );
      if (progressRows.length) {
        status = progressRows[0].status;
        completedAt = progressRows[0].completed_at;
      }

      const [enrollRows] = await pool.query(
        `SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? LIMIT 1`,
        [userId, lesson.course_id]
      );
      enrolled = enrollRows.length > 0;
    }

    let completedCount = 0;
    if (userId) {
      const [completedRows] = await pool.query(
        `SELECT COUNT(*) AS completed
           FROM lesson_progress
          WHERE user_id = ? AND course_id = ? AND status = 'completed'`,
        [userId, lesson.course_id]
      );
      completedCount = Number(completedRows[0].completed) || 0;
    }

    const totalLessons = siblings.length;
    const percentComplete =
      totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    res.json({
      lesson: {
        id: lesson.id,
        courseId: lesson.course_id,
        courseSlug: lesson.course_slug,
        courseTitle: lesson.course_title,
        trackTitle: lesson.track_title,
        position: lesson.position,
        title: lesson.title,
        slug: lesson.slug,
        content: lesson.content_markdown,
        estimatedMinutes: lesson.estimated_minutes,
        labCommand: lesson.lab_command,
        status,
        completedAt
      },
      navigation: {
        previous: previous ? { id: previous.id, title: previous.title, position: previous.position } : null,
        next: next ? { id: next.id, title: next.title, position: next.position } : null,
        totalLessons,
        quizId
      },
      course: {
        id: lesson.course_id,
        slug: lesson.course_slug,
        title: lesson.course_title,
        enrolled,
        completedLessons: completedCount,
        totalLessons,
        percentComplete
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET lessons for a course identified either by numeric id or slug.
 * Used internally by the courses routes and exposed for convenience.
 */
async function listLessonsByCourse(req, res, next) {
  try {
    const identifier = req.params.courseId || req.params.slug || req.query.course;
    if (!identifier) {
      throw new HttpError(400, 'A course id or slug is required');
    }

    const numericId = Number.parseInt(identifier, 10);
    const isNumeric = Number.isInteger(numericId) && String(numericId) === String(identifier);

    const [courseRows] = await pool.query(
      isNumeric
        ? 'SELECT id, slug, title FROM courses WHERE id = ? LIMIT 1'
        : 'SELECT id, slug, title FROM courses WHERE slug = ? LIMIT 1',
      [isNumeric ? numericId : identifier]
    );

    if (!courseRows.length) {
      throw new HttpError(404, 'Course not found');
    }

    const course = courseRows[0];
    const userId = req.session && req.session.userId ? req.session.userId : null;

    let rows;
    if (userId) {
      [rows] = await pool.query(
        `SELECT l.id,
                l.position,
                l.title,
                l.slug,
                l.estimated_minutes,
                COALESCE(lp.status, 'not_started') AS status,
                lp.completed_at
           FROM lessons l
           LEFT JOIN lesson_progress lp
                  ON lp.lesson_id = l.id AND lp.user_id = ?
          WHERE l.course_id = ?
          ORDER BY l.position ASC, l.id ASC`,
        [userId, course.id]
      );
    } else {
      [rows] = await pool.query(
        `SELECT l.id,
                l.position,
                l.title,
                l.slug,
                l.estimated_minutes,
                'not_started' AS status,
                NULL AS completed_at
           FROM lessons l
          WHERE l.course_id = ?
          ORDER BY l.position ASC, l.id ASC`,
        [course.id]
      );
    }

    res.json({
      course: { id: course.id, slug: course.slug, title: course.title },
      lessons: rows.map((row) => ({
        id: row.id,
        position: row.position,
        title: row.title,
        slug: row.slug,
        estimatedMinutes: row.estimated_minutes,
        status: row.status,
        completedAt: row.completed_at
      }))
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getLesson, listLessonsByCourse };