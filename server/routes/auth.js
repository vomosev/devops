const express = require('express');

const {
  signup,
  login,
  logout,
  me,
  updateProfile,
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);
router.patch('/me', requireAuth, updateProfile);

module.exports = router;