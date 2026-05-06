import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, Layers3, ArrowRight, Lock, Mail } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      // auth context will set user, and the RoleRedirect in App.jsx will handle navigation
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-5 py-6 lg:px-10 lg:py-8 flex items-center justify-center">
      <div className="w-full max-w-md">
        <section className="card px-5 py-5 lg:px-6 lg:py-6 animate-slide-up">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="section-kicker mb-2">Welcome back</div>
              <h2 className="card-title">Sign in to your account</h2>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent)] flex items-center justify-center">
              <Layers3 size={18} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[color:var(--app-text)] flex items-center gap-2">
                <Mail size={16} className="text-[color:var(--app-text-soft)]" />
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="app-input w-full"
                placeholder="name@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[color:var(--app-text)] flex items-center gap-2">
                  <Lock size={16} className="text-[color:var(--app-text-soft)]" />
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm font-medium text-[color:var(--app-accent)] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="app-input w-full"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2"
            >
              {loading ? 'Signing in...' : 'Sign in'}
              {!loading && <ArrowRight size={18} />}
            </button>
            
            <div className="text-center mt-4">
              <p className="text-sm text-[color:var(--app-text-soft)]">
                Don't have an account?{' '}
                <Link to="/register" className="font-medium text-[color:var(--app-accent)] hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        </section>
      </div>

      <div className="fixed bottom-4 left-0 right-0 text-center pointer-events-none">
        <p className="micro-ui text-[color:var(--app-text-soft)]">LMS Portal Platform © 2026</p>
      </div>
    </div>
  );
}
