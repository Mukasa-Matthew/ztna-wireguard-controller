import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { peerStore } from '../models/store.js';
import { IpamService } from '../services/ipam.service.js';
import { Peer, PeerRole } from '../models/types.js';

export const peersRouter = Router();

/**
 * Register a new WireGuard peer node.
 * Automatically allocates internal overlay IP and generates access token.
 */
peersRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, publicKey, endpoint, role = 'client', listenPort = 51820 } = req.body;

    if (!name || !publicKey) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: name and publicKey are mandatory.',
      });
      return;
    }

    // Check if public key is already registered
    const existing = await peerStore.getByPublicKey(publicKey);
    if (existing) {
      res.status(409).json({
        success: false,
        error: 'A peer with this WireGuard public key is already registered.',
        peerId: existing.id,
      });
      return;
    }

    // Allocate internal IP from overlay pool
    const internalIp = await IpamService.allocateIp();
    const now = new Date().toISOString();
    const id = `peer-${uuidv4().slice(0, 8)}`;
    const authToken = `ztna_${uuidv4().replace(/-/g, '')}`;

    const newPeer: Peer = {
      id,
      name,
      publicKey,
      internalIp,
      endpoint: endpoint || null,
      listenPort: Number(listenPort) || 51820,
      role: (role as PeerRole) || 'client',
      status: 'pending',
      allowedIps: [`${internalIp}/32`],
      lastHandshakeAt: null,
      rxBytes: 0,
      txBytes: 0,
      authToken,
      createdAt: now,
      updatedAt: now,
    };

    await peerStore.save(newPeer);

    console.log(`[ZTNA Control Plane] Registered peer "${name}" (${id}) with IP ${internalIp}`);

    res.status(201).json({
      success: true,
      message: 'Peer successfully registered',
      peer: newPeer,
    });
  } catch (error: any) {
    console.error('[Peers Error] Registration failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * List all registered peers in the mesh.
 */
peersRouter.get('/', async (_req: Request, res: Response) => {
  const peers = await peerStore.getAll();
  res.status(200).json({
    success: true,
    count: peers.length,
    peers,
  });
});

/**
 * Get individual peer by ID.
 */
peersRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const peer = await peerStore.getById(String(req.params.id));
  if (!peer) {
    res.status(404).json({ success: false, error: 'Peer not found' });
    return;
  }
  res.status(200).json({ success: true, peer });
});

/**
 * Heartbeat & telemetry reporting from peer node daemon.
 */
peersRouter.post('/:id/heartbeat', async (req: Request, res: Response): Promise<void> => {
  const peer = await peerStore.getById(String(req.params.id));
  if (!peer) {
    res.status(404).json({ success: false, error: 'Peer not found' });
    return;
  }

  const { lastHandshakeAt, rxBytes, txBytes, endpoint } = req.body;

  peer.status = 'online';
  if (lastHandshakeAt) peer.lastHandshakeAt = lastHandshakeAt;
  if (typeof rxBytes === 'number') peer.rxBytes = rxBytes;
  if (typeof txBytes === 'number') peer.txBytes = txBytes;
  if (endpoint) peer.endpoint = endpoint;

  await peerStore.save(peer);

  res.status(200).json({
    success: true,
    status: peer.status,
    updatedAt: peer.updatedAt,
  });
});

/**
 * Revoke and remove a peer from the overlay mesh.
 */
peersRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const deleted = await peerStore.delete(String(req.params.id));
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Peer not found' });
    return;
  }
  console.log(`[ZTNA Control Plane] Deleted peer ${String(req.params.id)}`);
  res.status(200).json({ success: true, message: 'Peer revoked and deleted' });
});
