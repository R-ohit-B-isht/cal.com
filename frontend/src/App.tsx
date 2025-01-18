import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { DashboardPage } from './pages/DashboardPage';
import { TaskDetailsPage } from './pages/TaskDetailsPage';
import { MindMap } from './components/features/MindMap';
import { IntegrationManagementPage } from './pages/IntegrationManagementPage';
import { GlobalNav } from './components/GlobalNav';
import { SimpleCommandPalette } from './components/SimpleCommandPalette';

function App() {
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Handle '/' for search focus
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && e.target === document.body) {
      e.preventDefault();
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }
    
    // Handle 'c' for create task
    if (e.key === 'c' && !e.metaKey && !e.ctrlKey && e.target === document.body) {
      e.preventDefault();
      // TODO: Implement create task functionality
      console.log('Create task shortcut triggered');
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <Router>
      <div className="min-h-screen bg-background flex flex-col">
        <GlobalNav />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tasks" element={<DashboardPage />} />
            <Route path="/tasks/:taskId" element={<TaskDetailsPage />} />
            <Route path="/integrations" element={<IntegrationManagementPage />} />
            <Route path="/mind-map" element={<MindMap />} />
          </Routes>
        </main>
      </div>
      <SimpleCommandPalette 
        open={showCommandPalette}
        onOpenChange={setShowCommandPalette}
      />
    </Router>
  );
}

export default App;
