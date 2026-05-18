import { Router } from 'express';
import auth from '../middlewares/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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
const UPLOAD_DIR = path.join('public', 'uploads', 'rewards');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `reward-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
});
const upload = multer({ storage });

// Partner-authenticated CRUD
router.get('/catalog', getRewardCatalog);
router.get('/redemptions/me', auth(), getMyRewardRedemptions);
router.post('/upload-image', auth('partner', 'admin'), upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image uploaded' });
    }
    const imageUrl = `/uploads/rewards/${req.file.filename}`;
    return res.json({ success: true, imageUrl });
});
router.get('/', auth('partner', 'admin'), getPartnerRewards);
router.post('/', auth('partner', 'admin'), createPartnerReward);
router.post('/:id/redeem', auth(), redeemPartnerReward);
router.put('/:id', auth('partner', 'admin'), updatePartnerReward);
router.delete('/:id', auth('partner', 'admin'), deletePartnerReward);

export default router;
