import { Router } from 'express';
import auth from '../middlewares/auth';
import auditLog from '../middlewares/auditLog';
import {
    getSettings,
    updateSetting,
    getFeatureFlags,
    updateFeatureFlag,
    getSubscriptionPlans,
    updateSubscriptionPlan,
    getAdminTransactions,
} from '../controllers/adminSettings.controller';

const router = Router();

// Platform settings
router.get('/', auth('admin'), getSettings);
router.put('/:key', auth('admin'), auditLog('UPDATE_SETTING'), updateSetting);

// Feature flags
router.get('/flags', auth('admin'), getFeatureFlags);
router.put('/flags/:key', auth('admin'), auditLog('TOGGLE_FEATURE_FLAG'), updateFeatureFlag);

// Subscription plan config
router.get('/plans', auth('admin'), getSubscriptionPlans);
router.put('/plans/:plan', auth('admin'), auditLog('UPDATE_SUBSCRIPTION_PLAN'), updateSubscriptionPlan);

// Admin transactions (global view)
router.get('/transactions', auth('admin'), getAdminTransactions);

export default router;
