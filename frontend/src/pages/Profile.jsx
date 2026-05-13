import { useCallback, useEffect, useRef, useState } from 'react';
import { userApi } from '../api/userApi';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getApiErrorMessage } from '../utils/apiError';
import { Camera, Loader2, Lock, Save, User } from 'lucide-react';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', avatarUrl: '' });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '' });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const res = await userApi.getMe();
      setProfile(res.data);
      setForm({ fullName: res.data.fullName || '', phone: res.data.phone || '', avatarUrl: res.data.avatarUrl || '' });
    } catch {
      setProfile({ fullName: user?.fullName, email: user?.email, role: user?.role });
      setForm({ fullName: user?.fullName || '', phone: '', avatarUrl: '' });
    } finally {
      setLoading(false);
    }
  }, [user?.email, user?.fullName, user?.role]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleAvatarUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are supported');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be 5 MB or smaller');
      return;
    }
    setUploadingAvatar(true);
    try {
      const res = await userApi.uploadAvatar(file);
      setProfile(res.data);
      setForm((current) => ({ ...current, avatarUrl: res.data.avatarUrl || '' }));
      setUser(res.data);
      toast.success('Avatar updated');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Avatar upload failed'));
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      toast.error('Full name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await userApi.updateMe(form);
      setProfile(res.data);
      setUser(res.data);
      toast.success('Profile updated');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Profile update failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      await userApi.changePassword(passwordForm);
      toast.success('Password changed');
      setPasswordForm({ newPassword: '' });
      setShowPasswordForm(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Password change failed'));
    }
  };

  if (loading) return <LoadingSpinner text="Loading profile..." />;
  const displayProfile = profile || user;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <Card className="p-6 mb-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-indigo-50 via-blue-50 to-sky-50" />
        <div className="relative flex items-end gap-5 mt-8">
          <div className="relative group">
            <button
              type="button"
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 overflow-hidden flex items-center justify-center text-2xl font-bold text-white shadow-lg cursor-pointer border-2 border-white"
              onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
              title="Change avatar"
            >
              {uploadingAvatar ? (
                <Loader2 size={28} className="animate-spin text-white" />
              ) : (
                <Avatar name={displayProfile?.fullName} src={displayProfile?.avatarUrl} className="!h-full !w-full !rounded-2xl !text-2xl" />
              )}
            </button>
            {!uploadingAvatar && (
              <button
                type="button"
                className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={20} className="text-white" />
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarUpload(e.target.files[0])} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">{displayProfile?.fullName}</h2>
            <p className="text-sm text-gray-500">{displayProfile?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
              {displayProfile?.role}
            </span>
          </div>
        </div>
        <p className="relative mt-3 text-xs text-gray-400">
          Click the avatar to upload PNG, JPG, or WebP up to 5 MB.
        </p>
      </Card>

      <Card className="p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <User size={15} className="text-gray-400" />
          Personal information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Full name" type="text" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Input label="Phone" type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Lock size={15} className="text-gray-400" />
          Security
        </h3>
        {!showPasswordForm ? (
          <Button variant="secondary" onClick={() => setShowPasswordForm(true)}>
            <Lock size={14} /> Change password
          </Button>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Input className="flex-1" label="New password" type="password" minLength={6} value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ newPassword: e.target.value })} placeholder="Enter a new password" />
            <Button onClick={handleChangePassword}>Update</Button>
            <Button variant="secondary" onClick={() => setShowPasswordForm(false)}>Cancel</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
