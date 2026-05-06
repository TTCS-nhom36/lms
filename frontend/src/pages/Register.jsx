import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, Layers3, ArrowRight, Lock, Mail, User, Phone } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    passwordHash: '', // Maps to 'password' field conceptually
    role: 'STUDENT',
    isActive: true
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(formData);
      navigate('/login', { state: { message: 'Registration successful! Please sign in.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen px-5 py-6 lg:px-10 lg:py-8 flex items-center justify-center">
      <div className="w-full max-w-md">
        <section className="card px-5 py-5 lg:px-6 lg:py-6 animate-slide-up">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="section-kicker mb-2">New account</div>
              <h2 className="card-title">Sign up</h2>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent)] flex items-center justify-center">
              <Layers3 size={18} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[color:var(--app-text)] flex items-center gap-2">
                <User size={16} className="text-[color:var(--app-text-soft)]" />
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="app-input w-full"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[color:var(--app-text)] flex items-center gap-2">
                <Mail size={16} className="text-[color:var(--app-text-soft)]" />
                Email address
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="app-input w-full"
                placeholder="name@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[color:var(--app-text)] flex items-center gap-2">
                <Phone size={16} className="text-[color:var(--app-text-soft)]" />
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="app-input w-full"
                placeholder="+1 234 567 8900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[color:var(--app-text)] flex items-center gap-2">
                <Lock size={16} className="text-[color:var(--app-text-soft)]" />
                Password
              </label>
              <input
                type="password"
                name="passwordHash"
                required
                minLength={6}
                value={formData.passwordHash}
                onChange={handleChange}
                className="app-input w-full"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2"
            >
              {loading ? 'Creating account...' : 'Create account'}
              {!loading && <ArrowRight size={18} />}
            </button>
            
            <div className="text-center mt-4">
              <p className="text-sm text-[color:var(--app-text-soft)]">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-[color:var(--app-accent)] hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
