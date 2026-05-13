import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Check, Clock, Edit, Eye, Plus, Save, Star, Trash2, X } from 'lucide-react';
import { assignmentApi } from '../api/assignmentApi';
import { questionApi } from '../api/submissionApi';
import AssignmentFormModal from '../components/assignment/AssignmentFormModal';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Dropdown from '../components/ui/Dropdown';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import Textarea from '../components/ui/Textarea';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getApiErrorMessage } from '../utils/apiError';
import { firstError, validateAssignmentForm } from '../utils/validation';

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
  options: [
    { content: '', isCorrect: true, orderIndex: 1 },
    { content: '', isCorrect: false, orderIndex: 2 },
  ],
};

const questionTypes = [
  { value: 'SINGLE_CHOICE', label: 'Single Choice' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'TRUE_FALSE', label: 'True / False' },
];

function toAssignmentForm(assignment) {
  return {
    title: assignment.title || '',
    description: assignment.description || '',
    type: assignment.type || 'QUIZ',
    dueDate: assignment.dueDate ? assignment.dueDate.substring(0, 16) : '',
    allowLate: assignment.allowLate || false,
    maxScore: assignment.maxScore || 100,
    weight: assignment.weight || 1,
    timeLimitMins: assignment.timeLimitMins || 0,
    shuffleQuestions: assignment.shuffleQuestions || false,
    shuffleOptions: assignment.shuffleOptions || false,
  };
}

function normalizeQuestionPayload(form, assignmentId) {
  const options = (form.options || [])
    .map((option, index) => ({
      content: option.content.trim(),
      isCorrect: Boolean(option.isCorrect),
      orderIndex: Number(option.orderIndex) || index + 1,
    }))
    .filter((option) => option.content);

  return {
    assignmentId: Number(assignmentId),
    content: form.content.trim(),
    type: form.type,
    orderIndex: Number(form.orderIndex) || 1,
    score: Number(form.score) || 1,
    options,
  };
}

export default function AssignmentDetailManage() {
  const { courseId, assignmentId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAdmin } = useAuth();
  const [assignment, setAssignment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);
  const [showAssignmentConfirm, setShowAssignmentConfirm] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [editQuestion, setEditQuestion] = useState(null);
  const [deleteQuestion, setDeleteQuestion] = useState(null);

  const basePath = isAdmin ? '/admin' : '/instructor';
  const sortedQuestions = useMemo(
    () => [...questions].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)),
    [questions],
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const assignmentRes = await assignmentApi.getById(assignmentId);
      const assignmentData = assignmentRes.data;
      setAssignment(assignmentData);

      if (assignmentData.type === 'QUIZ') {
        const questionRes = await assignmentApi.getQuestions(assignmentId);
        setQuestions(questionRes.data || []);
      } else {
        setQuestions([]);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load assignment'));
    } finally {
      setLoading(false);
    }
  }, [assignmentId, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const openEditAssignment = () => {
    setAssignmentForm(toAssignmentForm(assignment));
    setShowAssignmentModal(true);
  };

  const handleSaveAssignment = async () => {
    const errors = validateAssignmentForm(assignmentForm);
    if (Object.keys(errors).length) {
      toast.error(firstError(errors));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...assignmentForm,
        courseId: Number(courseId),
        dueDate: assignmentForm.dueDate ? `${assignmentForm.dueDate}:00` : null,
      };
      await assignmentApi.update(assignmentId, payload);
      toast.success('Assignment updated');
      setShowAssignmentModal(false);
      loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save assignment'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async () => {
    try {
      await assignmentApi.delete(assignmentId);
      toast.success('Assignment deleted');
      navigate(`${basePath}/courses/${courseId}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete assignment'));
    }
  };

  const openCreateQuestion = () => {
    setEditQuestion(null);
    setQuestionForm({ ...emptyQuestionForm, orderIndex: questions.length + 1 });
    setShowQuestionModal(true);
  };

  const openEditQuestion = (question) => {
    setEditQuestion(question);
    setQuestionForm({
      content: question.content || '',
      type: question.type || 'SINGLE_CHOICE',
      orderIndex: question.orderIndex || 1,
      score: question.score ?? 1,
      options: question.options?.length
        ? question.options.map((option, index) => ({
            content: option.content || '',
            isCorrect: Boolean(option.isCorrect),
            orderIndex: option.orderIndex || index + 1,
          }))
        : emptyQuestionForm.options,
    });
    setShowQuestionModal(true);
  };

  const setQuestionOption = (index, patch) => {
    setQuestionForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => (optionIndex === index ? { ...option, ...patch } : option)),
    }));
  };

  const addQuestionOption = () => {
    setQuestionForm((current) => ({
      ...current,
      options: [...current.options, { content: '', isCorrect: false, orderIndex: current.options.length + 1 }],
    }));
  };

  const removeQuestionOption = (index) => {
    setQuestionForm((current) => ({
      ...current,
      options: current.options
        .filter((_, optionIndex) => optionIndex !== index)
        .map((option, optionIndex) => ({ ...option, orderIndex: optionIndex + 1 })),
    }));
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.content.trim()) {
      toast.error('Question content is required');
      return;
    }
    const payload = normalizeQuestionPayload(questionForm, assignmentId);
    if (payload.type !== 'TRUE_FALSE' && payload.options.length < 2) {
      toast.error('Add at least two answer options');
      return;
    }
    if (payload.options.length && !payload.options.some((option) => option.isCorrect)) {
      toast.error('Mark at least one correct option');
      return;
    }

    setSaving(true);
    try {
      if (editQuestion) {
        await questionApi.update(editQuestion.id, payload);
        toast.success('Question updated');
      } else {
        await assignmentApi.addQuestion(assignmentId, payload);
        toast.success('Question created');
      }
      setShowQuestionModal(false);
      loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save question'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!deleteQuestion) return;
    try {
      await questionApi.delete(deleteQuestion.id);
      toast.success('Question deleted');
      setDeleteQuestion(null);
      loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete question'));
    }
  };

  if (loading) return <LoadingSpinner text="Loading assignment..." />;
  if (!assignment) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <PageHeader
        title={assignment.title}
        description={`Course ID: ${courseId}`}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/courses/${courseId}`)} title="Back">
              <ArrowLeft size={18} />
            </Button>
            <Button variant="secondary" onClick={() => navigate(`${basePath}/courses/${courseId}/submissions/${assignmentId}`)}>
              <Eye size={15} /> Submissions
            </Button>
            <Button variant="secondary" onClick={openEditAssignment}>
              <Edit size={15} /> Edit
            </Button>
            <Button variant="danger" onClick={() => setShowAssignmentConfirm(true)}>
              <Trash2 size={15} /> Delete
            </Button>
          </div>
        )}
      />

      <Card className="p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={assignment.type} size="sm" />
          {assignment.allowLate && <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Late allowed</span>}
          {assignment.shuffleQuestions && <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">Shuffle questions</span>}
          {assignment.shuffleOptions && <span className="rounded-md bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700">Shuffle options</span>}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-700">
            {assignment.description || 'No assignment description.'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-neutral-200 p-3">
            <p className="text-xs font-medium text-neutral-400">Max Score</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-semibold"><Star size={13} /> {assignment.maxScore ?? '-'}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 p-3">
            <p className="text-xs font-medium text-neutral-400">Weight</p>
            <p className="mt-1 text-sm font-semibold">{assignment.weight ?? '-'}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 p-3">
            <p className="text-xs font-medium text-neutral-400">Due Date</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-semibold"><Calendar size={13} /> {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString('vi-VN') : '-'}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 p-3">
            <p className="text-xs font-medium text-neutral-400">Time Limit</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-semibold"><Clock size={13} /> {assignment.timeLimitMins > 0 ? `${assignment.timeLimitMins} min` : '-'}</p>
          </div>
        </div>
      </Card>

      {assignment.type === 'QUIZ' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Questions</h2>
              <p className="text-sm text-neutral-500">{questions.length} questions in this quiz</p>
            </div>
            <Button onClick={openCreateQuestion}>
              <Plus size={15} /> New Question
            </Button>
          </div>

          {sortedQuestions.length === 0 ? (
            <EmptyState icon={Plus} title="No questions yet" description="Add the first question for this quiz" />
          ) : (
            <div className="space-y-3">
              {sortedQuestions.map((question) => (
                <Card key={question.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-sm font-semibold text-primary-500">
                      {question.orderIndex}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                        <span>{question.type}</span>
                        <span>Score: {question.score ?? '-'}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm font-medium text-neutral-800">{question.content}</p>
                      {question.options?.length > 0 && (
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {question.options
                            .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                            .map((option) => (
                              <div key={option.id || option.orderIndex} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                                {option.isCorrect ? <Check size={14} className="text-emerald-600" /> : <X size={14} className="text-neutral-300" />}
                                <span className={option.isCorrect ? 'font-medium text-neutral-900' : 'text-neutral-600'}>{option.content}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => openEditQuestion(question)} className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50" title="Edit question">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => setDeleteQuestion(question)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50" title="Delete question">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      <AssignmentFormModal
        isOpen={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        onSave={handleSaveAssignment}
        assignment={assignment}
        form={assignmentForm}
        onChange={setAssignmentForm}
      />

      <Modal isOpen={showQuestionModal} onClose={() => setShowQuestionModal(false)} title={editQuestion ? 'Edit Question' : 'New Question'} size="lg">
        <div className="space-y-4">
          <Textarea label="Question" rows={4} value={questionForm.content} onChange={(event) => setQuestionForm({ ...questionForm, content: event.target.value })} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Dropdown label="Type" value={questionForm.type} options={questionTypes} onChange={(type) => setQuestionForm({ ...questionForm, type })} />
            <Input label="Score" type="number" min="0" step="0.5" value={questionForm.score} onChange={(event) => setQuestionForm({ ...questionForm, score: event.target.value })} />
            <Input label="Order" type="number" min="1" value={questionForm.orderIndex} onChange={(event) => setQuestionForm({ ...questionForm, orderIndex: event.target.value })} />
          </div>

          <div className="space-y-3 rounded-xl border border-neutral-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900">Options</h3>
              <Button variant="secondary" size="sm" onClick={addQuestionOption}>
                <Plus size={13} /> Add Option
              </Button>
            </div>
            {questionForm.options.map((option, index) => (
              <div key={index} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                <input value={option.content} onChange={(event) => setQuestionOption(index, { content: event.target.value })} placeholder={`Option ${index + 1}`} />
                <label className="flex items-center gap-1 text-xs font-medium text-neutral-600">
                  <input type="checkbox" checked={option.isCorrect} onChange={(event) => setQuestionOption(index, { isCorrect: event.target.checked })} className="!w-auto" />
                  Correct
                </label>
                <button onClick={() => removeQuestionOption(index)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50" title="Remove option">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 border-t border-neutral-200 pt-3">
            <Button variant="secondary" onClick={() => setShowQuestionModal(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSaveQuestion} disabled={saving}>
              <Save size={15} /> {saving ? 'Saving...' : 'Save Question'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showAssignmentConfirm}
        onClose={() => setShowAssignmentConfirm(false)}
        onConfirm={handleDeleteAssignment}
        title="Delete Assignment"
        message="This will permanently delete this assignment and its submissions. Are you sure?"
      />
      <ConfirmDialog
        isOpen={Boolean(deleteQuestion)}
        onClose={() => setDeleteQuestion(null)}
        onConfirm={handleDeleteQuestion}
        title="Delete Question"
        message="This will permanently delete this question. Are you sure?"
      />
    </div>
  );
}
