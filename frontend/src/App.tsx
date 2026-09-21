import { Route, Routes } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { ProtectedRoute, AdminRoute } from './components/RouteGuards';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { CharityDirectory } from './pages/CharityDirectory';
import { CharityProfile } from './pages/CharityProfile';
import { Subscribe } from './pages/Subscribe';
import { Dashboard } from './pages/Dashboard';
import { AdminDashboard } from './pages/AdminDashboard';

import { Toaster } from 'react-hot-toast';

export function App() {
  return (
    <div className="min-h-screen bg-ink-950 text-parchment">
      <Toaster position="bottom-right" toastOptions={{ className: 'text-sm' }} />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/charities" element={<CharityDirectory />} />
        <Route path="/charities/:id" element={<CharityProfile />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/subscribe" element={<Subscribe />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="font-display text-3xl">Page not found</h1>
      <p className="mt-2 text-mist">The page you're looking for doesn't exist.</p>
    </div>
  );
}
