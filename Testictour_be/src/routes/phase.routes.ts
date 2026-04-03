import { Router } from 'express';
import RoundController from '../controllers/RoundController';
import auth from '../middlewares/auth';

const router = Router();

// Route to get all rounds for a specific phase
router.get('/:phaseId/rounds', RoundController.list);

// Route to create a new round within a specific phase
router.post('/:phaseId/rounds', auth('admin'), RoundController.create);

export default router; 