import { Router } from 'express';
import AuthController from '../controllers/AuthController';
import auth from '../middlewares/auth';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', auth('user', 'admin', 'partner'), AuthController.me);
router.post('/logout', AuthController.logout);

export default router; 
