
import { Task } from '../../types/Task';
import { Relationship } from '../../services/api';
import { TaskColumn } from '../TaskColumn';

interface BoardViewProps {
  tasks: Task[];
  relationships: Relationship[];
  onTaskClick: (task: Task) => void;
}

export function BoardView({ tasks, relationships, onTaskClick }: BoardViewProps) {
  const filterTasksByStatus = (status: Task['status']) => {
    return tasks.filter(task => task.status === status);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-6 pb-4 overflow-x-auto min-h-[calc(100vh-12rem)] px-4 sm:px-6">
      <TaskColumn
        title="To-Do"
        tasks={filterTasksByStatus('To-Do')}
        relationships={relationships}
        allTasks={tasks}
        onTaskClick={onTaskClick}
      />
      <TaskColumn
        title="In-Progress"
        tasks={filterTasksByStatus('In-Progress')}
        relationships={relationships}
        allTasks={tasks}
        onTaskClick={onTaskClick}
      />
      <TaskColumn
        title="Done"
        tasks={filterTasksByStatus('Done')}
        relationships={relationships}
        allTasks={tasks}
        onTaskClick={onTaskClick}
      />
    </div>
  );
}
