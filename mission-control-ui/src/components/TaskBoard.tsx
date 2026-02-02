/**
 * Task Board Component
 *
 * Kanban-style board for managing tasks
 */

import { useTasks } from '../hooks/useTasks';
import { TaskCard } from './TaskCard';

export function TaskBoard() {
  const { tasks, loading, error, updateTask } = useTasks();

  const columns = [
    { id: 'pending', title: 'Pending', status: 'pending' },
    { id: 'in_progress', title: 'In Progress', status: 'in_progress' },
    { id: 'completed', title: 'Completed', status: 'completed' },
    { id: 'blocked', title: 'Blocked', status: 'blocked' },
  ];

  const handleStatusChange = async (id: number, newStatus: string) => {
    await updateTask(id, { status: newStatus });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
        <p className="text-red-300">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.status);

        return (
          <div key={column.id} className="bg-slate-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{column.title}</h2>
              <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-sm">
                {columnTasks.length}
              </span>
            </div>
            <div className="space-y-3">
              {columnTasks.map((task) => (
                <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
