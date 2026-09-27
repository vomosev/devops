const express = require('express');

const {
  listTracks,
  listCourses,
  getCourseBySlug,
  enroll,
  unenroll,
} = require('../controllers/coursesController');
const { requireAuth, optionalAuth } = require('../middleware/requireAuth');

const router = express.Router();

// GET /api/courses/tracks - all tracks with course counts
router.get('/tracks', optionalAuth, listTracks);

// GET /api/courses?track=&level=&q=
router.get('/', optionalAuth, listCourses);

// GET /api/courses/:slug
router.get('/:slug', optionalAuth, getCourseBySlug);

// POST /api/courses/:slug/enroll
router.post('/:slug/enroll', requireAuth, enroll);

// DELETE /api/courses/:slug/enroll
router.delete('/:slug/enroll', requireAuth, unenroll);

module.exports = router;