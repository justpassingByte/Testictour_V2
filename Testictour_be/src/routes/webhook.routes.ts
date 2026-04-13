import { Router } from 'express';
import PaymentWebhookController from '../controllers/PaymentWebhookController';

const router = Router();

/**
 * POST /webhooks/payments/:provider
 *
 * No session auth — provider signature is validated inside EscrowService.processWebhook.
 * Raw body parsing must be enabled upstream for accurate HMAC verification; if express.json()
 * is already applied globally this still works because we re-serialize inside the service.
 */
router.post('/payments/:provider', PaymentWebhookController.handleWebhook);

export default router;
