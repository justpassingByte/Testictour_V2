import { Router } from 'express';
import TemplateController from '../controllers/TemplateController';
import auth from '../middlewares/auth';

const router = Router();

router.get('/', TemplateController.list);
router.post('/', auth('admin'), TemplateController.create);
router.get('/:id', TemplateController.detail);
router.put('/:id', auth('admin'), TemplateController.update);
router.delete('/:id', auth('admin'), TemplateController.remove);

export default router; 