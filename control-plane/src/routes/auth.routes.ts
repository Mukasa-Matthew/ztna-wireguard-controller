import { Request, Response, NextFunction } from 'express';
import { peerStore } from '../models/store.js';

export interface AuthenticatedRequest extends Request {
  peer?: any;
}

/**
 * Authentication middleware verifying peer auth token or admin master key.
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : (req.headers['x-ztna-token'] as string);

  if (!token) {
    res.status(401).json({ success: false, error: 'Missing authentication token' });
    return;
  }

  // Master Admin API Key check
  const adminKey = process.env.ADMIN_API_KEY || 'ztna-admin-supersecret-key';
  if (token === adminKey) {
    next();
    return;
  }

  // Peer token lookup
  const peer = await peerStore.getByToken(token);
  if (!peer) {
    res.status(403).json({ success: false, error: 'Invalid or revoked authentication token' });
    return;
  }

  req.peer = peer;
  next();
}
