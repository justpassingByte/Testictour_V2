import { Router } from 'express';
import auth from '../middlewares/auth';
import PartnerController from '../controllers/partner.controller';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Dashboard summary
router.get('/summary', auth('partner', 'admin'), PartnerController.getSummary);

// Player management
router.get('/players', auth('partner', 'admin'), PartnerController.getPlayers);
router.get('/players/:id', auth('partner', 'admin'), PartnerController.getPlayerDetail);
router.post('/players', auth('partner', 'admin'), PartnerController.addPlayer);
router.put('/players/:id', auth('partner', 'admin'), PartnerController.updatePlayer);
router.delete('/players/:id', auth('partner', 'admin'), PartnerController.deletePlayer);

// Export / Import
router.get('/export/users', auth('partner', 'admin'), PartnerController.exportUsers);
router.post('/import/players', auth('partner', 'admin'), upload.single('file'), PartnerController.importPlayers);

// Transactions
router.post('/transaction', auth('partner', 'admin'), PartnerController.processTransaction);

// Settings
router.put('/settings', auth('partner', 'admin'), PartnerController.updateSettings);

// Subscription
router.get('/subscription', auth('partner', 'admin'), PartnerController.getSubscription);
router.post('/subscription/upgrade', auth('partner'), PartnerController.upgradeSubscription);
router.post('/subscription/upgrade', auth('partner', 'admin'), PartnerController.upgradeSubscription);

export default router;
