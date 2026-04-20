import { Router } from 'express';
import WalletController from '../controllers/WalletController';
import auth from '../middlewares/auth';

const router = Router();

// Only partners can access their wallet
router.get('/ledger', auth('partner', 'admin'), WalletController.getLedger);
router.get('/config', auth('partner', 'admin'), WalletController.getWalletConfig);
router.post('/config', auth('partner', 'admin'), WalletController.updateWalletConfig);

export default router;
