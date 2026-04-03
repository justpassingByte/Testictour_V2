import express from 'express';
import {
  createMiniTourLobby,
  getMiniTourLobbies,
  getMiniTourLobbyById,
  updateMiniTourLobby,
  deleteMiniTourLobby,
  joinMiniTourLobby,
  startMiniTourLobby,
  fetchMiniTourLobbyResult,
  leaveMiniTourLobby,
  assignPlayerToLobby,
  submitManualResult,
  syncAllLobbyMatches,
} from '../controllers/miniTourLobby.controller';
import auth from '../middlewares/auth';
import multer from 'multer';
import path from 'path';

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/miniTourLobbies'); // Ensure this directory exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const router = express.Router();

console.log("Defining miniTourLobby routes.");

router.route('/').post(auth('partner'), upload.single('customLogo'), createMiniTourLobby).get(getMiniTourLobbies);
router
  .route('/:id')
  .get(getMiniTourLobbyById)
  .put(auth('partner'), upload.single('customLogo'), updateMiniTourLobby)
  .delete(auth('partner'), deleteMiniTourLobby);
router.route('/:id/join').post(auth(), joinMiniTourLobby);
router.route('/:id/start').post(auth(), startMiniTourLobby);
router.route('/:id/fetch-result').post(auth(), fetchMiniTourLobbyResult);
router.route('/:id/leave').post(auth(), leaveMiniTourLobby);
router.route('/:id/manual-result').post(auth('partner', 'admin'), submitManualResult);
router.route('/:id/sync-all').post(auth('partner', 'admin'), syncAllLobbyMatches);
console.log("Assign Player route definition: auth('partner', 'admin')");
router.route('/:id/assign-player').post(auth('partner', 'admin'), assignPlayerToLobby);

export default router;
