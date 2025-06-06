const express = require("express");
const router = express.Router();
const {
  signIn,
  signUp,
  refreshAccessToken,
  getUserProfile,
} = require("../controllers/userController");
const authMiddleware = require('../middleware/authMiddleware');

router.post('/signup',signUp);

router.post('/signin',signIn);

router.post('/token/refresh',refreshAccessToken);

router.use(authMiddleware);

router.get('/me',getUserProfile);

module.exports = router;
