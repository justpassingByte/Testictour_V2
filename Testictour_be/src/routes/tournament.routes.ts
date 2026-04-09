import { Router, Request, Response, NextFunction } from 'express';
import TournamentController from '../controllers/TournamentController';
import auth from '../middlewares/auth';
import multer from 'multer';
import path from 'path';
import { prisma } from '../services/prisma';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/tournaments'); 
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const router = Router();

// Public
router.get('/', TournamentController.list);
router.get('/my', auth('admin', 'partner'), TournamentController.myTournaments);
router.get('/:id', TournamentController.detail);

// Create — admin or paid partner
router.post('/', auth('admin', 'partner'), TournamentController.create);
router.post('/auto', auth('admin'), TournamentController.createAutoTournament);

// Update/Delete — admin always, partner only for own tournaments
router.put('/:id', auth('admin', 'partner'), TournamentController.update);
router.delete('/:id', auth('admin', 'partner'), TournamentController.remove);

// Image Upload Endpoint (new)
router.post('/:id/image', auth('admin', 'partner'), upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }
    const imageUrl = `/uploads/tournaments/${req.file.filename}`;
    const updated = await prisma.tournament.update({
      where: { id },
      data: { image: imageUrl }
    });
    res.json({ success: true, image: imageUrl, tournament: updated });
  } catch (error) {
    next(error);
  }
});

// Sync
router.post('/:id/sync', auth('admin', 'partner'), TournamentController.syncMatches);

export default router;