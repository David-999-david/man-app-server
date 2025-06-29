const express = require("express");
const router = express.Router();
const {
  signIn,
  signUp,
  refreshAccessToken,
  getUserProfile,
  emailRequestOtp,
  verifyOtp,
  resetPassword,
  postAvatar,
} = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const {
  forgotPasswordLimiter,
  verifyOtpLimitter,
} = require("../middleware/rateLimiters");
const multer = require("multer");
const upload = multer();

router.post("/signup", signUp);

router.post("/signin", signIn);

router.post("/token/refresh", refreshAccessToken);

router.post("/request-otp", forgotPasswordLimiter, emailRequestOtp);

router.post("/resend-otp", forgotPasswordLimiter, emailRequestOtp);

router.post("/verify-otp", verifyOtpLimitter, verifyOtp);

router.post("/reset-password", resetPassword);

router.use(authMiddleware);

router.get("/me", getUserProfile);

router.post("/upload/avatar", upload.single("avatar"), postAvatar);

module.exports = router;
