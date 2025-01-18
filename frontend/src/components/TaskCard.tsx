import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Task } from '../types/Task';
import { Github, Trello, LineChart, Clock, ArrowRight, ArrowLeft, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Relationship } from '../services/api';

interface TaskCardProps {
  task: Task;
  relationships?: Relationship[];
  relatedTasks?: Task[];
  onClick: () => void;
}

const integrationIcons = {
  github: <Github className="h-4 w-4" />,
  jira: <Trello className="h-4 w-4" />,
  linear: <LineChart className="h-4 w-4" />
};

export const statusStyles = {
  'To-Do': 'bg-zinc-100 text-zinc-900 group-hover:bg-zinc-200/80 border-zinc-200/50',
  'In-Progress': 'bg-blue-50 text-blue-700 group-hover:bg-blue-100/80 border-blue-200/50',
  'Done': 'bg-green-50 text-green-700 group-hover:bg-green-100/80 border-green-200/50'
};

const priorityStyles = {
  high: 'border-l-4 border-red-500/70 hover:border-red-500',
  medium: 'border-l-4 border-yellow-500/70 hover:border-yellow-500',
  low: 'border-l-4 border-blue-500/70 hover:border-blue-500',
  default: 'border-l-4 border-transparent'
} as const;

export function TaskCard({ task, relationships = [], relatedTasks = [], onClick }: TaskCardProps) {
  const getPriorityStyle = () => {
    if (!task.priority) return priorityStyles.default;
    return priorityStyles[task.priority] || priorityStyles.default;
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer group",
        "hover:shadow-lg hover:translate-y-[-2px]",
        "active:translate-y-[1px]",
        "transition-all duration-300 ease-in-out",
        "border border-gray-100/50",
        "bg-white/50 backdrop-blur-sm",
        getPriorityStyle()
      )}
      onClick={onClick}
    >
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium line-clamp-1">{task.title}</CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              {new Date(task.createdAt).toLocaleDateString()}
            </span>
            {integrationIcons[task.integration]}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{task.description}</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary"
                className={cn(
                  "transition-colors",
                  statusStyles[task.status]
                )}
              >
                {task.status}
              </Badge>
              {task.priority && (
                <Badge variant="outline">
                  Priority: {task.priority}
                </Badge>
              )}
            </div>
            <div className="flex items-center text-gray-500 text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {new Date(task.updatedAt).toLocaleDateString()}
            </div>
          </div>

          {relationships.length > 0 && (
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2">
                <Link2 className="h-3 w-3" />
                Related Tasks
              </div>
              <div className="space-y-2">
                {relationships.map((rel) => {
                  const isSource = rel.sourceTaskId === task._id;
                  const relatedTask = relatedTasks.find(t => 
                    t._id === (isSource ? rel.targetTaskId : rel.sourceTaskId)
                  );
                  
                  if (!relatedTask) return null;
                  
                  return (
                    <div key={rel._id} className="flex items-center gap-2 text-sm">
                      {isSource ? (
                        <>
                          <ArrowRight className="h-3 w-3 text-gray-400" />
                          <Badge variant="outline" className="text-xs">
                            {rel.type}
                          </Badge>
                          <span className="text-gray-600 truncate">{relatedTask.title}</span>
                        </>
                      ) : (
                        <>
                          <ArrowLeft className="h-3 w-3 text-gray-400" />
                          <Badge variant="outline" className="text-xs">
                            {rel.type}
                          </Badge>
                          <span className="text-gray-600 truncate">{relatedTask.title}</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
