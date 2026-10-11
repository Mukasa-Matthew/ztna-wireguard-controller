import React from 'react';
import { Peer } from '../types';
import { Network, Activity, Lock, Cpu } from 'lucide-react';

interface TopologyVisualizerProps {
  peers: Peer[];
}

export const TopologyVisualizer: React.FC<TopologyVisualizerProps> = ({ peers }) => {
  const onlineCount = peers.filter((p) => p.status === 'online').length;
  const gateway = peers.find((p) => p.role === 'gateway');

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Overlay Subnet</span>
          <Network className="w-4 h-4 text-blue-400" />
        </div>
        <div className="text-lg font-bold font-mono text-white">10.42.0.0/16</div>
        <div className="text-xs text-slate-400 mt-1">
          {peers.length} IP(s) allocated ({((peers.length / 65534) * 100).toFixed(2)}% pool)
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Active Mesh Links</span>
          <Activity className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-lg font-bold text-white flex items-center space-x-2">
          <span>{onlineCount} Active</span>
          <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-normal">
            Healthy
          </span>
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {peers.length - onlineCount} peer(s) idle or disconnected
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Primary Gateway</span>
          <Cpu className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-lg font-bold font-mono text-white">
          {gateway ? gateway.internalIp : 'None'}
        </div>
        <div className="text-xs text-slate-400 mt-1 truncate">
          {gateway ? gateway.name : 'Subnet routing inactive'}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Zero-Trust Model</span>
          <Lock className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="text-lg font-bold text-white">Mutual WireGuard</div>
        <div className="text-xs text-slate-400 mt-1">Curve25519 Ephemeral Auth</div>
      </div>
    </div>
  );
};
