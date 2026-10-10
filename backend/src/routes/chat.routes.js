import { Router } from 'express';
import * as chatController from '../controllers/chat.controller.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ code: 'RATE_LIMIT', error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' });
  },
});

router.post('/', limiter, chatController.chat);
router.post('/reset', chatController.reset);

export default router;
