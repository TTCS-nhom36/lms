import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assignmentApi } from '../../api/assignmentApi';
import { quizAttemptApi } from '../../api/quizAttemptApi';
import { submissionApi } from '../../api/submissionApi';
import AssignmentInfoCard from '../../components/assignment/AssignmentInfoCard';
import FileLinkSubmissionPanel from '../../components/assignment/FileLinkSubmissionPanel';
import QuizAttemptResultModal from '../../components/assignment/QuizAttemptResultModal';
import QuizMode from '../../components/assignment/QuizMode';
import QuizReview from '../../components/assignment/QuizReview';
import SubmissionSummaryCard from '../../components/assignment/SubmissionSummaryCard';
import SubmitAssignmentModal from '../../components/assignment/SubmitAssignmentModal';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getApiErrorMessage } from '../../utils/apiError';
import { ArrowLeft } from 'lucide-react';

export default function AssignmentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [assignment, setAssignment] = useState(null);
  const [mySubmission, setMySubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitForm, setSubmitForm] = useState({ fileUrl: '', linkUrl: '' });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedS3Key, setUploadedS3Key] = useState('');
  const [submissionFileUrl, setSubmissionFileUrl] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResultModal, setShowResultModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState(false);
  const [latestAttemptResult, setLatestAttemptResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const autoSubmitCalledRef = useRef(false);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const assignmentRes = await assignmentApi.getById(id);
      const assignmentData = assignmentRes.data;
      setAssignment(assignmentData);

      let submissionData = null;
      let quizAttemptResult = null;

      try {
        const submissionRes = await assignmentApi.getMySubmission(id);
        setMySubmission(submissionRes.data);
        submissionData = submissionRes.data;
        if (submissionRes.data?.id && submissionRes.data?.fileUrl) {
          try {
            const urlRes = await submissionApi.getFileUrl(submissionRes.data.id);
            setSubmissionFileUrl(urlRes.data.url);
          } catch {
            setSubmissionFileUrl(null);
          }
        }
      } catch {
        setMySubmission(null);
      }

      if (assignmentData.type === 'QUIZ') {
        try {
          const attemptRes = await quizAttemptApi.getMyAttempt(id);
          setQuizResult(attemptRes.data);
          quizAttemptResult = attemptRes.data;
        } catch {
          setQuizResult(null);
        }

        if (quizAttemptResult || submissionData) {
          try {
            const questionRes = await assignmentApi.getQuestions(id);
            setQuestions(questionRes.data || []);
          } catch {
            setQuestions([]);
          }
        }
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load assignment'));
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const startTimer = useCallback((timeLimitMins) => {
    if (!timeLimitMins || timeLimitMins <= 0) return;
    autoSubmitCalledRef.current = false;
    setTimeLeft(timeLimitMins * 60);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleStartQuiz = async () => {
    if (quizResult || mySubmission) {
      toast.error('You can only take this quiz once.');
      return;
    }
    const assignmentId = Number(id);
    if (!assignmentId || !user?.id) {
      toast.error('Invalid session. Please refresh the page.');
      return;
    }
    setSubmitting(true);
    try {
      await quizAttemptApi.createAttempt({ assignmentId, userId: user.id });
      const questionRes = await assignmentApi.getQuestions(id);
      setQuestions(questionRes.data || []);
      setSelectedAnswers({});
      setQuizResult(null);
      setQuizStarted(true);
      if (assignment?.timeLimitMins > 0) startTimer(assignment.timeLimitMins);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAnswer = (questionId, optionId, isMultiple) => {
    setSelectedAnswers((prev) => {
      const current = prev[questionId] || [];
      if (isMultiple) {
        if (current.includes(optionId)) return { ...prev, [questionId]: current.filter((item) => item !== optionId) };
        return { ...prev, [questionId]: [...current, optionId] };
      }
      return { ...prev, [questionId]: [optionId] };
    });
  };

  const handleSubmitQuiz = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const answers = [];
      Object.entries(selectedAnswers).forEach(([questionId, optionIds]) => {
        optionIds.forEach((optionId) => {
          answers.push({ questionId: Number(questionId), selectedAnswerId: optionId });
        });
      });

      const res = await quizAttemptApi.submitQuiz({ quizId: Number(id), studentId: user.id, answers });
      await assignmentApi.submit(id, { autoScore: res.data.totalScore });
      setQuizResult(res.data);
      setLatestAttemptResult(res.data);
      setShowResultModal(true);
      setQuizStarted(false);
      setTimeLeft(null);
      loadData();
    } catch (error) {
      console.error('Submit quiz error:', error);
      toast.error(getApiErrorMessage(error, 'Failed to submit quiz'));
    } finally {
      setSubmitting(false);
    }
  }, [id, loadData, selectedAnswers, toast, user?.id]);

  useEffect(() => {
    if (timeLeft === 0 && quizStarted && !autoSubmitCalledRef.current) {
      autoSubmitCalledRef.current = true;
      toast.error('Time is up! Auto-submitting your quiz...');
      handleSubmitQuiz();
    }
  }, [handleSubmitQuiz, timeLeft, quizStarted, toast]);

  const handleSubmitFileLink = async () => {
    if (assignment.type === 'FILE_UPLOAD' && !uploadedS3Key && !mySubmission?.fileUrl) {
      toast.error('Please choose a file before submitting');
      return;
    }
    setSubmitting(true);
    try {
      const payload = assignment.type === 'FILE_UPLOAD' ? { fileUrl: uploadedS3Key || mySubmission?.fileUrl } : submitForm;
      await assignmentApi.submit(id, payload);
      toast.success(editingSubmission ? 'Submission updated' : 'Submission sent successfully');
      setShowSubmitModal(false);
      setEditingSubmission(false);
      setUploadedS3Key('');
      setUploadedFileName('');
      loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Submission failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const openSubmit = () => {
    setEditingSubmission(false);
    setSubmitForm({ fileUrl: '', linkUrl: '' });
    setUploadedS3Key('');
    setUploadedFileName('');
    setShowSubmitModal(true);
  };

  const openEditSubmission = () => {
    setEditingSubmission(true);
    setSubmitForm({ fileUrl: mySubmission?.fileUrl || '', linkUrl: mySubmission?.linkUrl || '' });
    setUploadedS3Key('');
    setUploadedFileName('');
    setShowReviewModal(false);
    setShowSubmitModal(true);
  };

  const handleDeleteSubmission = async () => {
    try {
      await assignmentApi.deleteMySubmission(id);
      toast.success('Submission deleted');
      setShowDeleteConfirm(false);
      setShowReviewModal(false);
      setMySubmission(null);
      setSubmissionFileUrl(null);
      loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete submission'));
    }
  };

  const handleFileSelect = async (file) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File khong duoc vuot qua 50 MB');
      return;
    }
    setUploadingFile(true);
    try {
      const res = await submissionApi.uploadFile(file);
      setUploadedS3Key(res.data.s3Key);
      setUploadedFileName(file.name);
      toast.success('File uploaded successfully');
    } catch {
      toast.error('File upload failed');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null) return '';
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const rest = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${rest}`;
  };

  const getTimerColor = () => {
    if (timeLeft === null) return '';
    if (timeLeft <= 60) return 'text-rose-500 animate-pulse';
    if (timeLeft <= 180) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const getScorePercentFromResult = (result) => {
    const maxScore = Number(result?.maxScore ?? assignment?.maxScore ?? 0);
    const totalScore = Number(result?.totalScore ?? 0);
    if (!maxScore) return 0;
    return (totalScore / maxScore) * 100;
  };

  if (loading) return <LoadingSpinner text="Loading assignment..." />;
  if (!assignment) return null;

  const isPastDue = assignment.dueDate && new Date(assignment.dueDate) < new Date();
  const answeredCount = Object.keys(selectedAnswers).filter((key) => selectedAnswers[key]?.length > 0).length;

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate(-1)} className="!px-0 text-neutral-500 hover:text-neutral-900 hover:bg-transparent">
          <ArrowLeft size={18} /> Back
        </Button>
      </div>

      <AssignmentInfoCard assignment={assignment} isPastDue={isPastDue} />

      {assignment.type === 'QUIZ' ? (
        <QuizMode
          assignment={assignment}
          quizResult={quizResult}
          quizStarted={quizStarted}
          mySubmission={mySubmission}
          latestAttemptResult={latestAttemptResult}
          questions={questions}
          selectedAnswers={selectedAnswers}
          answeredCount={answeredCount}
          timeLeft={timeLeft}
          timerColor={getTimerColor()}
          formattedTime={formatTime(timeLeft)}
          submitting={submitting}
          isPastDue={isPastDue}
          onReview={() => setShowReviewModal(true)}
          onStart={handleStartQuiz}
          onToggleAnswer={handleToggleAnswer}
          onSubmit={handleSubmitQuiz}
        />
      ) : (
        <FileLinkSubmissionPanel
          submission={mySubmission}
          submissionFileUrl={submissionFileUrl}
          isPastDue={isPastDue}
          onSubmit={openSubmit}
          onEdit={openEditSubmission}
          onReview={() => setShowReviewModal(true)}
          onDelete={() => setShowDeleteConfirm(true)}
        />
      )}

      <SubmitAssignmentModal
        isOpen={showSubmitModal}
        onClose={() => { setShowSubmitModal(false); setEditingSubmission(false); }}
        assignment={assignment}
        submitForm={submitForm}
        onSubmitFormChange={setSubmitForm}
        submitting={submitting}
        uploadingFile={uploadingFile}
        uploadedFileName={uploadedFileName}
        uploadedS3Key={uploadedS3Key}
        fileInputRef={fileInputRef}
        onFileSelect={handleFileSelect}
        onClearFile={() => { setUploadedS3Key(''); setUploadedFileName(''); }}
        onSubmit={handleSubmitFileLink}
        isEditing={editingSubmission}
      />

      <QuizAttemptResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        result={latestAttemptResult}
        assignment={assignment}
        questions={questions}
        scorePercent={getScorePercentFromResult(latestAttemptResult)}
      />

      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={assignment.type === 'QUIZ' ? 'Review Quiz' : 'Review Submission'}
        size="lg"
      >
        {assignment.type === 'QUIZ' ? (
          <QuizReview questions={questions} attemptResult={latestAttemptResult || quizResult} />
        ) : mySubmission ? (
          <div className="space-y-4">
            <SubmissionSummaryCard submission={mySubmission} submissionFileUrl={submissionFileUrl} />
            <div className="flex justify-end gap-2 border-t border-neutral-200 pt-3">
              <Button variant="secondary" onClick={openEditSubmission} disabled={isPastDue}>Edit</Button>
              <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} disabled={isPastDue}>Delete</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">No submission yet.</p>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteSubmission}
        title="Delete Submission"
        message="This will remove your current submission. You can submit again before the due date."
      />
    </div>
  );
}
