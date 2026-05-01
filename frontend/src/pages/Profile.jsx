import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { userApi } from '../api/userApi';
import { User, Lock, Save } from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', avatarUrl: '' });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '' });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const res = await userApi.getMe();
      setProfile(res.data);
      setForm({ fullName: res.data.fullName || '', phone: res.data.phone || '', avatarUrl: res.data.avatarUrl || '' });
    } catch {
      setProfile({ fullName: user?.fullName, email: user?.email, role: user?.role });
      setForm({ fullName: user?.fullName || '', phone: '', avatarUrl: '' });
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await userApi.updateMe(form);
      setProfile(res.data);
      updateUser({ fullName: res.data.fullName, avatarUrl: res.data.avatarUrl });
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.newPassword) return;
    try {
      await userApi.changePassword(passwordForm);
      toast.success('Password changed');
      setPasswordForm({ newPassword: '' });
      setShowPasswordForm(false);
    } catch { toast.error('Failed to change password'); }
  };

  if (loading) return <LoadingSpinner text="Loading profile..." />;
  const dp = profile || user;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header card */}
      <div className="card p-6 mb-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-red-50 to-rose-100" />
        <div className="relative flex items-end gap-4 mt-6">
          <div className="w-16 h-16 rounded-xl bg-red-500 flex items-center justify-center text-2xl font-bold text-white shadow-md">
            {dp?.fullName?.charAt(0) || '?'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{dp?.fullName}</h2>
            <p className="text-sm text-gray-500">{dp?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200">
              {dp?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="card p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <User size={15} className="text-gray-400" />
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Full Name</label>
            <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Phone</label>
            <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Avatar URL</label>
            <input type="url" value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Lock size={15} className="text-gray-400" />
          Security
        </h3>
        {!showPasswordForm ? (
          <button onClick={() => setShowPasswordForm(true)} className="btn-secondary">
            <Lock size={14} /> Change Password
          </button>
        ) : (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">New Password</label>
              <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ newPassword: e.target.value })} placeholder="Enter new password" />
            </div>
            <button onClick={handleChangePassword} className="btn-primary">Update</button>
            <button onClick={() => setShowPasswordForm(false)} className="btn-secondary">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
