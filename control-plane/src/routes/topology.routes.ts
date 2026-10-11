import { Router, Request, Response } from 'express';
import { peerStore } from '../models/store.js';
import { TopologyService } from '../services/topology.service.js';

export const topologyRouter = Router();

/**
 * Get dynamic mesh topology for a peer node.
 * Used by the node agent daemon to sync local WireGuard configuration.
 */
topologyRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const peer = await peerStore.getById(req.params.id);
  if (!peer) {
    res.status(404).json({ success: false, error: 'Peer not found' });
    return;
  }

  const topology = await TopologyService.getTopologyForPeer(peer);
  res.status(200).json({ success: true, topology });
});

/**
 * Download or inspect WireGuard wg0.conf text manifest.
 */
topologyRouter.get('/:id/config', async (req: Request, res: Response): Promise<void> => {
  const peer = await peerStore.getById(req.params.id);
  if (!peer) {
    res.status(404).send('# Error: Peer not found\n');
    return;
  }

  const topology = await TopologyService.getTopologyForPeer(peer);
  const config = TopologyService.generateWireguardConfig(peer, '<YOUR_PRIVATE_KEY>', topology);

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${peer.name}-wg0.conf"`);
  res.status(200).send(config);
});
