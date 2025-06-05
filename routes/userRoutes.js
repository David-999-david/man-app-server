const express = require("express");
const router = express.Router();
const {
  signIn,
  signUp,
  getUserProfile,
} = require("../controllers/userController");
const authMiddleware = require('../middleware/authMiddleware');

router.post('/signup',signUp);

router.post('/signin',signIn);

router.use(authMiddleware);

router.get('/me',getUserProfile);

module.exports = router;
