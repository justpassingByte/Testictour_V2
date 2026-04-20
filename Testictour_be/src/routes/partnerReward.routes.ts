import { Router } from 'express';
import auth from '../middlewares/auth';
import {
    getPartnerRewards,
    createPartnerReward,
    updatePartnerReward,
    deletePartnerReward,
    getPublicPartnerRewards,
} from '../controllers/partnerReward.controller';

const router = Router();

// Partner-authenticated CRUD
router.get('/', auth('partner', 'admin'), getPartnerRewards);
router.post('/', auth('partner', 'admin'), createPartnerReward);
router.put('/:id', auth('partner', 'admin'), updatePartnerReward);
router.delete('/:id', auth('partner', 'admin'), deletePartnerReward);

export default router;
