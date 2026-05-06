import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assignmentApi } from '../../api/assignmentApi';
import { submissionApi } from '../../api/submissionApi';
import { quizAttemptApi } from '../../api/quizAttemptApi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import {
  ArrowLeft, ClipboardList, Upload, Link as LinkIcon,
  Calendar, Clock, CheckCircle, Send, PlayCircle,
  RefreshCw, AlertTriangle, Timer, Download, X, FileText, Loader2
} from 'lucide-react';

export default function AssignmentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [assignment, setAssignment] = useState(null);
  const [mySubmission, setMySubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  // File/Link Submit
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitForm, setSubmitForm] = useState({ fileUrl: '', linkUrl: '' });
  const [submitting, setSubmitting] = useState(false);
  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedS3Key, setUploadedS3Key] = useState('');
  const fileInputRef = useRef(null);
  // Submission file download URL
  const [submissionFileUrl, setSubmissionFileUrl] = useState(null);

  // Quiz State
  const [quizResult, setQuizResult] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showRetryConfirm, setShowRetryConfirm] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [latestAttemptResult, setLatestAttemptResult] = useState(null);

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState(null); // seconds
  const timerRef = useRef(null);
  const autoSubmitCalledRef = useRef(false);

  useEffect(() => { loadData(); }, [id]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const loadData = async () => {
    try {
      const aRes = await assignmentApi.getById(id);
      const assignmentData = aRes.data;
      setAssignment(assignmentData);

      // Luôn cố gắng tải submission của user (áp dụng cho cả Quiz và các loại khác)
      try {
        const sRes = await assignmentApi.getMySubmission(id);
        setMySubmission(sRes.data);
        // Fetch download URL if a file was submitted
        if (sRes.data?.id && sRes.data?.fileUrl) {
          try {
            const urlRes = await submissionApi.getFileUrl(sRes.data.id);
            setSubmissionFileUrl(urlRes.data.url);
          } catch { /* file might not exist yet */ }
        }
      } catch {
        setMySubmission(null);
      }

      if (assignmentData.type === 'QUIZ') {
        try {
          const attemptRes = await quizAttemptApi.getMyAttempt(id);
          setQuizResult(attemptRes.data);
        } catch {
          setQuizResult(null);
        }
      }
    } catch {
      toast.error('Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  const startTimer = useCallback((timeLimitMins) => {
    if (!timeLimitMins || timeLimitMins <= 0) return;
    autoSubmitCalledRef.current = false;
    const seconds = timeLimitMins * 60;
    setTimeLeft(seconds);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0 && quizStarted && !autoSubmitCalledRef.current) {
      autoSubmitCalledRef.current = true;
      toast.error('⏰ Time is up! Auto-submitting your quiz...');
      handleSubmitQuiz(true);
    }
  }, [timeLeft, quizStarted]);

  const handleStartQuiz = async (isRetry = false) => {
    const assignmentId = Number(id);
    if (!assignmentId || !user?.id) {
      toast.error('Invalid session. Please refresh the page.');
      return;
    }
    setSubmitting(true);
    try {
      await quizAttemptApi.createAttempt({ assignmentId, userId: user.id });
      const qRes = await assignmentApi.getQuestions(id);
      setQuestions(qRes.data || []);
      setSelectedAnswers({});
      setQuizResult(null);
      setQuizStarted(true);
      setShowRetryConfirm(false);
      if (assignment?.timeLimitMins > 0) {
        startTimer(assignment.timeLimitMins);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAnswer = (questionId, optionId, isMultiple) => {
    setSelectedAnswers(prev => {
      const current = prev[questionId] || [];
      if (isMultiple) {
        if (current.includes(optionId)) return { ...prev, [questionId]: current.filter(id => id !== optionId) };
        return { ...prev, [questionId]: [...current, optionId] };
      }
      return { ...prev, [questionId]: [optionId] };
    });
  };

  const handleSubmitQuiz = async (isAutoSubmit = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const answersList = [];
      Object.entries(selectedAnswers).forEach(([qId, optionIds]) => {
        optionIds.forEach(optId => {
          answersList.push({ questionId: Number(qId), selectedAnswerId: optId });
        });
      });

      const res = await quizAttemptApi.submitQuiz({
        quizId: Number(id),
        studentId: user.id,
        answers: answersList
      });

      // Save quiz score to submission
      await assignmentApi.submit(id, { autoScore: res.data.scorePercentage });

      if (!isAutoSubmit) toast.success('Quiz submitted successfully! 🎉');
      setQuizResult(res.data);
      setLatestAttemptResult(res.data);
      setShowResultModal(true);
      setQuizStarted(false);
      setTimeLeft(null);
      loadData(); // Tải lại data để lấy best score từ bảng submission
    } catch (error) {
      console.error('Submit quiz error:', error);
      toast.error('Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFileLink = async () => {
    // For FILE_UPLOAD, require a file to have been uploaded
    if (assignment.type === 'FILE_UPLOAD' && !uploadedS3Key) {
      toast.error('Vui lòng chọn file để nộp');
      return;
    }
    setSubmitting(true);
    try {
      const payload = assignment.type === 'FILE_UPLOAD'
        ? { fileUrl: uploadedS3Key }
        : submitForm;
      await assignmentApi.submit(id, payload);
      toast.success('Nộp bài thành công! 🎉');
      setShowSubmitModal(false);
      setUploadedS3Key('');
      setUploadedFileName('');
      loadData();
    } catch {
      toast.error('Nộp bài thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSelect = async (file) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast.error('File không được vượt quá 50 MB'); return; }
    setUploadingFile(true);
    try {
      const res = await submissionApi.uploadFile(file);
      setUploadedS3Key(res.data.s3Key);
      setUploadedFileName(file.name);
      toast.success('Tải file thành công');
    } catch { toast.error('Tải file thất bại'); }
    finally { setUploadingFile(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const formatTime = (seconds) => {
    if (seconds === null) return '';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getTimerColor = () => {
    if (timeLeft === null) return '';
    if (timeLeft <= 60) return 'text-rose-500 animate-pulse';
    if (timeLeft <= 180) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const answeredCount = Object.keys(selectedAnswers).filter(k => selectedAnswers[k]?.length > 0).length;

  if (loading) return <LoadingSpinner text="Loading assignment..." />;
  if (!assignment) return null;

  const isPastDue = assignment.dueDate && new Date(assignment.dueDate) < new Date();

  const renderQuizMode = () => {
    // Show result
    if (quizResult && !quizStarted) {
      // Lấy điểm cao nhất từ bảng submission (ưu tiên finalScore, sau đó autoScore)
      const bestScore = mySubmission ? Number(mySubmission.finalScore ?? mySubmission.autoScore ?? 0) : (quizResult.scorePercentage ?? 0);
      const passed = bestScore >= 60;
      return (
        <div className="space-y-4">
          <div className={`glass-card p-6 border-2 ${passed ? 'border-emerald-500/20' : 'border-rose-400/20'}`}>
            <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <CheckCircle size={18} className={passed ? 'text-emerald-500' : 'text-rose-400'} />
              Quiz Result
            </h3>
            <div className="grid grid-cols-1 gap-4 bg-neutral-50 p-4 rounded-xl mb-4">
              <div>
                <span className="text-xs text-neutral-400 block mb-1">Best Score</span>
                <span className={`text-3xl font-bold ${passed ? 'text-emerald-500' : 'text-rose-400'}`}>
                  {bestScore.toFixed(1)}%
                </span>
              </div>
              <div className="text-sm text-neutral-500 mt-2">
                Submitted at: {new Date(quizResult.submittedAt).toLocaleString()}
              </div>
            </div>
            {/* Retry button */}
            {!isPastDue && (
              <button
                onClick={() => setShowRetryConfirm(true)}
                className="flex items-center gap-2 text-sm font-medium text-primary-500 hover:text-primary-600 border border-primary-200 hover:border-primary-300 px-4 py-2 rounded-lg transition-all"
              >
                <RefreshCw size={14} /> Retry Quiz
              </button>
            )}
          </div>
        </div>
      );
    }

    // Quiz in progress
    if (quizStarted) {
      return (
        <div className="space-y-4">
          {/* Sticky header with timer & progress */}
          <div className="glass-card p-4 flex items-center justify-between sticky top-4 z-10 border border-neutral-200 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-500 font-medium">
                Progress: <span className="text-neutral-900 font-bold">{answeredCount}/{questions.length}</span> answered
              </span>
            </div>
            {timeLeft !== null && (
              <div className={`flex items-center gap-2 font-mono text-xl font-bold ${getTimerColor()}`}>
                <Timer size={18} />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>

          <div className="glass-card p-6 space-y-6">
            <h3 className="text-lg font-semibold text-neutral-900">Quiz Questions</h3>
            <div className="space-y-6">
              {questions.map((q, idx) => {
                const isMultiple = q.type === 'MULTIPLE_CHOICE';
                const selected = selectedAnswers[q.id] || [];
                const isAnswered = selected.length > 0;

                return (
                  <div key={q.id} className={`p-4 rounded-xl border transition-all ${isAnswered ? 'bg-primary-50/40 border-primary-200' : 'bg-neutral-50 border-neutral-100'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <p className="font-medium text-neutral-900">
                        <span className={`mr-2 font-bold ${isAnswered ? 'text-primary-500' : 'text-neutral-400'}`}>{idx + 1}.</span>
                        {q.content}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-xs font-semibold px-2 py-1 bg-neutral-200 text-neutral-600 rounded">{q.score} pts</span>
                        {isMultiple && <span className="text-xs text-violet-500 font-medium border border-violet-200 px-2 py-0.5 rounded">Multi</span>}
                      </div>
                    </div>
                    <div className="space-y-2 mt-3">
                      {q.options?.map(opt => {
                        const isChecked = selected.includes(opt.id);
                        return (
                          <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? 'bg-primary-50 border-primary-300 shadow-sm' : 'bg-white border-neutral-200 hover:border-primary-200 hover:bg-primary-50/30'}`}>
                            <input
                              type={isMultiple ? 'checkbox' : 'radio'}
                              name={`question_${q.id}`}
                              checked={isChecked}
                              onChange={() => handleToggleAnswer(q.id, opt.id, isMultiple)}
                              className="w-4 h-4 accent-primary-500"
                            />
                            <span className={`text-sm ${isChecked ? 'text-primary-900 font-medium' : 'text-neutral-700'}`}>{opt.content}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pt-4 border-t border-neutral-200 flex items-center justify-between">
              <span className="text-sm text-neutral-500">{answeredCount} of {questions.length} answered</span>
              <button
                onClick={() => handleSubmitQuiz(false)}
                disabled={submitting}
                className="btn-primary"
              >
                <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Not started yet
    return (
      <div className="glass-card p-8 text-center">
        <ClipboardList size={48} className="text-neutral-300 mx-auto mb-4" />
        <p className="text-neutral-500 mb-2 text-lg font-medium">Ready to take this quiz?</p>
        {assignment.timeLimitMins > 0 && (
          <p className="text-sm text-amber-500 mb-5 flex items-center justify-center gap-1">
            <Clock size={14} /> Time limit: {assignment.timeLimitMins} minutes — timer starts when you begin
          </p>
        )}
        <button onClick={() => handleStartQuiz(false)} disabled={submitting || isPastDue} className="btn-primary">
          <PlayCircle size={16} /> {submitting ? 'Starting...' : 'Start Quiz'}
        </button>
        {isPastDue && <p className="text-xs text-rose-400 mt-3">This quiz is past due.</p>}
      </div>
    );
  };

  const renderFileLinkMode = () => {
    if (mySubmission) {
      return (
        <div className="glass-card p-6 border-2 border-emerald-500/20">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-500" />
            Your Submission
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-neutral-400 block">Submitted At</span>
                <span className="text-sm text-neutral-800">
                  {mySubmission.submittedAt ? new Date(mySubmission.submittedAt).toLocaleString() : '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-neutral-400 block">Late</span>
                <span className={`text-sm font-semibold ${mySubmission.isLate ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {mySubmission.isLate ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            {mySubmission.fileUrl && (
              <div>
                <span className="text-xs text-neutral-400 block mb-1">File đã nộp</span>
                {submissionFileUrl ? (
                  <a
                    href={submissionFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors font-medium text-sm"
                  >
                    <Download size={15} /> Tải file về
                  </a>
                ) : (
                  <span className="text-sm text-neutral-400">Đang tải liên kết...</span>
                )}
              </div>
            )}
            {mySubmission.linkUrl && (
              <div>
                <span className="text-xs text-neutral-400 block mb-1">Link</span>
                <a href={mySubmission.linkUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1 break-all">
                  <LinkIcon size={14} /> {mySubmission.linkUrl}
                </a>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4 p-4 bg-neutral-50/50 rounded-xl mt-4">
              <div>
                <span className="text-xs text-neutral-400 block">Auto Score</span>
                <span className="text-lg font-bold text-neutral-900">{mySubmission.autoScore ?? '—'}</span>
              </div>
              <div>
                <span className="text-xs text-neutral-400 block">Manual Score</span>
                <span className="text-lg font-bold text-neutral-900">{mySubmission.manualScore ?? '—'}</span>
              </div>
              <div>
                <span className="text-xs text-neutral-400 block">Final Score</span>
                <span className="text-lg font-bold text-primary-400">{mySubmission.finalScore ?? '—'}</span>
              </div>
            </div>
            {mySubmission.feedback && (
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl mt-3">
                <span className="text-xs text-blue-400 font-semibold block mb-1">Instructor Feedback</span>
                <p className="text-sm text-neutral-700">{mySubmission.feedback}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="glass-card p-6 text-center">
        <ClipboardList size={40} className="text-neutral-300 mx-auto mb-3" />
        <p className="text-neutral-500 mb-4">You haven't submitted this assignment yet</p>
        <button onClick={() => setShowSubmitModal(true)} disabled={isPastDue} className="btn-primary">
          <Send size={16} /> Submit Assignment
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer">
        <ArrowLeft size={18} /> Back
      </button>

      {/* Assignment Info */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-500/15 flex items-center justify-center">
              <ClipboardList size={24} className="text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{assignment.title}</h2>
              <StatusBadge status={assignment.type} size="sm" />
            </div>
          </div>
        </div>

        {assignment.description && (
          <p className="text-neutral-700 text-sm mb-4 leading-relaxed">{assignment.description}</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-neutral-50/50 rounded-xl">
          <div>
            <span className="text-xs text-neutral-400 block">Max Score</span>
            <span className="text-lg font-bold text-neutral-900">{assignment.maxScore}</span>
          </div>
          <div>
            <span className="text-xs text-neutral-400 block">Weight</span>
            <span className="text-lg font-bold text-neutral-900">{assignment.weight}</span>
          </div>
          {assignment.dueDate && (
            <div>
              <span className="text-xs text-neutral-400 flex items-center gap-1"><Calendar size={10} /> Due Date</span>
              <span className={`text-sm font-semibold ${isPastDue ? 'text-rose-400' : 'text-neutral-800'}`}>
                {new Date(assignment.dueDate).toLocaleDateString()}
              </span>
            </div>
          )}
          {assignment.timeLimitMins > 0 && (
            <div>
              <span className="text-xs text-neutral-400 flex items-center gap-1"><Clock size={10} /> Time Limit</span>
              <span className="text-sm font-semibold text-neutral-800">{assignment.timeLimitMins} min</span>
            </div>
          )}
        </div>
      </div>

      {assignment.type === 'QUIZ' ? renderQuizMode() : renderFileLinkMode()}

      {/* Retry confirmation */}
      <Modal isOpen={showRetryConfirm} onClose={() => setShowRetryConfirm(false)} title="Retry Quiz?" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Your previous result will be <strong>permanently replaced</strong>. This action cannot be undone.
            </p>
          </div>
          {assignment?.timeLimitMins > 0 && (
            <p className="text-sm text-neutral-500 flex items-center gap-1">
              <Timer size={14} /> New attempt will have {assignment.timeLimitMins} minutes.
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowRetryConfirm(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={() => handleStartQuiz(true)} disabled={submitting} className="btn-primary flex-1 !bg-amber-500 hover:!bg-amber-600">
              <RefreshCw size={14} /> {submitting ? 'Starting...' : 'Yes, Retry'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Submit Modal for FILE_UPLOAD / LINK_SUBMIT */}
      <Modal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="Submit Assignment" size="md">
        <div className="space-y-4">
          {assignment.type === 'FILE_UPLOAD' && (
            <div>
              <label className="text-sm font-medium text-neutral-700 mb-2 block">File nộp bài <span className="text-neutral-400 font-normal">(tối đa 50 MB)</span></label>
              {uploadedS3Key ? (
                /* File already uploaded */
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <FileText size={20} className="text-emerald-500 shrink-0" />
                  <span className="text-sm text-emerald-800 truncate flex-1">{uploadedFileName}</span>
                  <button
                    type="button"
                    onClick={() => { setUploadedS3Key(''); setUploadedFileName(''); }}
                    className="p-1 hover:bg-emerald-100 rounded-lg transition-colors text-emerald-700"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                /* Upload area */
                <div
                  className="border-2 border-dashed border-neutral-200 rounded-xl p-6 text-center hover:border-primary-300 hover:bg-primary-50/30 transition-all cursor-pointer"
                  onClick={() => !uploadingFile && fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary-400', 'bg-primary-50/50'); }}
                  onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-primary-400', 'bg-primary-50/50'); }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-primary-400', 'bg-primary-50/50');
                    await handleFileSelect(e.dataTransfer.files[0]);
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                  />
                  {uploadingFile ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Loader2 size={24} className="animate-spin text-primary-500" />
                      <p className="text-sm text-primary-500 font-medium">Đang tải lên...</p>
                    </div>
                  ) : (
                    <>
                      <Upload size={24} className="mx-auto text-neutral-400 mb-2" />
                      <p className="text-sm font-medium text-neutral-700">Kéo thả file vào đây hoặc click để chọn</p>
                      <p className="text-xs text-neutral-400 mt-1">Chấp nhận mọi định dạng • Tối đa 50 MB</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          {assignment.type === 'LINK_SUBMIT' && (
            <div>
              <label className="text-sm font-medium text-neutral-500 mb-1.5 block">Link URL</label>
              <input type="url" value={submitForm.linkUrl} onChange={(e) => setSubmitForm({ ...submitForm, linkUrl: e.target.value })} placeholder="https://github.com/..." className="w-full" />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
            <button onClick={() => setShowSubmitModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmitFileLink} disabled={submitting} className="btn-primary">
              <Send size={16} /> {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Result Modal for just completed quiz */}
      <Modal isOpen={showResultModal} onClose={() => setShowResultModal(false)} title="Quiz Attempt Result" size="sm">
        {latestAttemptResult && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6 bg-neutral-50 rounded-xl">
              <span className="text-sm text-neutral-500 mb-2">Your Score</span>
              <span className={`text-4xl font-bold ${latestAttemptResult.scorePercentage >= 60 ? 'text-emerald-500' : 'text-rose-400'}`}>
                {latestAttemptResult.scorePercentage.toFixed(1)}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-neutral-200 p-4 rounded-xl text-center">
                <span className="text-xs text-neutral-400 block mb-1">Correct</span>
                <span className="text-xl font-bold text-emerald-500">{latestAttemptResult.correctAnswers}</span>
              </div>
              <div className="bg-white border border-neutral-200 p-4 rounded-xl text-center">
                <span className="text-xs text-neutral-400 block mb-1">Total Questions</span>
                <span className="text-xl font-bold text-neutral-900">{latestAttemptResult.totalQuestions}</span>
              </div>
            </div>
            <div className="pt-4 flex">
              <button onClick={() => setShowResultModal(false)} className="btn-primary flex-1">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}