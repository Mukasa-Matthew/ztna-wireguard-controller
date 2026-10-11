import fs from 'fs/promises';
import path from 'path';
import { Peer } from './types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'peers.json');

/**
 * File-backed persistent store for ZTNA peers.
 */
class PeerStore {
  private peers: Map<string, Peer> = new Map();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const rawData = await fs.readFile(STORE_FILE, 'utf-8');
      const parsed: Peer[] = JSON.parse(rawData);
      for (const p of parsed) {
        this.peers.set(p.id, p);
      }
      console.log(`[Store] Loaded ${this.peers.size} peers from ${STORE_FILE}`);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        console.log('[Store] Initializing new peers storage file with default gateway...');
        await this.seedDefaultGateway();
      } else {
        console.error('[Store Error] Failed to read store file:', err);
      }
    }
    this.initialized = true;
  }

  private async seedDefaultGateway(): Promise<void> {
    const defaultGateway: Peer = {
      id: 'gateway-01',
      name: 'central-mesh-gateway',
      publicKey: 'gw+CentralMeshPubkeyWireGuardMockBase64Key=',
      internalIp: '10.42.0.1',
      endpoint: '198.51.100.1:51820',
      listenPort: 51820,
      role: 'gateway',
      status: 'online',
      allowedIps: ['10.42.0.0/16'],
      lastHandshakeAt: new Date().toISOString(),
      rxBytes: 104857600,
      txBytes: 450971520,
      authToken: 'ztna_secret_gateway_token_123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.peers.set(defaultGateway.id, defaultGateway);
    await this.persist();
  }

  private async persist(): Promise<void> {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const array = Array.from(this.peers.values());
      await fs.writeFile(STORE_FILE, JSON.stringify(array, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Store Error] Failed to write store file:', err);
    }
  }

  async getAll(): Promise<Peer[]> {
    await this.init();
    return Array.from(this.peers.values());
  }

  async getById(id: string): Promise<Peer | null> {
    await this.init();
    return this.peers.get(id) || null;
  }

  async getByPublicKey(publicKey: string): Promise<Peer | null> {
    await this.init();
    for (const peer of this.peers.values()) {
      if (peer.publicKey === publicKey) return peer;
    }
    return null;
  }

  async getByToken(token: string): Promise<Peer | null> {
    await this.init();
    for (const peer of this.peers.values()) {
      if (peer.authToken === token) return peer;
    }
    return null;
  }

  async save(peer: Peer): Promise<Peer> {
    await this.init();
    peer.updatedAt = new Date().toISOString();
    this.peers.set(peer.id, peer);
    await this.persist();
    return peer;
  }

  async delete(id: string): Promise<boolean> {
    await this.init();
    const deleted = this.peers.delete(id);
    if (deleted) {
      await this.persist();
    }
    return deleted;
  }
}

export const peerStore = new PeerStore();
