import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, Phone, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import AuthCard from '../components/auth/AuthCard';
import AuthError from '../components/auth/AuthError';
import AuthField from '../components/auth/AuthField';
import AuthShell from '../components/auth/AuthShell';
import AuthSubmitButton from '../components/auth/AuthSubmitButton';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    passwordHash: '',
    role: 'STUDENT',
    isActive: true,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
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

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  return (
    <AuthShell>
      <AuthCard kicker="New account" title="Sign up">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AuthError message={error} />

          <AuthField label="Full Name" type="text" name="fullName" required value={formData.fullName} onChange={handleChange} placeholder="John Doe" />
          <AuthField label="Email address" type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="name@example.com" />
          <AuthField label="Password" type="password" name="passwordHash" required minLength={6} value={formData.passwordHash} onChange={handleChange} placeholder="********" />

          <AuthSubmitButton loading={loading} loadingText="Creating account...">
            Create account
          </AuthSubmitButton>

          <div className="text-center mt-4">
            <p className="text-sm text-[color:var(--app-text-soft)]">
              Already have an account?{' '}
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
