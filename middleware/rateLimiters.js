const rateLimit = require('express-rate-limit');

const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max : 10,
    message : {
        error : 'Too many password-reset requests, please try again later.'
    }
})

const verifyOtpLimitter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        error: 'Too many Otp attempts, please request a new code.'
    }
});

module.exports = {
    forgotPasswordLimiter,
    verifyOtpLimitter
}