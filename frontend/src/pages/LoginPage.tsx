import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { authApi } from '../api/endpoints';
import { setCredentials } from '../features/auth/authSlice';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      dispatch(setCredentials(data));
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card center-card">
        <h1>Welcome back</h1>
        <p className="muted">Log in to book your next appointment.</p>
        <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Signing in…' : 'Log in'}
          </button>
        </form>
        <p className="muted" style={{ marginTop: 16 }}>
          No account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
