const express = require('express');

const quizController = require('../controllers/quizController');
const { requireAuth, optionalAuth } = require('../middleware/requireAuth');

const router = express.Router();

// GET /api/quizzes/course/:slug -> quiz for a course (answers stripped)
router.get('/course/:slug', optionalAuth, quizController.getQuiz);

// POST /api/quizzes/:quizId/submit -> grade and store an attempt
router.post('/:quizId/submit', requireAuth, quizController.submitQuiz);

// GET /api/quizzes/:quizId/attempts -> the signed-in user's attempts, newest first
router.get('/:quizId/attempts', requireAuth, quizController.listAttempts);

module.exports = router;