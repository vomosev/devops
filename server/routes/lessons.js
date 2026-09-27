const express = require('express');
const { getLesson, listLessonsByCourse } = require('../controllers/lessonsController');
const { optionalAuth } = require('../middleware/requireAuth');

const router = express.Router();

// List lessons for a course (by course id or slug)
router.get('/course/:course', optionalAuth, listLessonsByCourse);

// Lesson detail with prev/next navigation
router.get('/:id', optionalAuth, getLesson);

module.exports = router;