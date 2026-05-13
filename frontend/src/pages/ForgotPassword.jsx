import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { authApi } from '../api/authApi';
import AuthCard from '../components/auth/AuthCard';
import AuthError from '../components/auth/AuthError';
import AuthField from '../components/auth/AuthField';
import AuthShell from '../components/auth/AuthShell';
import AuthSubmitButton from '../components/auth/AuthSubmitButton';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      navigate('/reset-password', { state: { email } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please check the email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthCard kicker="Password Reset" title="Send OTP" centered>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <AuthError message={error} />

          <AuthField
            icon={Mail}
            label="Email address"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
          />

          <AuthSubmitButton loading={loading} loadingText="Sending OTP...">
            Send OTP
          </AuthSubmitButton>

          <div className="text-center mt-4">
            <p className="text-sm text-[color:var(--app-text-soft)]">
              Remember your password?{' '}
              <Link to="/login" className="font-medium text-[color:var(--app-accent)] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
