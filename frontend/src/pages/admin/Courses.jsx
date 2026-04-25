import { useState, useEffect } from 'react';
import { courseApi } from '../../api/courseApi';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { Plus, Search, Edit, Trash2, Eye, Send, BookOpen } from 'lucide-react';

export default function AdminCourses() {
  const toast = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', thumbnailUrl: '', status: 'DRAFT' });

  useEffect(() => { loadCourses(); }, [page, search, statusFilter]);

  const loadCourses = async () => {
    try {
      const params = { page, size: 12 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await courseApi.getAll(params);
      setCourses(res.data.items || []);
      setTotalPages(res.data.totalPages || 0);
      setTotalElements(res.data.totalElements || 0);
    } catch { toast.error('Failed to load courses'); }
    finally { setLoading(false); }
  };

  const handleCreate = () => { setEditCourse(null); setForm({ title: '', description: '', thumbnailUrl: '', status: 'DRAFT' }); setShowModal(true); };
  const handleEdit = (c) => { setEditCourse(c); setForm({ title: c.title || '', description: c.description || '', thumbnailUrl: c.thumbnailUrl || '', status: c.status }); setShowModal(true); };

  const handleSave = async () => {
    try {
      if (editCourse) { await courseApi.update(editCourse.id, form); toast.success('Course updated'); }
      else { await courseApi.create(form); toast.success('Course created'); }
      setShowModal(false); loadCourses();
    } catch { toast.error('Failed to save course'); }
  };

  const handleDelete = async () => {
    try { await courseApi.delete(deleteId); toast.success('Course archived'); setShowConfirm(false); loadCourses(); }
    catch { toast.error('Failed to archive course'); }
  };

  const handlePublish = async (id) => {
    try { await courseApi.publish(id); toast.success('Course published'); loadCourses(); }
    catch { toast.error('Failed to publish course'); }
  };

  if (loading) return <LoadingSpinner text="Loading courses..." />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Course Management</h2>
          <p className="text-xs text-gray-500 mt-0.5">{totalElements} total courses</p>
        </div>
        <button onClick={handleCreate} className="btn-primary">
          <Plus size={15} /> New Course
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search courses..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="!pl-9 !text-[13px]" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="!w-36 !text-[13px]">
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {courses.length === 0 ? (
        <EmptyState icon={BookOpen} title="No courses found" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c, i) => (
            <div
              key={c.id}
              className="card overflow-hidden animate-slide-up"
              style={{ opacity: 0, animationDelay: `${i * 0.04}s` }}
            >
              <div className="h-32 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center relative">
                {c.thumbnailUrl ? (
                  <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-cover" />
                ) : (
                  <BookOpen size={32} className="text-blue-300" />
                )}
                <div className="absolute top-2.5 right-2.5">
                  <StatusBadge status={c.status} size="xs" />
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-sm truncate">{c.title}</h3>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{c.description || 'No description'}</p>
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
                  <button onClick={() => navigate(`/admin/courses/${c.id}`)} className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer" title="View">
                    <Eye size={14} />
                  </button>
                  <button onClick={() => handleEdit(c)} className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer" title="Edit">
                    <Edit size={14} />
                  </button>
                  {c.status === 'DRAFT' && (
                    <button onClick={() => handlePublish(c.id)} className="p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors cursor-pointer" title="Publish">
                      <Send size={14} />
                    </button>
                  )}
                  <button onClick={() => { setDeleteId(c.id); setShowConfirm(true); }} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-auto cursor-pointer" title="Archive">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editCourse ? 'Edit Course' : 'New Course'} size="md">
        <div className="space-y-4">
          <div><label className="text-xs font-medium text-gray-600 mb-1 block">Title</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-gray-600 mb-1 block">Description</label><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-gray-600 mb-1 block">Thumbnail URL</label><input type="url" value={form.thumbnailUrl} onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })} placeholder="https://..." /></div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full">
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete} title="Archive Course" message="This will archive the course. Are you sure?" />
    </div>
  );
}
