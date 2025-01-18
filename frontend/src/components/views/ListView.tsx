
import { Task } from '../../types/Task';
import { Relationship } from '../../services/api';
import { TaskCard } from '../TaskCard';

interface ListViewProps {
  tasks: Task[];
  relationships: Relationship[];
  onTaskClick: (task: Task) => void;
}

export function ListView({ tasks, relationships, onTaskClick }: ListViewProps) {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {tasks.map((task) => (
        <TaskCard
          key={task._id}
          task={task}
          relationships={relationships.filter(rel => 
            rel.sourceTaskId === task._id || rel.targetTaskId === task._id
          )}
          relatedTasks={tasks}
          onClick={() => onTaskClick(task)}
        />
      ))}
      {tasks.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No tasks found
        </div>
      )}
    </div>
  );
}
