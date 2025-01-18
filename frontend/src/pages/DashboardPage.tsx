
import { useEffect, useState } from 'react';
import { Task } from '../types/Task';
import { api, Relationship } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Settings, XCircle } from 'lucide-react';
import { ViewToggle, ViewType } from '../components/ViewToggle';
import { FilterPanel, Filters } from '../components/FilterPanel';
import { BoardView } from '../components/views/BoardView';
import { ListView } from '../components/views/ListView';
import { TableView } from '../components/views/TableView';
import { RelationshipGraph } from '../components/views/RelationshipGraph';
import { Breadcrumb } from '@/components/Breadcrumb';
import { TaskCardSkeleton } from '@/components/TaskCardSkeleton';
import { Card, CardContent } from '@/components/ui/card';

export function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [filters, setFilters] = useState<Parameters<typeof api.getTasks>[0]>({});
  const [currentView, setCurrentView] = useState<ViewType>('board');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      setError(null);
      try {
        const [fetchedTasks, fetchedRelationships] = await Promise.all([
          api.getTasks(filters),
          api.getRelationships()
        ]);
        setTasks(fetchedTasks);
        setRelationships(fetchedRelationships);
      } catch (err) {
        setError('Failed to load tasks. Please check if the backend server is running at http://localhost:5000');
        console.error('Backend connection error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [filters]);

  const handleTaskClick = (task: Task) => {
    navigate(`/tasks/${task._id}`);
  };

  return (
    <div className="p-6">
      <Breadcrumb
        items={[
          { label: 'Dashboard' }
        ]}
      />
      

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <FilterPanel
          filters={filters}
          onChangeFilters={setFilters}
        />
        <ViewToggle
          currentView={currentView}
          onViewChange={setCurrentView}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <TaskCardSkeleton />
              <TaskCardSkeleton />
              <TaskCardSkeleton />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="max-w-lg mx-auto mt-12">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center text-center p-6">
                <div className="rounded-full bg-red-100 p-3 mb-4">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-red-900 mb-2">Backend Connection Error</h3>
                <p className="text-red-600">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {currentView === 'board' && (
            <BoardView
              tasks={tasks}
              relationships={relationships}
              onTaskClick={handleTaskClick}
            />
          )}
          {currentView === 'list' && (
            <ListView
              tasks={tasks}
              relationships={relationships}
              onTaskClick={handleTaskClick}
            />
          )}
          {currentView === 'table' && (
            <TableView
              tasks={tasks}
              relationships={relationships}
              onTaskClick={handleTaskClick}
            />
          )}
          {currentView === 'graph' && (
            <RelationshipGraph
              tasks={tasks}
              relationships={relationships}
              onTaskClick={handleTaskClick}
            />
          )}
          {currentView === 'graph' && (
            <RelationshipGraph
              tasks={tasks}
              relationships={relationships}
              onTaskClick={handleTaskClick}
            />
          )}
        </>
      )}
    </div>
  );
}
