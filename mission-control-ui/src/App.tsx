/**
 * OpenClaw Mission Control - Main App Component
 */

import { useEffect } from 'react';
import { api } from './services/api';
import { useAgents } from './hooks/useAgents';
import { AgentCard } from './components/AgentCard';
import { TaskBoard } from './components/TaskBoard';

function App() {
  const { agents, loading: agentsLoading } = useAgents();

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    api.connect();

    return () => {
      api.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                🤖 OpenClaw Mission Control
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Multi-agent coordination system
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-slate-400">Active Agents</div>
                <div className="text-2xl font-bold text-white">
                  {agents.filter((a) => a.status !== 'offline').length} / {agents.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Agents Grid */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">Agents</h2>
          {agentsLoading ? (
            <div className="text-slate-400">Loading agents...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          )}
        </section>

        {/* Task Board */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Task Board</h2>
          <TaskBoard />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-slate-400 text-sm">
          <p>OpenClaw Mission Control v1.0.0</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
