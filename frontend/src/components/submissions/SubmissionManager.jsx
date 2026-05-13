import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Edit,
  Eye,
  FileText,
  Link as LinkIcon,
  Loader2,
  MessageSquare,
  Plus,
  Save,
  Star,
  Trash2,
} from 'lucide-react';
import { assignmentApi } from '../../api/assignmentApi';
import { courseApi } from '../../api/courseApi';
import { quizAttemptApi } from '../../api/quizAttemptApi';
import { submissionApi } from '../../api/submissionApi';
import QuizReview from '../assignment/QuizReview';
import SubmissionSummaryCard from '../assignment/SubmissionSummaryCard';
import { useToast } from '../../hooks/useToast';
import { getApiErrorMessage } from '../../utils/apiError';
import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';
import EmptyState from '../ui/EmptyState';
import LoadingSpinner from '../ui/LoadingSpinner';
import Modal from '../ui/Modal';
import PageHeader from '../ui/PageHeader';

const emptySubmissionForm = {
  userId: '',
  isLate: false,
  fileUrl: '',
  linkUrl: '',
  autoScore: '',
  manualScore: '',
  finalScore: '',
  feedback: '',
};

const numberOrNull = (value) => (value === '' || value === null || value === undefined ? null : Number(value));

export default function SubmissionManager() {
  const { courseId, assignmentId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [assignment, setAssignment] = useState(null);
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [gradeTarget, setGradeTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewQuestions, setReviewQuestions] = useState([]);
  const [reviewAttempt, setReviewAttempt] = useState(null);
  const [reviewFileUrl, setReviewFileUrl] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [gradeForm, setGradeForm] = useState({ manualScore: '', finalScore: '', feedback: '' });
  const [submissionForm, setSubmissionForm] = useState(emptySubmissionForm);
  const [downloadingId, setDownloadingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const studentById = useMemo(
    () => new Map(students.map((student) => [String(student.id), student])),
    [students],
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [assignmentRes, submissionsRes, studentsRes] = await Promise.all([
        assignmentApi.getById(assignmentId),
        assignmentApi.getSubmissions(assignmentId),
        courseId ? courseApi.getStudents(courseId) : Promise.resolve({ data: [] }),
      ]);
      setAssignment(assignmentRes.data);
      setSubmissions(submissionsRes.data || []);
      setStudents(studentsRes.data || []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  }, [assignmentId, courseId, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => {
    setEditTarget(null);
    setSubmissionForm({
      ...emptySubmissionForm,
      userId: students[0]?.id || '',
    });
    setShowFormModal(true);
  };

  const openEdit = (submission) => {
    setEditTarget(submission);
    setSubmissionForm({
      userId: submission.userId || '',
      isLate: Boolean(submission.isLate),
      fileUrl: submission.fileUrl || '',
      linkUrl: submission.linkUrl || '',
      autoScore: submission.autoScore ?? '',
      manualScore: submission.manualScore ?? '',
      finalScore: submission.finalScore ?? '',
      feedback: submission.feedback || '',
    });
    setShowFormModal(true);
  };

  const openGrade = (submission) => {
    setGradeTarget(submission);
    setGradeForm({
      manualScore: submission.manualScore ?? '',
      finalScore: submission.finalScore ?? submission.manualScore ?? submission.autoScore ?? '',
      feedback: submission.feedback || '',
    });
    setShowGradeModal(true);
  };

  const openReview = async (submission) => {
    setReviewTarget(submission);
    setReviewAttempt(null);
    setReviewQuestions([]);
    setReviewFileUrl(null);
    setShowReviewModal(true);

    if (assignment?.type === 'QUIZ') {
      if (!submission.quizAttemptId) {
        toast.error('Quiz attempt not found for this submission');
        return;
      }
      setReviewLoading(true);
      try {
        const [questionsRes, attemptRes] = await Promise.all([
          assignmentApi.getQuestions(assignmentId),
          quizAttemptApi.getAttemptResult(submission.quizAttemptId),
        ]);
        setReviewQuestions(questionsRes.data || []);
        setReviewAttempt(attemptRes.data);
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Failed to load quiz review'));
      } finally {
        setReviewLoading(false);
      }
      return;
    }

    if (submission.fileUrl) {
      setReviewLoading(true);
      try {
        const fileRes = await submissionApi.getFileUrl(submission.id);
        setReviewFileUrl(fileRes.data.url);
      } catch {
        setReviewFileUrl(null);
      } finally {
        setReviewLoading(false);
      }
    }
  };

  const validateScore = (value, label) => {
    const parsed = numberOrNull(value);
    if (parsed === null) return true;
    if (Number.isNaN(parsed) || parsed < 0 || parsed > Number(assignment?.maxScore ?? Infinity)) {
      toast.error(`${label} must be between 0 and ${assignment?.maxScore ?? 'max score'}`);
      return false;
    }
    return true;
  };

  const handleSaveSubmission = async () => {
    if (!submissionForm.userId) {
      toast.error('Select a student for this submission');
      return;
    }
    if (!validateScore(submissionForm.autoScore, 'Auto score')) return;
    if (!validateScore(submissionForm.manualScore, 'Manual score')) return;
    if (!validateScore(submissionForm.finalScore, 'Final score')) return;

    setSaving(true);
    try {
      const payload = {
        assignmentId: Number(assignmentId),
        userId: submissionForm.userId,
        isLate: submissionForm.isLate,
        fileUrl: submissionForm.fileUrl.trim() || null,
        linkUrl: submissionForm.linkUrl.trim() || null,
        autoScore: numberOrNull(submissionForm.autoScore),
        manualScore: numberOrNull(submissionForm.manualScore),
        finalScore: numberOrNull(submissionForm.finalScore),
        feedback: submissionForm.feedback.trim() || null,
      };
      if (editTarget) {
        await submissionApi.update(editTarget.id, payload);
        toast.success('Submission updated');
      } else {
        await submissionApi.create(payload);
        toast.success('Submission created');
      }
      setShowFormModal(false);
      loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save submission'));
    } finally {
      setSaving(false);
    }
  };

  const handleGrade = async () => {
    if (!validateScore(gradeForm.manualScore, 'Manual score')) return;
    if (!validateScore(gradeForm.finalScore, 'Final score')) return;
    setSaving(true);
    try {
      await submissionApi.grade(gradeTarget.id, {
        manualScore: numberOrNull(gradeForm.manualScore),
        finalScore: numberOrNull(gradeForm.finalScore),
        feedback: gradeForm.feedback,
      });
      toast.success('Final score saved');
      setShowGradeModal(false);
      loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to grade'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await submissionApi.delete(deleteTarget.id);
      toast.success('Submission deleted');
      setShowConfirm(false);
      setDeleteTarget(null);
      loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete submission'));
    }
  };

  const handleDownloadFile = async (submissionId) => {
    setDownloadingId(submissionId);
    try {
      const res = await submissionApi.getFileUrl(submissionId);
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Cannot download file'));
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) return <LoadingSpinner text="Loading submissions..." />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-all cursor-pointer" title="Back">
          <ArrowLeft size={20} />
        </button>
        <PageHeader
          title={`${assignment?.title || 'Assignment'} - Submissions`}
          description={`${submissions.length} submissions - Max score: ${assignment?.maxScore ?? '-'}`}
          className="flex-1"
          actions={(
            <Button onClick={openCreate}>
              <Plus size={15} /> New Submission
            </Button>
          )}
        />
      </div>

      {submissions.length === 0 ? (
        <EmptyState icon={FileText} title="No submissions yet" description="Create a submission or wait for students to submit their work" />
      ) : (
        <div className="apple-table-card overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Submitted At</th>
                <th>File/Link</th>
                <th>Late</th>
                <th>Auto</th>
                <th>Manual</th>
                <th>Final Score</th>
                <th>Feedback</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => {
                const student = studentById.get(String(submission.userId));
                return (
                  <tr key={submission.id}>
                    <td className="text-neutral-800 font-medium text-sm">
                      <div>{student?.fullName || submission.userId?.substring(0, 8) || '-'}</div>
                      {student?.email && <div className="text-xs font-normal text-neutral-400">{student.email}</div>}
                    </td>
                    <td className="text-xs">{submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : '-'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        {submission.fileUrl && (
                          <button
                            onClick={() => handleDownloadFile(submission.id)}
                            disabled={downloadingId === submission.id}
                            className="p-1 rounded text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50"
                            title="Download file"
                          >
                            {downloadingId === submission.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                          </button>
                        )}
                        {submission.linkUrl && <a href={submission.linkUrl} target="_blank" rel="noreferrer" className="text-cyan-600 hover:text-cyan-700" title="Open link"><LinkIcon size={14} /></a>}
                        {!submission.fileUrl && !submission.linkUrl && <span className="text-neutral-300">-</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`text-xs font-semibold ${submission.isLate ? 'text-rose-500' : 'text-emerald-600'}`}>
                        {submission.isLate ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="text-neutral-700">{submission.autoScore ?? '-'}</td>
                    <td className="text-neutral-700">{submission.manualScore ?? '-'}</td>
                    <td className="font-semibold text-neutral-900">{submission.finalScore ?? '-'}</td>
                    <td className="max-w-[220px] truncate text-neutral-500">{submission.feedback || '-'}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openReview(submission)} className="p-1.5 rounded-md text-gray-400 hover:text-cyan-600 hover:bg-cyan-50" title="Review submission">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => openGrade(submission)} className="p-1.5 rounded-md text-gray-400 hover:text-primary-500 hover:bg-blue-50" title="Grade final score">
                          <Star size={14} />
                        </button>
                        <button onClick={() => openEdit(submission)} className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50" title="Edit submission">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => { setDeleteTarget(submission); setShowConfirm(true); }} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50" title="Delete submission">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={editTarget ? 'Edit Submission' : 'New Submission'} size="lg">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-neutral-500 mb-1.5 block">Student</label>
            {students.length > 0 ? (
              <select value={submissionForm.userId} onChange={(event) => setSubmissionForm({ ...submissionForm, userId: event.target.value })}>
                <option value="">Select student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>{student.fullName || student.email || student.id}</option>
                ))}
              </select>
            ) : (
              <input value={submissionForm.userId} onChange={(event) => setSubmissionForm({ ...submissionForm, userId: event.target.value })} placeholder="Student UUID" />
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-1.5 block">File S3 Key</label>
            <input value={submissionForm.fileUrl} onChange={(event) => setSubmissionForm({ ...submissionForm, fileUrl: event.target.value })} placeholder="submissions/..." />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-1.5 block">Link URL</label>
            <input type="url" value={submissionForm.linkUrl} onChange={(event) => setSubmissionForm({ ...submissionForm, linkUrl: event.target.value })} placeholder="https://..." />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-1.5 block">Auto Score</label>
            <input type="number" value={submissionForm.autoScore} onChange={(event) => setSubmissionForm({ ...submissionForm, autoScore: event.target.value })} step="0.5" min="0" max={assignment?.maxScore} />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-1.5 block">Manual Score</label>
            <input type="number" value={submissionForm.manualScore} onChange={(event) => setSubmissionForm({ ...submissionForm, manualScore: event.target.value })} step="0.5" min="0" max={assignment?.maxScore} />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-1.5 block">Final Score</label>
            <input type="number" value={submissionForm.finalScore} onChange={(event) => setSubmissionForm({ ...submissionForm, finalScore: event.target.value })} step="0.5" min="0" max={assignment?.maxScore} />
          </div>
          <label className="mt-7 flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input type="checkbox" checked={submissionForm.isLate} onChange={(event) => setSubmissionForm({ ...submissionForm, isLate: event.target.checked })} className="!w-auto" />
            Late submission
          </label>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-neutral-500 mb-1.5 block">
              <MessageSquare size={14} className="inline mr-1" />
              Feedback
            </label>
            <textarea rows={4} value={submissionForm.feedback} onChange={(event) => setSubmissionForm({ ...submissionForm, feedback: event.target.value })} placeholder="Feedback for the student..." />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 pt-3 border-t border-neutral-200">
            <Button variant="secondary" onClick={() => setShowFormModal(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSaveSubmission} disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Submission'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showGradeModal} onClose={() => setShowGradeModal(false)} title="Grade Final Score" size="md">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-1.5 block">Manual Score (out of {assignment?.maxScore})</label>
            <input type="number" value={gradeForm.manualScore} onChange={(e) => setGradeForm({ ...gradeForm, manualScore: e.target.value })} step="0.5" min="0" max={assignment?.maxScore} />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-1.5 block">Final Score (out of {assignment?.maxScore})</label>
            <input type="number" value={gradeForm.finalScore} onChange={(e) => setGradeForm({ ...gradeForm, finalScore: e.target.value })} step="0.5" min="0" max={assignment?.maxScore} />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-1.5 block">
              <MessageSquare size={14} className="inline mr-1" />
              Feedback
            </label>
            <textarea rows={4} value={gradeForm.feedback} onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })} placeholder="Write feedback for the student..." />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
            <Button variant="secondary" onClick={() => setShowGradeModal(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleGrade} disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Grade'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)} title="Review Submission" size="lg">
        {reviewLoading ? (
          <LoadingSpinner text="Loading review..." />
        ) : assignment?.type === 'QUIZ' ? (
          <div className="space-y-4">
            {reviewAttempt && (
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 md:grid-cols-4">
                <div>
                  <p className="text-xs text-neutral-400">Score</p>
                  <p className="text-sm font-semibold text-neutral-900">{reviewAttempt.totalScore} / {reviewAttempt.maxScore}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Correct</p>
                  <p className="text-sm font-semibold text-neutral-900">{reviewAttempt.correctAnswers} / {reviewAttempt.totalQuestions}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Percent</p>
                  <p className="text-sm font-semibold text-neutral-900">{Number(reviewAttempt.scorePercentage || 0).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Submitted</p>
                  <p className="text-sm font-semibold text-neutral-900">{reviewAttempt.submittedAt ? new Date(reviewAttempt.submittedAt).toLocaleString() : '-'}</p>
                </div>
              </div>
            )}
            <QuizReview questions={reviewQuestions} attemptResult={reviewAttempt} />
            {!reviewAttempt && <p className="text-sm text-neutral-500">No quiz review data available.</p>}
          </div>
        ) : reviewTarget ? (
          <SubmissionSummaryCard submission={reviewTarget} submissionFileUrl={reviewFileUrl} />
        ) : (
          <p className="text-sm text-neutral-500">No submission selected.</p>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Submission"
        message="This will permanently delete this submission. Are you sure?"
      />
    </div>
  );
}
