import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { logout } from '../features/auth/authSlice';

export default function Navbar() {
  const user = useSelector((s: RootState) => s.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link to="/" className="brand">
          Glow<span>Book</span>
        </Link>
        <div className="nav-spacer" />
        <Link to="/">Discover</Link>
        {user && <Link to="/bookings">My Bookings</Link>}
        {user && (user.role === 'owner' || user.role === 'admin') && (
          <Link to="/owner">Owner</Link>
        )}
        {user ? (
          <>
            <span className="muted">Hi, {user.fullName.split(' ')[0]}</span>
            <button
              className="btn ghost sm"
              onClick={() => {
                dispatch(logout());
                navigate('/');
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className="btn sm">
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
