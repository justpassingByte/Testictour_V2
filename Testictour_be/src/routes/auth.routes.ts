import { Router } from 'express';
import AuthController from '../controllers/AuthController';
import auth from '../middlewares/auth';
import {
  loginLimiterByIp,
  loginLimiterByAccount,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter
} from '../middlewares/rateLimiter';

const router = Router();

router.post('/register', registerLimiter, AuthController.register);
router.post('/login', loginLimiterByIp, loginLimiterByAccount, AuthController.login);
router.get('/me', auth('user', 'admin', 'partner'), AuthController.me);
router.post('/logout', AuthController.logout);

// Password reset (public, rate-limited)
router.post('/forgot-password', forgotPasswordLimiter, AuthController.forgotPassword);
router.post('/reset-password', resetPasswordLimiter, AuthController.resetPassword);

export default router; 
