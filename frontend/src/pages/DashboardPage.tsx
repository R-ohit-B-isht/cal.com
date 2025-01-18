import * as React from "react";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Activity } from 'lucide-react';
import { ViewToggle, ViewType } from '@/components/ViewToggle';
import { FilterPanel, Filters } from '@/components/FilterPanel';
import { BoardView } from '@/components/views/BoardView';
import { ListView } from '@/components/views/ListView';
import { TableView } from '@/components/views/TableView';
import { Breadcrumb } from '@/components/Breadcrumb';

export function DashboardPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [currentView, setCurrentView] = useState<ViewType>('board');
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <Breadcrumb items={[{ label: 'Dashboard' }]} />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <FilterPanel
            filters={filters}
            onChangeFilters={setFilters}
          />
          <Button
            variant="outline"
            onClick={() => navigate('/monitoring')}
          >
            <Activity className="h-4 w-4 mr-2" />
            Monitoring
          </Button>
        </div>
        <ViewToggle
          currentView={currentView}
          onViewChange={setCurrentView}
        />
      </div>

      {currentView === 'board' && (
        <BoardView tasks={[]} onTaskClick={() => {}} />
      )}
      {currentView === 'list' && (
        <ListView tasks={[]} onTaskClick={() => {}} />
      )}
      {currentView === 'table' && (
        <TableView tasks={[]} onTaskClick={() => {}} />
      )}
    </div>
  );
}
