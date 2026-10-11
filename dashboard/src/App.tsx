import { useState, useEffect, useCallback } from 'react';
import { Peer } from './types';
import { Navbar } from './components/Navbar';
import { TopologyVisualizer } from './components/TopologyVisualizer';
import { NodeList } from './components/NodeList';
import { PeerProvisionModal } from './components/PeerProvisionModal';

export function App() {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [, setLoading] = useState(true);

  const fetchPeers = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/peers');
      if (res.ok) {
        const data = await res.json();
        setPeers(data.peers || []);
      }
    } catch (err) {
      console.error('Failed to fetch peers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeers();
    const interval = setInterval(fetchPeers, 4000);
    return () => clearInterval(interval);
  }, [fetchPeers]);

  const handleDeletePeer = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this peer? Traffic will be dropped immediately.')) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/peers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPeers((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete peer:', err);
    }
  };

  const handleDownloadConfig = (id: string) => {
    window.open(`/api/v1/topology/${id}/config`, '_blank');
  };

  const handlePeerCreated = (newPeer: Peer) => {
    setPeers((prev) => [...prev, newPeer]);
  };

  const onlineCount = peers.filter((p) => p.status === 'online').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        onRefresh={fetchPeers}
        onOpenProvisionModal={() => setIsModalOpen(true)}
        peerCount={peers.length}
        onlineCount={onlineCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TopologyVisualizer peers={peers} />

        <NodeList
          peers={peers}
          onDelete={handleDeletePeer}
          onDownloadConfig={handleDownloadConfig}
        />
      </main>

      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-600">
        ZTNA WireGuard Mesh Controller • Zero-Trust Overlay Network 10.42.0.0/16
      </footer>

      <PeerProvisionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handlePeerCreated}
      />
    </div>
  );
}

export default App;
