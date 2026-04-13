import { Router } from 'express';
import AuthController from '../controllers/AuthController';
import auth from '../middlewares/auth';
import { forgotPasswordLimiter, resetPasswordLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', auth('user', 'admin', 'partner'), AuthController.me);
router.post('/logout', AuthController.logout);

// Password reset (public, rate-limited)
router.post('/forgot-password', forgotPasswordLimiter, AuthController.forgotPassword);
router.post('/reset-password', resetPasswordLimiter, AuthController.resetPassword);

export default router; 
