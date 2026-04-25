import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assignmentApi } from '../../api/assignmentApi';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import { Plus, Edit, Trash2, ClipboardList, Eye, Calendar, Clock, ArrowLeft } from 'lucide-react';

export default function Assignments() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', type: 'QUIZ', dueDate: '',
    allowLate: false, maxScore: 100, weight: 1, timeLimitMins: 0,
    shuffleQuestions: false, shuffleOptions: false,
  });

  useEffect(() => { loadData(); }, [courseId]);

  const loadData = async () => {
    try { const res = await assignmentApi.getByCourse(courseId); setAssignments(res.data || []); }
    catch { toast.error('Failed to load assignments'); }
    finally { setLoading(false); }
  };

  const handleCreate = () => {
    setEditItem(null);
    setForm({ title: '', description: '', type: 'QUIZ', dueDate: '', allowLate: false, maxScore: 100, weight: 1, timeLimitMins: 0, shuffleQuestions: false, shuffleOptions: false });
    setShowModal(true);
  };

  const handleEdit = (a) => {
    setEditItem(a);
    setForm({ title: a.title || '', description: a.description || '', type: a.type, dueDate: a.dueDate ? a.dueDate.substring(0, 16) : '', allowLate: a.allowLate || false, maxScore: a.maxScore || 100, weight: a.weight || 1, timeLimitMins: a.timeLimitMins || 0, shuffleQuestions: a.shuffleQuestions || false, shuffleOptions: a.shuffleOptions || false });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const data = { ...form, dueDate: form.dueDate ? form.dueDate + ':00' : null };
      if (editItem) { await assignmentApi.update(editItem.id, data); toast.success('Assignment updated'); }
      else { await assignmentApi.create(courseId, data); toast.success('Assignment created'); }
      setShowModal(false); loadData();
    } catch { toast.error('Failed to save assignment'); }
  };

  const handleDelete = async () => {
    try { await assignmentApi.delete(deleteId); toast.success('Assignment deleted'); setShowConfirm(false); loadData(); }
    catch { toast.error('Failed to delete'); }
  };

  if (loading) return <LoadingSpinner text="Loading assignments..." />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900">Assignments</h2>
          <p className="text-xs text-gray-500">Course ID: {courseId}</p>
        </div>
        <button onClick={handleCreate} className="btn-primary">
          <Plus size={14} /> New Assignment
        </button>
      </div>

      {assignments.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No assignments" description="Create your first assignment for this course" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {assignments.map((a, i) => (
            <div key={a.id} className="card p-4 animate-slide-up" style={{ opacity: 0, animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-start justify-between mb-2.5">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-[13px] truncate">{a.title}</h4>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{a.description || 'No description'}</p>
                </div>
                <StatusBadge status={a.type} size="xs" />
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-3">
                {a.dueDate && (
                  <span className="flex items-center gap-1">
                    <Calendar size={11} /> {new Date(a.dueDate).toLocaleDateString()}
                  </span>
                )}
                {a.timeLimitMins > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {a.timeLimitMins} min
                  </span>
                )}
                <span>Max: {a.maxScore}</span>
              </div>
              <div className="flex items-center gap-0.5 pt-2.5 border-t border-gray-100">
                <button onClick={() => navigate(`/instructor/courses/${courseId}/submissions/${a.id}`)} className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer" title="View Submissions">
                  <Eye size={14} />
                </button>
                <button onClick={() => handleEdit(a)} className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer" title="Edit">
                  <Edit size={14} />
                </button>
                <button onClick={() => { setDeleteId(a.id); setShowConfirm(true); }} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-auto cursor-pointer" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Assignment' : 'New Assignment'} size="lg">
        <div className="space-y-3">
          <div><label className="text-xs font-medium text-gray-500 mb-1 block">Title</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-gray-500 mb-1 block">Description</label><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="QUIZ">Quiz</option><option value="FILE_UPLOAD">File Upload</option><option value="LINK_SUBMIT">Link Submit</option>
              </select>
            </div>
            <div><label className="text-xs font-medium text-gray-500 mb-1 block">Max Score</label><input type="number" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: parseFloat(e.target.value) })} /></div>
            <div><label className="text-xs font-medium text-gray-500 mb-1 block">Weight</label><input type="number" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: parseFloat(e.target.value) })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-500 mb-1 block">Due Date</label><input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
            <div><label className="text-xs font-medium text-gray-500 mb-1 block">Time Limit (min)</label><input type="number" value={form.timeLimitMins} onChange={(e) => setForm({ ...form, timeLimitMins: parseInt(e.target.value) })} /></div>
          </div>
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={form.allowLate} onChange={(e) => setForm({ ...form, allowLate: e.target.checked })} className="!w-4 !h-4 accent-red-500" />
              Allow Late
            </label>
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={form.shuffleQuestions} onChange={(e) => setForm({ ...form, shuffleQuestions: e.target.checked })} className="!w-4 !h-4 accent-red-500" />
              Shuffle Questions
            </label>
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={form.shuffleOptions} onChange={(e) => setForm({ ...form, shuffleOptions: e.target.checked })} className="!w-4 !h-4 accent-red-500" />
              Shuffle Options
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete} title="Delete Assignment" message="This will permanently delete the assignment. Are you sure?" />
    </div>
  );
}
