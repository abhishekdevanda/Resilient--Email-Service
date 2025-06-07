import { Router } from 'express';
import { emailController } from '../controllers/email.controller';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/send', rateLimiter, emailController);

export default router;