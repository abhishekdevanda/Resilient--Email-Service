import express from "express";
import emailRoutes from './routes/email.routes';
import { redis } from "./utils/redis.client";
import { IdempotencyService } from "./services/idempotency.service";
import { EmailService } from "./services/email.service";
import { providers } from "./providers/Index.provider";


const idempotencyService = new IdempotencyService(redis);
export const emailService = new EmailService(providers, idempotencyService);

const app = express();
app.use(express.json());

app.use('/api/email', emailRoutes);

const port = process.env.PORT || 6000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});