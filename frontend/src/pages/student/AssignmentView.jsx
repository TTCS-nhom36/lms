import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assignmentApi } from '../../api/assignmentApi';
import { useToast } from '../../contexts/ToastContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { ArrowLeft, ClipboardList, Upload, Link as LinkIcon, Calendar, Clock, CheckCircle, Send } from 'lucide-react';

export default function AssignmentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [assignment, setAssignment] = useState(null);
  const [mySubmission, setMySubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitForm, setSubmitForm] = useState({ fileUrl: '', linkUrl: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const aRes = await assignmentApi.getById(id);
      setAssignment(aRes.data);
      try {
        const sRes = await assignmentApi.getMySubmission(id);
        setMySubmission(sRes.data);
      } catch {
        setMySubmission(null);
      }
    } catch {
      toast.error('Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
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

      {/* My Submission */}
      {mySubmission ? (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-400" />
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
                <a href={mySubmission.fileUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1">
                  <Upload size={14} /> {mySubmission.fileUrl}
                </a>
              </div>
            )}
            {mySubmission.linkUrl && (
              <div>
                <span className="text-xs text-neutral-400 block mb-1">Link</span>
                <a href={mySubmission.linkUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1">
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
      ) : (
        <div className="glass-card p-6 text-center">
          <ClipboardList size={40} className="text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500 mb-4">You haven't submitted this assignment yet</p>
          <button onClick={() => setShowSubmitModal(true)} className="btn-primary">
            <Send size={16} /> Submit Assignment
          </button>
        </div>
      )}

      {/* Submit Modal */}
      <Modal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="Submit Assignment" size="md">
        <div className="space-y-4">
          {(assignment.type === 'FILE_UPLOAD' || assignment.type === 'QUIZ') && (
            <div>
              <label className="text-sm font-medium text-neutral-500 mb-1.5 block">File URL</label>
              <input type="url" value={submitForm.fileUrl} onChange={(e) => setSubmitForm({ ...submitForm, fileUrl: e.target.value })} placeholder="https://drive.google.com/..." />
            </div>
          )}
          {(assignment.type === 'LINK_SUBMIT' || assignment.type === 'QUIZ') && (
            <div>
              <label className="text-sm font-medium text-neutral-500 mb-1.5 block">Link URL</label>
              <input type="url" value={submitForm.linkUrl} onChange={(e) => setSubmitForm({ ...submitForm, linkUrl: e.target.value })} placeholder="https://github.com/..." />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
            <button onClick={() => setShowSubmitModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
              <Send size={16} /> {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
