import { Link, Navigate, Route, Routes } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import BrowsePage from './pages/BrowsePage';
import './App.css';

function AppNav() {
  return (
    <header className="top-nav">
      <nav>
        <Link to="/browse">Browse</Link>
        <Link to="/dashboard">Dashboard</Link>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <>
      <AppNav />
      <Routes>
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/" element={<Navigate to="/browse" replace />} />
        <Route path="*" element={<Navigate to="/browse" replace />} />
      </Routes>
    </>
  );
}

