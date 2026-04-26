import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { Sparkles, Layers3, ArrowRight, Mail } from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      // Proceed to reset password screen and pass the email
      navigate('/reset-password', { state: { email } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please check the email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-5 py-6 lg:px-10 lg:py-8 flex items-center justify-center">
      <div className="w-full max-w-md">
        <section className="card px-5 py-5 lg:px-6 lg:py-6 animate-slide-up flex flex-col justify-center">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="section-kicker mb-2">Password Reset</div>
              <h2 className="card-title">Send OTP</h2>
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

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
              {!loading && <ArrowRight size={18} />}
            </button>
            
            <div className="text-center mt-4">
              <p className="text-sm text-[color:var(--app-text-soft)]">
                Remember your password?{' '}
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
