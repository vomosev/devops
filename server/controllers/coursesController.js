'use strict';

const { pool } = require('../config/db');
const { HttpError } = require('../middleware/errorHandler');

/**
 * Safely parse the `tools` column which may be stored as a JSON array string
 * or a simple comma separated list.
 */
function parseTools(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') {
    try {
      return Object.values(raw).map((v) => String(v));
    } catch (_err) {
      return [];
    }
  }
  const text = String(raw).trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v));
    } catch (_err) {
      /* fall through to comma parsing */
    }
  }
  return text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function toPercent(completed, total) {
  const c = Number(completed) || 0;
  const t = Number(total) || 0;
  if (t <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((c / t) * 100)));
}

/**
 * GET /api/courses/tracks
 * All tracks plus the number of published courses in each.
 */
async function listTracks(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT t.id,
              t.slug,
              t.title,
              t.description,
              t.color_token,
              COUNT(c.id) AS course_count
         FROM tracks t
         LEFT JOIN courses c
                ON c.track_id = t.id AND c.is_published = 1
        GROUP BY t.id, t.slug, t.title, t.description, t.color_token
        ORDER BY t.title ASC`
    );

    res.json({
      tracks: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        colorToken: row.color_token,
        courseCount: Number(row.course_count) || 0,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/courses?track=&level=&q=
 * Published courses with track info, lesson counts and (when signed in)
 * enrollment / progress information for the current user.
 */
async function listCourses(req, res, next) {
  try {
    const { track, level, q } = req.query || {};
    const userId = req.session && req.session.userId ? req.session.userId : null;

    const where = ['c.is_published = 1'];
    const params = [];

    if (track && String(track).trim() && String(track).trim() !== 'all') {
      where.push('t.slug = ?');
      params.push(String(track).trim());
    }

    const allowedLevels = ['beginner', 'intermediate', 'advanced'];
    if (level && allowedLevels.includes(String(level).trim().toLowerCase())) {
      where.push('c.level = ?');
      params.push(String(level).trim().toLowerCase());
    }

    if (q && String(q).trim()) {
      const like = `%${String(q).trim()}%`;
      where.push('(c.title LIKE ? OR c.summary LIKE ? OR c.description LIKE ? OR c.tools LIKE ?)');
      params.push(like, like, like, like);
    }

    const sql = `
      SELECT c.id,
             c.slug,
             c.title,
             c.summary,
             c.level,
             c.duration_minutes,
             c.tools,
             c.created_at,
             t.id   AS track_id,
             t.slug AS track_slug,
             t.title AS track_title,
             t.color_token AS track_color,
             (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count,
             (SELECT COALESCE(SUM(l2.estimated_minutes), 0) FROM lessons l2 WHERE l2.course_id = c.id) AS lesson_minutes,
             (SELECT q.id FROM quizzes q WHERE q.course_id = c.id ORDER BY q.id ASC LIMIT 1) AS quiz_id
        FROM courses c
        LEFT JOIN tracks t ON t.id = c.track_id
       WHERE ${where.join(' AND ')}
       ORDER BY t.title ASC, c.title ASC`;

    const [rows] = await pool.query(sql, params);

    let enrollmentMap = new Map();
    let progressMap = new Map();

    if (userId && rows.length > 0) {
      const ids = rows.map((r) => r.id);
      const placeholders = ids.map(() => '?').join(',');

      const [enrollRows] = await pool.query(
        `SELECT course_id, enrolled_at FROM enrollments WHERE user_id = ? AND course_id IN (${placeholders})`,
        [userId, ...ids]
      );
      enrollmentMap = new Map(enrollRows.map((r) => [r.course_id, r.enrolled_at]));

      const [progressRows] = await pool.query(
        `SELECT course_id, COUNT(*) AS completed
           FROM lesson_progress
          WHERE user_id = ? AND status = 'completed' AND course_id IN (${placeholders})
          GROUP BY course_id`,
        [userId, ...ids]
      );
      progressMap = new Map(progressRows.map((r) => [r.course_id, Number(r.completed) || 0]));
    }

    const courses = rows.map((row) => {
      const lessonCount = Number(row.lesson_count) || 0;
      const completed = progressMap.get(row.id) || 0;
      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        summary: row.summary,
        level: row.level,
        durationMinutes: Number(row.duration_minutes) || Number(row.lesson_minutes) || 0,
        tools: parseTools(row.tools),
        createdAt: row.created_at,
        quizId: row.quiz_id || null,
        lessonCount,
        track: row.track_id
          ? {
              id: row.track_id,
              slug: row.track_slug,
              title: row.track_title,
              colorToken: row.track_color,
            }
          : null,
        enrolled: enrollmentMap.has(row.id),
        enrolledAt: enrollmentMap.get(row.id) || null,
        completedLessons: completed,
        progressPercent: toPercent(completed, lessonCount),
      };
    });

    res.json({ courses, count: courses.length });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/courses/:slug
 */
async function getCourseBySlug(req, res, next) {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) throw new HttpError(400, 'A course slug is required');

    const userId = req.session && req.session.userId ? req.session.userId : null;

    const [courseRows] = await pool.query(
      `SELECT c.id,
              c.slug,
              c.title,
              c.summary,
              c.description,
              c.level,
              c.duration_minutes,
              c.tools,
              c.is_published,
              c.created_at,
              t.id AS track_id,
              t.slug AS track_slug,
              t.title AS track_title,
              t.color_token AS track_color
         FROM courses c
         LEFT JOIN tracks t ON t.id = c.track_id
        WHERE c.slug = ?
        LIMIT 1`,
      [slug]
    );

    if (!courseRows.length) throw new HttpError(404, 'Course not found');
    const row = courseRows[0];

    const [lessonRows] = await pool.query(
      `SELECT l.id,
              l.position,
              l.title,
              l.slug,
              l.estimated_minutes,
              l.lab_command
         FROM lessons l
        WHERE l.course_id = ?
        ORDER BY l.position ASC, l.id ASC`,
      [row.id]
    );

    const [quizRows] = await pool.query(
      `SELECT id, title, pass_score FROM quizzes WHERE course_id = ? ORDER BY id ASC LIMIT 1`,
      [row.id]
    );

    let statusByLesson = new Map();
    let enrolled = false;
    let enrolledAt = null;

    if (userId) {
      const [enrollRows] = await pool.query(
        'SELECT enrolled_at FROM enrollments WHERE user_id = ? AND course_id = ? LIMIT 1',
        [userId, row.id]
      );
      if (enrollRows.length) {
        enrolled = true;
        enrolledAt = enrollRows[0].enrolled_at;
      }

      if (lessonRows.length) {
        const [progressRows] = await pool.query(
          `SELECT lesson_id, status, completed_at
             FROM lesson_progress
            WHERE user_id = ? AND course_id = ?`,
          [userId, row.id]
        );
        statusByLesson = new Map(progressRows.map((p) => [p.lesson_id, p]));
      }
    }

    const lessons = lessonRows.map((lesson) => {
      const progress = statusByLesson.get(lesson.id);
      return {
        id: lesson.id,
        position: lesson.position,
        title: lesson.title,
        slug: lesson.slug,
        estimatedMinutes: Number(lesson.estimated_minutes) || 0,
        hasLab: Boolean(lesson.lab_command),
        status: progress ? progress.status : 'not_started',
        completedAt: progress ? progress.completed_at : null,
      };
    });

    const completedLessons = lessons.filter((l) => l.status === 'completed').length;
    const nextLesson =
      lessons.find((l) => l.status !== 'completed') || (lessons.length ? lessons[0] : null);

    res.json({
      course: {
        id: row.id,
        slug: row.slug,
        title: row.title,
        summary: row.summary,
        description: row.description,
        level: row.level,
        durationMinutes:
          Number(row.duration_minutes) ||
          lessons.reduce((sum, l) => sum + (l.estimatedMinutes || 0), 0),
        tools: parseTools(row.tools),
        isPublished: Boolean(row.is_published),
        createdAt: row.created_at,
        track: row.track_id
          ? {
              id: row.track_id,
              slug: row.track_slug,
              title: row.track_title,
              colorToken: row.track_color,
            }
          : null,
        lessonCount: lessons.length,
      },
      lessons,
      quiz: quizRows.length
        ? {
            id: quizRows[0].id,
            title: quizRows[0].title,
            passScore: Number(quizRows[0].pass_score) || 0,
          }
        : null,
      enrolled,
      enrolledAt,
      completedLessons,
      progressPercent: toPercent(completedLessons, lessons.length),
      nextLessonId: nextLesson ? nextLesson.id : null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/courses/:slug/enroll
 */
async function enroll(req, res, next) {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) throw new HttpError(400, 'A course slug is required');

    const userId = req.userId || (req.session && req.session.userId);
    if (!userId) throw new HttpError(401, 'Authentication required');

    const [courseRows] = await pool.query(
      'SELECT id, slug, title FROM courses WHERE slug = ? LIMIT 1',
      [slug]
    );
    if (!courseRows.length) throw new HttpError(404, 'Course not found');
    const course = courseRows[0];

    await pool.query(
      'INSERT IGNORE INTO enrollments (user_id, course_id, enrolled_at) VALUES (?, ?, NOW())',
      [userId, course.id]
    );

    const [enrollRows] = await pool.query(
      'SELECT enrolled_at FROM enrollments WHERE user_id = ? AND course_id = ? LIMIT 1',
      [userId, course.id]
    );

    const [lessonRows] = await pool.query(
      'SELECT id FROM lessons WHERE course_id = ? ORDER BY position ASC, id ASC',
      [course.id]
    );

    const [progressRows] = await pool.query(
      `SELECT lesson_id FROM lesson_progress
        WHERE user_id = ? AND course_id = ? AND status = 'completed'`,
      [userId, course.id]
    );
    const completedIds = new Set(progressRows.map((p) => p.lesson_id));
    const next = lessonRows.find((l) => !completedIds.has(l.id)) || lessonRows[0] || null;

    res.status(201).json({
      enrolled: true,
      courseId: course.id,
      courseSlug: course.slug,
      enrolledAt: enrollRows.length ? enrollRows[0].enrolled_at : null,
      completedLessons: completedIds.size,
      progressPercent: toPercent(completedIds.size, lessonRows.length),
      nextLessonId: next ? next.id : null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/courses/:slug/enroll
 */
async function unenroll(req, res, next) {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) throw new HttpError(400, 'A course slug is required');

    const userId = req.userId || (req.session && req.session.userId);
    if (!userId) throw new HttpError(401, 'Authentication required');

    const [courseRows] = await pool.query('SELECT id FROM courses WHERE slug = ? LIMIT 1', [slug]);
    if (!courseRows.length) throw new HttpError(404, 'Course not found');
    const courseId = courseRows[0].id;

    const [result] = await pool.query(
      'DELETE FROM enrollments WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );

    res.json({
      enrolled: false,
      courseId,
      removed: Number(result.affectedRows) > 0,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTracks,
  listCourses,
  getCourseBySlug,
  enroll,
  unenroll,
};