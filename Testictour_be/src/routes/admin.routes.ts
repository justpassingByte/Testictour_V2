import { Router } from 'express';
import auth from '../middlewares/auth';
import {
    getAllUsers, getUserDetail, createUser, updateUser, banUser, deleteUser,
    depositToUser, importUsers, getUsersByReferrer,
    getAdminStats, getSubscriptions, updateSubscription, deleteSubscription,
    getAdminAnalytics, getPartnerDetailForAdmin,
} from '../controllers/admin.controller';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Admin stats & analytics
router.get('/stats', auth('admin'), getAdminStats);
router.get('/analytics', auth('admin'), getAdminAnalytics);

// Subscription management
router.get('/subscriptions', auth('admin'), getSubscriptions);
router.put('/subscriptions/:partnerId', auth('admin'), updateSubscription);
router.delete('/subscriptions/:partnerId', auth('admin'), deleteSubscription);

// Partner Detail View
router.get('/partners/:id', auth('admin'), getPartnerDetailForAdmin);

// Transactions
import { updateTransactionStatus } from '../controllers/admin.controller';
router.put('/transactions/:id/status', auth('admin'), updateTransactionStatus);

// User management
router.post('/users/import', auth('admin'), upload.single('file'), importUsers);
router.get('/users/by-referrer', auth('partner'), getUsersByReferrer);
router.get('/users', auth('admin'), getAllUsers);
router.get('/users/:id', auth('admin'), getUserDetail);
router.post('/users', auth('admin'), createUser);
router.put('/users/:id', auth('admin'), updateUser);
router.post('/users/:id/ban', auth('admin'), banUser);
router.delete('/users/:id', auth('admin'), deleteUser);
router.post('/users/:id/deposit', auth('admin'), depositToUser);
export default router;
