import React from 'react';
import { ShieldCheck, Plus, RefreshCw, Network } from 'lucide-react';

interface NavbarProps {
  onRefresh: () => void;
  onOpenProvisionModal: () => void;
  peerCount: number;
  onlineCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onRefresh,
  onOpenProvisionModal,
  peerCount,
  onlineCount,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-white">ZTNA Controller</span>
              <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-mono">
                WireGuard Mesh
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center space-x-3">
              <span className="flex items-center">
                <Network className="w-3 h-3 mr-1 text-slate-500" />
                Subnet: <code className="ml-1 text-slate-300">10.42.0.0/16</code>
              </span>
              <span>•</span>
              <span>
                Mesh Nodes: <strong className="text-emerald-400">{onlineCount}</strong> / {peerCount} Online
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition"
            title="Refresh Nodes"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenProvisionModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Provision Node</span>
          </button>
        </div>
      </div>
    </header>
  );
};
