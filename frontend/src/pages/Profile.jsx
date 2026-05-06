import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { userApi } from '../api/userApi';
import { User, Lock, Save, Camera, Loader2 } from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';

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

  const handleAvatarUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Chỉ chấp nhận file ảnh'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Ảnh không được vượt quá 5 MB'); return; }
    setUploadingAvatar(true);
    try {
      const res = await userApi.uploadAvatar(file);
      const updated = res.data;
      setProfile(updated);
      setForm(prev => ({ ...prev, avatarUrl: updated.avatarUrl || '' }));
      setUser(updated);
      toast.success('Cập nhật ảnh đại diện thành công');
    } catch { toast.error('Tải ảnh thất bại'); }
    finally { setUploadingAvatar(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await userApi.updateMe(form);
      setProfile(res.data);
      setUser(res.data);
      toast.success('Cập nhật thông tin thành công');
    } catch { toast.error('Cập nhật thất bại'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.newPassword) return;
    try {
      await userApi.changePassword(passwordForm);
      toast.success('Đổi mật khẩu thành công');
      setPasswordForm({ newPassword: '' });
      setShowPasswordForm(false);
    } catch { toast.error('Đổi mật khẩu thất bại'); }
  };

  if (loading) return <LoadingSpinner text="Đang tải thông tin..." />;
  const dp = profile || user;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header card with avatar upload */}
      <div className="card p-6 mb-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-indigo-50 via-blue-50 to-sky-50" />
        <div className="relative flex items-end gap-5 mt-8">
          {/* Clickable avatar */}
          <div className="relative group">
            <div
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 overflow-hidden flex items-center justify-center text-2xl font-bold text-white shadow-lg cursor-pointer border-2 border-white"
              onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
              title="Nhấn để đổi ảnh đại diện"
            >
              {uploadingAvatar ? (
                <Loader2 size={28} className="animate-spin text-white" />
              ) : dp?.avatarUrl ? (
                <img src={dp.avatarUrl} alt={dp.fullName} className="w-full h-full object-cover" />
              ) : (
                dp?.fullName?.charAt(0)?.toUpperCase() || '?'
              )}
            </div>
            {/* Hover overlay */}
            {!uploadingAvatar && (
              <div
                className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={20} className="text-white" />
              </div>
            )}
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleAvatarUpload(e.target.files[0])}
            />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">{dp?.fullName}</h2>
            <p className="text-sm text-gray-500">{dp?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
              {dp?.role}
            </span>
          </div>
        </div>
        <p className="relative mt-3 text-xs text-gray-400">
          Nhấn vào ảnh để thay đổi ảnh đại diện • PNG, JPG, WebP tối đa 5 MB
        </p>
      </div>

      {/* Personal info form */}
      <div className="card p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <User size={15} className="text-gray-400" />
          Thông tin cá nhân
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Họ và tên</label>
            <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Số điện thoại</label>
            <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            <Save size={14} /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Lock size={15} className="text-gray-400" />
          Bảo mật
        </h3>
        {!showPasswordForm ? (
          <button onClick={() => setShowPasswordForm(true)} className="btn-secondary">
            <Lock size={14} /> Đổi mật khẩu
          </button>
        ) : (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Mật khẩu mới</label>
              <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ newPassword: e.target.value })} placeholder="Nhập mật khẩu mới" />
            </div>
            <button onClick={handleChangePassword} className="btn-primary">Cập nhật</button>
            <button onClick={() => setShowPasswordForm(false)} className="btn-secondary">Huỷ</button>
          </div>
        )}
      </div>
    </div>
  );
}
