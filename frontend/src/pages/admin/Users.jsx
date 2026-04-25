import { useState, useEffect } from 'react';
import { userApi } from '../../api/userApi';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { Plus, Search, Edit, Trash2, Shield, Users as UsersIcon } from 'lucide-react';

export default function AdminUsers() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleTarget, setRoleTarget] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [form, setForm] = useState({
    email: '', passwordHash: '', fullName: '', phone: '', avatarUrl: '', role: 'STUDENT', isActive: true,
  });

  useEffect(() => { loadUsers(); }, [page, search, roleFilter]);

  const loadUsers = async () => {
    try {
      const params = { page, size: 10 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const res = await userApi.getAll(params);
      setUsers(res.data.items || []);
      setTotalPages(res.data.totalPages || 0);
      setTotalElements(res.data.totalElements || 0);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const handleCreate = () => {
    setEditUser(null);
    setForm({ email: '', passwordHash: '', fullName: '', phone: '', avatarUrl: '', role: 'STUDENT', isActive: true });
    setShowModal(true);
  };

  const handleEdit = (u) => {
    setEditUser(u);
    setForm({ email: u.email, passwordHash: '', fullName: u.fullName || '', phone: u.phone || '', avatarUrl: u.avatarUrl || '', role: u.role, isActive: u.isActive });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editUser) { await userApi.update(editUser.id, form); toast.success('User updated'); }
      else { await userApi.create(form); toast.success('User created'); }
      setShowModal(false);
      loadUsers();
    } catch { toast.error('Failed to save user'); }
  };

  const handleDelete = async () => {
    try { await userApi.delete(deleteId); toast.success('User deactivated'); setShowConfirm(false); loadUsers(); }
    catch { toast.error('Failed to deactivate user'); }
  };

  const handleRoleChange = async () => {
    try { await userApi.updateRole(roleTarget.id, { role: newRole }); toast.success('Role updated'); setShowRoleModal(false); loadUsers(); }
    catch { toast.error('Failed to update role'); }
  };

  if (loading) return <LoadingSpinner text="Loading users..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="section-display text-[#1d1d1f]">Users</h2>
        <p className="body-primary text-[#6e6e73]">{totalElements} Total</p>
      </div>

      {/* Utilities Container */}
      <div className="apple-card p-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="!pl-11 !py-2.5 !bg-[#f5f5f7] !border-none focus:!ring-2 focus:!ring-[#0071e3] transition-shadow"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
          className="w-40 !py-2.5 !bg-[#f5f5f7] !border-none focus:!ring-2 focus:!ring-[#0071e3] transition-shadow"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="INSTRUCTOR">Instructor</option>
          <option value="STUDENT">Student</option>
        </select>
        <button onClick={handleCreate} className="btn-primary !py-2.5">
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Table */}
      {users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users found" description="Try adjusting your search or filters." />
      ) : (
        <div className="apple-table-card">
          <div className="overflow-x-auto">
            <table className="min-w-[800px] table-fixed">
              <thead>
                <tr>
                  <th className="!pl-8 w-[38%]">User profile</th>
                  <th className="w-[18%]">Roles & Identity</th>
                  <th className="w-[16%]">System Status</th>
                  <th className="w-[16%]">Date Added</th>
                  <th className="text-right !pr-8 w-[12%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="align-middle">
                    <td className="!pl-8 align-middle">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#f5f5f7] border border-[#d2d2d7] flex items-center justify-center text-[#1d1d1f] font-semibold">
                          {u.fullName?.charAt(0)}
                        </div>
                        <div>
                          <div className="body-emphasis text-[#1d1d1f] mb-0.5">{u.fullName}</div>
                          <div className="control-label text-[#86868b]">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="align-middle"><StatusBadge status={u.role} size="sm" /></td>
                    <td className="align-middle"><StatusBadge status={u.isActive} size="sm" /></td>
                    <td className="control-label text-[#6e6e73] align-middle whitespace-nowrap">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="!pr-8 align-middle">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <button onClick={() => { setRoleTarget(u); setNewRole(u.role); setShowRoleModal(true); }} className="w-8 h-8 rounded-full flex items-center justify-center text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-colors" title="Change Role">
                          <Shield size={16} />
                        </button>
                        <button onClick={() => handleEdit(u)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#0071e3] transition-colors" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => { setDeleteId(u.id); setShowConfirm(true); }} className="w-8 h-8 rounded-full flex items-center justify-center text-[#86868b] hover:bg-[#fef2f2] hover:text-[#e30000] transition-colors" title="Deactivate">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Modals */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editUser ? 'Edit User Profile' : 'Create New User'} size="md">
        <div className="space-y-5">
          <div>
            <label className="control-label block mb-2 text-[#6e6e73]">Email Address</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          {!editUser && (
            <div>
              <label className="control-label block mb-2 text-[#6e6e73]">Secure Password</label>
              <input type="password" value={form.passwordHash} onChange={(e) => setForm({ ...form, passwordHash: e.target.value })} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="control-label block mb-2 text-[#6e6e73]">Full Name</label>
              <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div>
              <label className="control-label block mb-2 text-[#6e6e73]">Contact Phone</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="control-label block mb-2 text-[#6e6e73]">System Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="ADMIN">Administrator</option>
                <option value="INSTRUCTOR">Instructor</option>
                <option value="STUDENT">Student</option>
              </select>
            </div>
            <div>
              <label className="control-label block mb-2 text-[#6e6e73]">Account Status</label>
              <select value={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}>
                <option value="true">Active Access</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary">Save User</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} title="Modify Role" size="sm">
        <div className="space-y-6">
          <p className="body-primary text-[#6e6e73]">
            Select a new role designation for <strong className="text-[#1d1d1f] font-semibold">{roleTarget?.fullName}</strong>.
          </p>
          <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full">
            <option value="ADMIN">Administrator</option>
            <option value="INSTRUCTOR">Instructor</option>
            <option value="STUDENT">Student</option>
          </select>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowRoleModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleRoleChange} className="btn-primary">Apply Role</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete} title="Deactivate Account" message="This action will restrict all platform access for this user." />
    </div>
  );
}
