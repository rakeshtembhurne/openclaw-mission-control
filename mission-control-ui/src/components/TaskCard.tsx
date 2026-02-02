/**
 * Task Card Component
 *
 * Displays task information in Kanban board
 */

import { Task } from '../services/api';

interface TaskCardProps {
  task: Task;
  onStatusChange: (id: number, newStatus: string) => void;
}

export function TaskCard({ task, onStatusChange }: TaskCardProps) {
  const priorityColors = {
    low: 'border-l-slate-500',
    medium: 'border-l-blue-500',
    high: 'border-l-orange-500',
    critical: 'border-l-red-500',
  };

  const statusColors = {
    pending: 'bg-slate-700 text-slate-300',
    in_progress: 'bg-blue-600 text-white',
    completed: 'bg-green-600 text-white',
    blocked: 'bg-red-600 text-white',
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onStatusChange(task.id, e.target.value);
  };

  return (
    <div className={`bg-slate-800 rounded-lg p-4 border-l-4 ${priorityColors[task.priority as keyof typeof priorityColors]} border border-slate-700`}>
      <h4 className="font-semibold text-white mb-2">{task.title}</h4>
      {task.description && (
        <p className="text-sm text-slate-400 mb-3">{task.description}</p>
      )}

      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">
          {task.assigned_agent ? `👤 ${task.assigned_agent}` : 'Unassigned'}
        </span>
        <span className={`px-2 py-1 rounded ${statusColors[task.status as keyof typeof statusColors]}`}>
          {task.status}
        </span>
      </div>

      <select
        value={task.status}
        onChange={handleStatusChange}
        className="mt-3 w-full bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600"
      >
        <option value="pending">Pending</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="blocked">Blocked</option>
      </select>
    </div>
  );
}
