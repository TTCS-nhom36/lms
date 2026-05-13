import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assignmentApi } from '../../api/assignmentApi';
import { questionApi } from '../../api/submissionApi';
import AssignmentFormModal from '../../components/assignment/AssignmentFormModal';
import AssignmentList from '../../components/assignment/AssignmentList';
import QuestionsModal from '../../components/assignment/QuestionsModal';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getApiErrorMessage } from '../../utils/apiError';
import { firstError, validateAssignmentForm } from '../../utils/validation';
import { ArrowLeft, Plus } from 'lucide-react';

const emptyAssignmentForm = {
  title: '',
  description: '',
  type: 'QUIZ',
  dueDate: '',
  allowLate: false,
  maxScore: 100,
  weight: 1,
  timeLimitMins: 0,
  shuffleQuestions: false,
  shuffleOptions: false,
};

const emptyQuestionForm = {
  content: '',
  type: 'SINGLE_CHOICE',
  orderIndex: 1,
  score: 1,
};

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
  const [form, setForm] = useState(emptyAssignmentForm);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedAssignmentDetails, setSelectedAssignmentDetails] = useState(null);
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [questionSaving, setQuestionSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      if (!courseId) {
        toast.error('No course ID available');
        return;
      }
      const res = await assignmentApi.getByCourse(courseId);
      setAssignments(res.data || []);
    } catch (error) {
      console.error('Failed to load assignments:', error);
      toast.error(getApiErrorMessage(error, 'Failed to load assignments'));
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = () => {
    setEditItem(null);
    setForm(emptyAssignmentForm);
    setShowModal(true);
  };

  const handleEdit = (assignment) => {
    setEditItem(assignment);
    setForm({
      title: assignment.title || '',
      description: assignment.description || '',
      type: assignment.type,
      dueDate: assignment.dueDate ? assignment.dueDate.substring(0, 16) : '',
      allowLate: assignment.allowLate || false,
      maxScore: assignment.maxScore || 100,
      weight: assignment.weight || 1,
      timeLimitMins: assignment.timeLimitMins || 0,
      shuffleQuestions: assignment.shuffleQuestions || false,
      shuffleOptions: assignment.shuffleOptions || false,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const errors = validateAssignmentForm(form);
    if (Object.keys(errors).length) {
      toast.error(firstError(errors));
      return;
    }
    try {
      if (!user?.id) {
        toast.error('User not authenticated');
        return;
      }

      const payload = {
        ...form,
        courseId: Number(courseId),
        createdById: String(user.id),
        dueDate: form.dueDate ? `${form.dueDate}:00` : null,
      };

      if (editItem) {
        await assignmentApi.update(editItem.id, payload);
        toast.success('Assignment updated');
      } else {
        await assignmentApi.create(courseId, payload);
        toast.success('Assignment created');
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Save assignment error:', error?.response?.data || error);
      toast.error(getApiErrorMessage(error, 'Failed to save assignment'));
    }
  };

  const openQuestionModal = async (assignment) => {
    if (!assignment?.id) {
      toast.error('Invalid assignment selected');
      return;
    }
    setSelectedAssignment(assignment);
    setSelectedAssignmentDetails(null);
    setQuestionLoading(true);
    try {
      const [assignmentRes, questionsRes] = await Promise.all([
        assignmentApi.getById(assignment.id),
        assignmentApi.getQuestions(assignment.id),
      ]);
      setSelectedAssignmentDetails({ ...assignmentRes.data, questions: questionsRes.data || [] });
    } catch (error) {
      console.error('Failed to load assignment details:', error);
      toast.error('Failed to load assignment details');
      setSelectedAssignmentDetails(assignment);
    } finally {
      setQuestionLoading(false);
      setQuestionForm(emptyQuestionForm);
      setQuestionModalOpen(true);
    }
  };

  const handleAddQuestion = async () => {
    if (!questionForm.content.trim()) {
      toast.error('Question content is required');
      return;
    }
    if (!selectedAssignment?.id) {
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
      const res = await assignmentApi.addQuestion(selectedAssignment.id, payload);
      const newQuestion = res.data;
      toast.success('Question added');
      setQuestionForm({ ...emptyQuestionForm, orderIndex: (selectedAssignmentDetails?.questions?.length || 0) + 2 });
      setSelectedAssignmentDetails((prev) => ({
        ...prev,
        questions: [...(prev?.questions || []), newQuestion],
      }));
    } catch (error) {
      console.error('Failed to add question:', error);
      toast.error('Failed to add question');
    } finally {
      setQuestionSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!questionId) return;
    try {
      await questionApi.delete(questionId);
      toast.success('Question deleted');
      setSelectedAssignmentDetails((prev) => ({
        ...prev,
        questions: (prev?.questions || []).filter((question) => question.id !== questionId),
      }));
    } catch (error) {
      console.error('Failed to delete question:', error);
      toast.error('Failed to delete question');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) {
      toast.error('No assignment selected for deletion');
      return;
    }
    try {
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
      <PageHeader
        title="Assignments"
        description={`Course ID: ${courseId}`}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="!p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100" title="Back">
              <ArrowLeft size={18} />
            </Button>
            <Button onClick={handleCreate}>
              <Plus size={14} /> New Assignment
            </Button>
          </div>
        }
      />

      <AssignmentList
        assignments={assignments}
        courseId={courseId}
        onQuestions={openQuestionModal}
        onSubmissions={(currentCourseId, assignment) => navigate(`/instructor/courses/${currentCourseId}/submissions/${assignment.id}`)}
        onEdit={handleEdit}
        onDelete={(assignment) => { setDeleteId(assignment.id); setShowConfirm(true); }}
      />

      <AssignmentFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        assignment={editItem}
        form={form}
        onChange={setForm}
      />

      <QuestionsModal
        isOpen={questionModalOpen}
        onClose={() => setQuestionModalOpen(false)}
        assignment={selectedAssignment}
        details={selectedAssignmentDetails}
        loading={questionLoading}
        form={questionForm}
        onFormChange={setQuestionForm}
        saving={questionSaving}
        onAddQuestion={handleAddQuestion}
        onDeleteQuestion={handleDeleteQuestion}
      />

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Assignment"
        message="This will permanently delete the assignment. Are you sure?"
      />
    </div>
  );
}
