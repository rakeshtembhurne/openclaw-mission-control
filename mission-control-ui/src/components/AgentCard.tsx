/**
 * Agent Card Component
 *
 * Displays agent status, emoji, and current activity
 */

import { Agent } from '../services/api';

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const statusColors = {
    idle: 'bg-yellow-500',
    working: 'bg-green-500',
    offline: 'bg-gray-500',
    error: 'bg-red-500',
  };

  const statusText = {
    idle: 'Idle',
    working: 'Working',
    offline: 'Offline',
    error: 'Error',
  };

  const lastSeen = agent.last_heartbeat
    ? new Date(agent.last_heartbeat * 1000).toLocaleString()
    : 'Never';

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center gap-3">
        <div className="text-4xl">{agent.emoji}</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
          <p className="text-sm text-slate-400">{agent.role}</p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${statusColors[agent.status as keyof typeof statusColors]}`}
          />
          <span className="text-sm text-slate-300">
            {statusText[agent.status as keyof typeof statusText]}
          </span>
        </div>
      </div>
      <div className="mt-3 text-xs text-slate-500">
        Last seen: {lastSeen}
      </div>
    </div>
  );
}
