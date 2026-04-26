import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { Sparkles, Layers3, ArrowRight, Lock, ShieldCheck } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword({ email, otp, newPassword });
      navigate('/login', { state: { message: 'Password reset successfully! Please sign in with your new password.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Check your OTP.');
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
              <div className="section-kicker mb-2">Account Recovery</div>
              <h2 className="card-title">Reset Password</h2>
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
                <ShieldCheck size={16} className="text-[color:var(--app-text-soft)]" />
                OTP
              </label>
              <input
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="app-input w-full tracking-widest text-lg"
                placeholder="000000"
                maxLength={6}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[color:var(--app-text)] flex items-center gap-2">
                <Lock size={16} className="text-[color:var(--app-text-soft)]" />
                New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="app-input w-full"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
              {!loading && <ArrowRight size={18} />}
            </button>
            
            <div className="text-center mt-4">
              <Link to="/login" className="text-sm font-medium text-[color:var(--app-accent)] hover:underline">
                Back to sign in
              </Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
