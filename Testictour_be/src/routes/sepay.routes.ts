import { Router } from 'express';
import SepayWebhookController from '../controllers/SepayWebhookController';

const router = Router();

router.post('/:partnerId', SepayWebhookController.handleWebhook);

export default router;
