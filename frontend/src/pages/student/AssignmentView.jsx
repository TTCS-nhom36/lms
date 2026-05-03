import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assignmentApi } from '../../api/assignmentApi';
import { quizAttemptApi } from '../../api/quizAttemptApi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { ArrowLeft, ClipboardList, Upload, Link as LinkIcon, Calendar, Clock, CheckCircle, Send, PlayCircle } from 'lucide-react';

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

  // Quiz State
  const [quizResult, setQuizResult] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionId: [opt1, opt2] }

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const aRes = await assignmentApi.getById(id);
      const assignmentData = aRes.data;
      setAssignment(assignmentData);

      if (assignmentData.type === 'QUIZ') {
        try {
          const attemptRes = await quizAttemptApi.getMyAttempt(id);
          setQuizResult(attemptRes.data);
        } catch {
          setQuizResult(null);
        }
      } else {
        try {
          const sRes = await assignmentApi.getMySubmission(id);
          setMySubmission(sRes.data);
        } catch {
          setMySubmission(null);
        }
      }
    } catch {
      toast.error('Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    setSubmitting(true);
    try {
      await quizAttemptApi.createAttempt({ assignmentId: id, userId: user.id });
      const qRes = await assignmentApi.getQuestions(id);
      setQuestions(qRes.data || []);
      setQuizStarted(true);
    } catch (err) {
      // If it fails because of DATA_INTEGRITY_VIOLATION, it means attempt exists
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

  const handleSubmitQuiz = async () => {
    setSubmitting(true);
    try {
      const answersList = [];
      Object.entries(selectedAnswers).forEach(([qId, optionIds]) => {
        optionIds.forEach(optId => {
          answersList.push({ questionId: Number(qId), selectedAnswerId: optId });
        });
      });

      const res = await quizAttemptApi.submitQuiz({
        quizId: id,
        studentId: user.id,
        answers: answersList
      });
      toast.success('Quiz submitted successfully!');
      setQuizResult(res.data);
      setQuizStarted(false);
    } catch {
      toast.error('Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFileLink = async () => {
    setSubmitting(true);
    try {
      await assignmentApi.submit(id, submitForm);
      toast.success('Submitted successfully! 🎉');
      setShowSubmitModal(false);
      loadData();
    } catch {
      toast.error('Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading assignment..." />;
  if (!assignment) return null;

  const isPastDue = assignment.dueDate && new Date(assignment.dueDate) < new Date();

  const renderQuizMode = () => {
    if (quizResult) {
      return (
        <div className="glass-card p-6 border-2 border-emerald-500/20">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-500" />
            Quiz Result
          </h3>
          <div className="grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-xl">
            <div>
              <span className="text-xs text-neutral-400 block">Score</span>
              <span className="text-2xl font-bold text-primary-500">{quizResult.scorePercentage.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-xs text-neutral-400 block">Correct Answers</span>
              <span className="text-2xl font-bold text-neutral-900">{quizResult.correctAnswers} / {quizResult.totalQuestions}</span>
            </div>
            <div className="col-span-2 text-sm text-neutral-500">
              Submitted at: {new Date(quizResult.submittedAt).toLocaleString()}
            </div>
          </div>
        </div>
      );
    }

    if (quizStarted) {
      return (
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-lg font-semibold text-neutral-900">Quiz Questions</h3>
          <div className="space-y-6">
            {questions.map((q, idx) => {
              const isMultiple = q.type === 'MULTIPLE_CHOICE';
              const selected = selectedAnswers[q.id] || [];

              return (
                <div key={q.id} className="p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                  <div className="flex justify-between items-start mb-3">
                    <p className="font-medium text-neutral-900"><span className="text-primary-500 mr-2">{idx + 1}.</span>{q.content}</p>
                    <span className="text-xs font-semibold px-2 py-1 bg-neutral-200 text-neutral-600 rounded">Score: {q.score}</span>
                  </div>
                  <div className="space-y-2 mt-4">
                    {q.options?.map(opt => {
                      const isChecked = selected.includes(opt.id);
                      return (
                        <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? 'bg-primary-50 border-primary-200' : 'bg-white border-neutral-200 hover:border-primary-300'}`}>
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
          <div className="pt-4 border-t border-neutral-200 flex justify-end">
            <button onClick={handleSubmitQuiz} disabled={submitting} className="btn-primary">
              <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="glass-card p-6 text-center">
        <ClipboardList size={40} className="text-neutral-300 mx-auto mb-3" />
        <p className="text-neutral-500 mb-4">You have not taken this quiz yet.</p>
        <button onClick={handleStartQuiz} disabled={submitting || isPastDue} className="btn-primary">
          <PlayCircle size={16} /> {submitting ? 'Starting...' : 'Start Quiz'}
        </button>
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
                <span className="text-xs text-neutral-400 block mb-1">File</span>
                <a href={mySubmission.fileUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 break-all">
                  <Upload size={14} /> {mySubmission.fileUrl}
                </a>
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

      {/* Submit Modal for FILE_UPLOAD / LINK_SUBMIT */}
      <Modal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="Submit Assignment" size="md">
        <div className="space-y-4">
          {assignment.type === 'FILE_UPLOAD' && (
            <div>
              <label className="text-sm font-medium text-neutral-500 mb-1.5 block">File URL</label>
              <input type="url" value={submitForm.fileUrl} onChange={(e) => setSubmitForm({ ...submitForm, fileUrl: e.target.value })} placeholder="https://drive.google.com/..." className="w-full" />
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
    </div>
  );
}