import { useCallback, useState, useEffect } from 'react';
import { userApi } from '../../api/userApi';
import { useToast } from '../../hooks/useToast';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { getApiErrorMessage } from '../../utils/apiError';
import { firstError, validateUserForm } from '../../utils/validation';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import PageHeader from '../../components/ui/PageHeader';
import SearchInput from '../../components/ui/SearchInput';
import Button from '../../components/ui/Button';
import Dropdown from '../../components/ui/Dropdown';
import Input from '../../components/ui/Input';
import UsersTable from '../../components/users/UsersTable';
import { Plus, Users as UsersIcon } from 'lucide-react';

export default function AdminUsers() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({
    email: '', passwordHash: '', fullName: '', phone: '', avatarUrl: '', role: 'STUDENT', isActive: true,
  });
  const [formErrors, setFormErrors] = useState({});

  const loadUsers = useCallback(async () => {
    try {
      const params = { page, size: 10 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (roleFilter) params.role = roleFilter;
      const res = await userApi.getAll(params);
      setUsers(res.data.items || []);
      setTotalPages(res.data.totalPages || 0);
      setTotalElements(res.data.totalElements || 0);
    } catch (error) { toast.error(getApiErrorMessage(error, 'Failed to load users')); }
    finally { setLoading(false); }
  }, [debouncedSearch, page, roleFilter, toast]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleCreate = () => {
    setEditUser(null);
    setForm({ email: '', passwordHash: '', fullName: '', phone: '', avatarUrl: '', role: 'STUDENT', isActive: true });
    setFormErrors({});
    setShowModal(true);
  };

  const handleEdit = (u) => {
    setEditUser(u);
    setForm({ email: u.email, passwordHash: '', fullName: u.fullName || '', phone: u.phone || '', avatarUrl: u.avatarUrl || '', role: u.role, isActive: u.isActive });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSave = async () => {
    const errors = validateUserForm(form, { editing: Boolean(editUser) });
    setFormErrors(errors);
    if (Object.keys(errors).length) {
      toast.error(firstError(errors));
      return;
    }
    try {
      if (editUser) { await userApi.update(editUser.id, form); toast.success('User updated'); }
      else { await userApi.create(form); toast.success('User created'); }
      setShowModal(false);
      loadUsers();
    } catch (error) { toast.error(getApiErrorMessage(error, 'Failed to save user')); }
  };

  const handleDelete = async () => {
    try { await userApi.delete(deleteId); toast.success('User deactivated'); setShowConfirm(false); loadUsers(); }
    catch (error) { toast.error(getApiErrorMessage(error, 'Failed to deactivate user')); }
  };

  if (loading) return <LoadingSpinner text="Loading users..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Users" description={`${totalElements} total users`} />

      {/* Utilities Container */}
      <div className="apple-card p-4 flex flex-wrap items-center gap-4">
        <SearchInput
          value={search}
          placeholder="Search by name or email..."
          className="flex-1 min-w-[280px]"
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
        <Dropdown
          value={roleFilter}
          placeholder="All Roles"
          options={[
            { value: 'ADMIN', label: 'Admin' },
            { value: 'INSTRUCTOR', label: 'Instructor' },
            { value: 'STUDENT', label: 'Student' },
          ]}
          onChange={(role) => { setRoleFilter(role); setPage(0); }}
          className="w-40"
        />
        <Button onClick={handleCreate} className="!py-2.5">
          <Plus size={16} /> Add User
        </Button>
      </div>

      {/* Table */}
      {users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users found" description="Try adjusting your search or filters." />
      ) : (        <UsersTable
          users={users}
          onEdit={handleEdit}
          onDeactivate={(userId) => { setDeleteId(userId); setShowConfirm(true); }}
        />
      )}

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Modals */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editUser ? 'Edit User Profile' : 'Create New User'} size="md">
        <div className="space-y-5">
          <Input label="Email Address" type="email" required error={formErrors.email} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          {!editUser && (
            <Input label="Secure Password" type="password" required minLength={6} error={formErrors.passwordHash} value={form.passwordHash} onChange={(e) => setForm({ ...form, passwordHash: e.target.value })} />
          )}
          {editUser && (
            <Input label="New Password" type="password" minLength={6} error={formErrors.passwordHash} placeholder="Leave blank to keep current password" value={form.passwordHash} onChange={(e) => setForm({ ...form, passwordHash: e.target.value })} />
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Full Name" type="text" required error={formErrors.fullName} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <Input label="Contact Phone" type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Dropdown
              label="System Role"
              value={form.role}
              options={[
                { value: 'ADMIN', label: 'Administrator' },
                { value: 'INSTRUCTOR', label: 'Instructor' },
                { value: 'STUDENT', label: 'Student' },
              ]}
              onChange={(role) => setForm({ ...form, role })}
            />
            <Dropdown
              label="Account Status"
              value={String(form.isActive)}
              options={[
                { value: 'true', label: 'Active Access' },
                { value: 'false', label: 'Inactive' },
              ]}
              onChange={(isActive) => setForm({ ...form, isActive: isActive === 'true' })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save User</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete} title="Deactivate Account" message="This action will restrict all platform access for this user." />
    </div>
  );
}

