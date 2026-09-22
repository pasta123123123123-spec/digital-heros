import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <header className="border-b border-mist/10">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-xl tracking-tight">
          Digital Heroes
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link to="/charities" className="text-mist hover:text-parchment">
            Charities
          </Link>
          {!user && (
            <>
              <Link to="/login" className="text-mist hover:text-parchment">
                Log in
              </Link>
              <Link to="/signup" className="btn-primary !px-4 !py-2 text-sm">
                Join now
              </Link>
            </>
          )}
          {user?.role === 'SUBSCRIBER' && (
            <Link to="/dashboard" className="text-mist hover:text-parchment">
              Dashboard
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className="text-mist hover:text-parchment">
              Admin
            </Link>
          )}
          {user && (
            <div className="flex items-center gap-4 border-l border-mist/20 pl-4 ml-2">
              <span className="text-mist">Hi, {user.name?.split(' ')[0]}</span>
              <button onClick={handleLogout} className="btn-secondary !px-4 !py-2 text-sm">
                Log out
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
