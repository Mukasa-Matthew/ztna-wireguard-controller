import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { peersRouter } from './routes/peers.routes.js';
import { topologyRouter } from './routes/topology.routes.js';
import { peerStore } from './models/store.js';

dotenv.config();

const app: Express = express();
const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '0.0.0.0';

// Security & Parsing
app.use(helmet());
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-ztna-token'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
app.use((req: Request, _res: Response, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    service: 'ztna-control-plane',
    timestamp: new Date().toISOString(),
  });
});

// Route registration
app.use('/api/v1/peers', peersRouter);
app.use('/api/v1/topology', topologyRouter);

// Initialize store and launch HTTP listener
async function main() {
  await peerStore.init();

  app.listen(PORT, HOST, () => {
    console.log(`[ZTNA Control Plane] Listening on http://${HOST}:${PORT}`);
    console.log(`[ZTNA Control Plane] Overlay Subnet: 10.42.0.0/16`);
  });
}

main().catch((err) => {
  console.error('[Fatal] Control plane startup error:', err);
  process.exit(1);
});

export default app;
