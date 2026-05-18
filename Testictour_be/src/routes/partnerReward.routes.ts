import { Router } from 'express';
import auth from '../middlewares/auth';
import {
    getPartnerRewards,
    createPartnerReward,
    updatePartnerReward,
    deletePartnerReward,
    getPublicPartnerRewards,
    getRewardCatalog,
    getMyRewardRedemptions,
    redeemPartnerReward,
} from '../controllers/partnerReward.controller';

const router = Router();

// Partner-authenticated CRUD
router.get('/catalog', getRewardCatalog);
router.get('/redemptions/me', auth(), getMyRewardRedemptions);
router.get('/', auth('partner', 'admin'), getPartnerRewards);
router.post('/', auth('partner', 'admin'), createPartnerReward);
router.post('/:id/redeem', auth(), redeemPartnerReward);
router.put('/:id', auth('partner', 'admin'), updatePartnerReward);
router.delete('/:id', auth('partner', 'admin'), deletePartnerReward);

export default router;
