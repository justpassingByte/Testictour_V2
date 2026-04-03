import { Router } from 'express';
import auth from '../middlewares/auth';
import auditLog from '../middlewares/auditLog';
import {
    getNotificationHistory,
    sendNotification,
    deleteNotification,
    getTemplates,
    createTemplate,
    deleteTemplate,
} from '../controllers/adminNotifications.controller';

const router = Router();

// Send & history
router.post('/send', auth('admin'), auditLog('SEND_NOTIFICATION'), sendNotification);
router.get('/history', auth('admin'), getNotificationHistory);
router.delete('/:id', auth('admin'), auditLog('DELETE_NOTIFICATION'), deleteNotification);

// Templates
router.get('/templates', auth('admin'), getTemplates);
router.post('/templates', auth('admin'), auditLog('CREATE_TEMPLATE'), createTemplate);
router.delete('/templates/:id', auth('admin'), auditLog('DELETE_TEMPLATE'), deleteTemplate);

export default router;
