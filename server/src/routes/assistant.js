import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import { answerAssistant, assistantQuerySchema } from '../services/assistant.js';

export function assistantRouter() {
  const r = Router();
  r.use(requireAuth);
  r.post('/', validate({ body: assistantQuerySchema }), async (req, res, next) => {
    try {
      // Service never throws for provider failure — always 200 with a fallback answer.
      const { answer, source } = await answerAssistant(req.body);
      res.json({ answer, source });
    } catch (err) {
      next(err);
    }
  });
  return r;
}
