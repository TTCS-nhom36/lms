import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assignmentApi } from '../../api/assignmentApi';
import { useAuth } from '../../contexts/AuthContext';
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
  const { user } = useAuth();
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
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedAssignmentDetails, setSelectedAssignmentDetails] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    content: '', type: 'SINGLE_CHOICE', orderIndex: 1, score: 1,
  });
  const [questionSaving, setQuestionSaving] = useState(false);

  useEffect(() => { loadData(); }, [courseId]);

  const loadData = async () => {
    try {
      if (!courseId) {
        toast.error('No course ID available');
        return;
      }
      console.log('Loading assignments for course:', courseId);
      const res = await assignmentApi.getByCourse(courseId);
      setAssignments(res.data || []);
    } catch (error) {
      console.error('Failed to load assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
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
      if (!user?.id) {
        toast.error('User not authenticated');
        console.error('Missing user:', user);
        return;
      }

      const payload = {
        ...form,
        createdById: String(user.id), // đảm bảo luôn là string UUID
        dueDate: form.dueDate ? form.dueDate + ':00' : null,
      };

      console.log('FINAL PAYLOAD:', payload);

      if (editItem) {
        if (!editItem.id) {
          toast.error('Invalid assignment ID');
          return;
        }

        await assignmentApi.update(editItem.id, payload);
        toast.success('Assignment updated');
      } else {
        if (!courseId) {
          toast.error('No course selected');
          return;
        }

        await assignmentApi.create(courseId, payload);
        toast.success('Assignment created');
      }

      setShowModal(false);
      loadData();

    } catch (error) {
      console.error('Save assignment error:', error?.response?.data || error);
      toast.error(error?.response?.data?.message || 'Failed to save assignment');
    }
  };

  const openQuestionModal = async (assignment) => {
    if (!assignment || !assignment.id) {
      toast.error('Invalid assignment selected');
      return;
    }
    setSelectedAssignment(assignment);
    setSelectedAssignmentDetails(null);
    setQuestionLoading(true);
    try {
      const res = await assignmentApi.getById(assignment.id);
      setSelectedAssignmentDetails(res.data);
    } catch (error) {
      console.error('Failed to load assignment details:', error);
      toast.error('Failed to load assignment details');
      setSelectedAssignmentDetails(assignment);
    } finally {
      setQuestionLoading(false);
      setQuestionForm({ content: '', type: 'SINGLE_CHOICE', orderIndex: 1, score: 1 });
      setQuestionModalOpen(true);
    }
  };

  const handleAddQuestion = async () => {
    if (!questionForm.content.trim()) {
      toast.error('Question content is required');
      return;
    }
    if (!selectedAssignment || !selectedAssignment.id) {
      toast.error('No assignment selected');
      return;
    }
    setQuestionSaving(true);
    try {
      const payload = {
        content: questionForm.content,
        type: questionForm.type,
        orderIndex: Number(questionForm.orderIndex),
        score: Number(questionForm.score),
      };
      console.log('Adding question to assignment:', selectedAssignment.id, payload);
      await assignmentApi.addQuestion(selectedAssignment.id, payload);
      toast.success('Question added');
      setQuestionForm({ content: '', type: 'SINGLE_CHOICE', orderIndex: selectedAssignmentDetails?.questions?.length + 2 || 1, score: 1 });
      if (selectedAssignmentDetails) {
        setSelectedAssignmentDetails({
          ...selectedAssignmentDetails,
          questions: [...(selectedAssignmentDetails.questions || []), payload],
        });
      }
    } catch (error) {
      console.error('Failed to add question:', error);
      toast.error('Failed to add question');
    } finally {
      setQuestionSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) {
      toast.error('No assignment selected for deletion');
      return;
    }
    try {
      console.log('Deleting assignment:', deleteId);
      await assignmentApi.delete(deleteId);
      toast.success('Assignment deleted');
      setShowConfirm(false);
      loadData();
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      toast.error('Failed to delete');
    }
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
              <div className="flex items-center gap-1 pt-2.5 border-t border-gray-100">
                <button onClick={() => openQuestionModal(a)} className="px-3 py-1.5 rounded-md text-gray-500 hover:text-green-700 hover:bg-green-50 transition-colors cursor-pointer text-[11px] font-semibold" title="Add Question">
                  <Plus size={12} className="inline-block mr-1" /> Questions
                </button>
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

      <Modal isOpen={questionModalOpen} onClose={() => setQuestionModalOpen(false)} title={selectedAssignment ? `Questions for ${selectedAssignment.title}` : 'Manage Questions'} size="lg">
        <div className="space-y-4">
          {questionLoading ? (
            <div className="p-6 text-center">
              <LoadingSpinner text="Loading questions..." />
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Add question</h3>
                  <p className="text-xs text-gray-500">Use the assignment question endpoint to add quiz questions.</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Question</label>
                    <textarea rows={3} value={questionForm.content} onChange={(e) => setQuestionForm({ ...questionForm, content: e.target.value })} placeholder="Write the question content here" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Type</label>
                      <select value={questionForm.type} onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value })}>
                        <option value="SINGLE_CHOICE">Single Choice</option>
                        <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                        <option value="TRUE_FALSE">True / False</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Score</label>
                      <input type="number" min="0" value={questionForm.score} onChange={(e) => setQuestionForm({ ...questionForm, score: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Order</label>
                      <input type="number" min="1" value={questionForm.orderIndex} onChange={(e) => setQuestionForm({ ...questionForm, orderIndex: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                    <button onClick={() => setQuestionModalOpen(false)} className="btn-secondary">Close</button>
                    <button onClick={handleAddQuestion} disabled={questionSaving} className="btn-primary">
                      <Plus size={14} className="inline-block mr-1" /> {questionSaving ? 'Adding...' : 'Add Question'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Existing Questions</h3>
                {selectedAssignmentDetails?.questions?.length ? (
                  <div className="space-y-3">
                    {selectedAssignmentDetails.questions.map((question, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
                          <span>{question.type || 'Question'}</span>
                          <span>Score: {question.score ?? '—'}</span>
                        </div>
                        <p className="text-sm text-gray-700">{question.content || 'No content available'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No question data available yet. After adding, questions will appear here if the backend includes them.</p>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete} title="Delete Assignment" message="This will permanently delete the assignment. Are you sure?" />
    </div>
  );
}
