import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import AuthCard from '../components/auth/AuthCard';
import AuthError from '../components/auth/AuthError';
import AuthField from '../components/auth/AuthField';
import AuthShell from '../components/auth/AuthShell';
import AuthSubmitButton from '../components/auth/AuthSubmitButton';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell showFooter>
      <AuthCard kicker="Welcome back" title="Sign in to your account">
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

          <AuthField
            icon={Lock}
            label="Password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="********"
            action={
              <Link to="/forgot-password" className="text-sm font-medium text-[color:var(--app-accent)] hover:underline">
                Forgot password?
              </Link>
            }
          />

          <AuthSubmitButton loading={loading} loadingText="Signing in...">
            Sign in
          </AuthSubmitButton>

          <div className="text-center mt-4">
            <p className="text-sm text-[color:var(--app-text-soft)]">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-[color:var(--app-accent)] hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
