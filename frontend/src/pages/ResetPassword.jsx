import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import { authApi } from '../api/authApi';
import AuthCard from '../components/auth/AuthCard';
import AuthError from '../components/auth/AuthError';
import AuthField from '../components/auth/AuthField';
import AuthShell from '../components/auth/AuthShell';
import AuthSubmitButton from '../components/auth/AuthSubmitButton';

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

  const handleSubmit = async (event) => {
    event.preventDefault();
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
    <AuthShell>
      <AuthCard kicker="Account Recovery" title="Reset Password" centered>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <AuthError message={error} />

          <AuthField icon={ShieldCheck} label="OTP" type="text" required value={otp} onChange={(event) => setOtp(event.target.value)} className="tracking-widest text-lg" placeholder="000000" maxLength={6} />
          <AuthField icon={Lock} label="New Password" type="password" required minLength={6} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="********" />

          <AuthSubmitButton loading={loading} loadingText="Resetting...">
            Reset Password
          </AuthSubmitButton>

          <div className="text-center mt-4">
            <Link to="/login" className="text-sm font-medium text-[color:var(--app-accent)] hover:underline">
              Back to sign in
            </Link>
          </div>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
