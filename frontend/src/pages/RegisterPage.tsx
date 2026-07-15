import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { authApi } from '../api/endpoints';
import { setCredentials } from '../features/auth/authSlice';

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'customer',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.register(form);
      dispatch(setCredentials(data));
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card center-card">
        <h1>Create your account</h1>
        <p className="muted">Join to discover and book salons near you.</p>
        <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
          <div className="field">
            <label>Full name</label>
            <input value={form.fullName} onChange={set('fullName')} required minLength={2} />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set('email')} required />
          </div>
          <div className="field">
            <label>Phone (optional)</label>
            <input value={form.phone} onChange={set('phone')} />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              required
              minLength={8}
            />
          </div>
          <div className="field">
            <label>Account type</label>
            <select value={form.role} onChange={set('role')}>
              <option value="customer">Customer — book appointments</option>
              <option value="owner">Salon owner — list my salon</option>
            </select>
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Creating…' : 'Sign up'}
          </button>
        </form>
        <p className="muted" style={{ marginTop: 16 }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
