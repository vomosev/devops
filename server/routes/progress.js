const express = require('express');

const { requireAuth } = require('../middleware/requireAuth');
const {
  setLessonProgress,
  getCourseProgress,
  getDashboard,
} = require('../controllers/progressController');

const router = express.Router();

// Every progress route requires an authenticated session.
router.use(requireAuth);

// GET /api/progress/dashboard
router.get('/dashboard', getDashboard);

// GET /api/progress/course/:slug
router.get('/course/:slug', getCourseProgress);

// POST /api/progress/lesson/:lessonId  body: { status }
router.post('/lesson/:lessonId', setLessonProgress);

module.exports = router;