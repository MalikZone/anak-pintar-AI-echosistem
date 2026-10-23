import { Router } from 'express';
import { chat, confirmDraft, cancelDraft, health } from '../controllers/assistantController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { enforceTenant } from '../middlewares/tenantMiddleware.js';

const router = Router();

router.use(authenticate, enforceTenant);

router.get('/health', health);
router.post('/chat', chat);
router.post('/drafts/:draftId/confirm', confirmDraft);
router.delete('/drafts/:draftId', cancelDraft);

export default router;

