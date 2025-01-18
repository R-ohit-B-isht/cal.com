import * as React from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { MonitoringDashboard } from './pages/MonitoringDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/monitoring" element={<MonitoringDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
