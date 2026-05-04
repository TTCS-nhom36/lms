import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assignmentApi } from '../../api/assignmentApi';
import { submissionApi } from '../../api/submissionApi';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import { ArrowLeft, FileText, Link as LinkIcon, Star, MessageSquare, Save } from 'lucide-react';

export default function Submissions() {
  const { courseId, assignmentId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradeTarget, setGradeTarget] = useState(null);
  const [gradeForm, setGradeForm] = useState({ manualScore: '', feedback: '' });

  useEffect(() => { loadData(); }, [assignmentId]);

  const loadData = async () => {
    try {
      const [aRes, sRes] = await Promise.all([
        assignmentApi.getById(assignmentId),
        assignmentApi.getSubmissions(assignmentId),
      ]);
      setAssignment(aRes.data);
      setSubmissions(sRes.data || []);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openGrade = (sub) => {
    setGradeTarget(sub);
    setGradeForm({ manualScore: sub.manualScore || '', feedback: sub.feedback || '' });
    setShowGradeModal(true);
  };

  const handleGrade = async () => {
    try {
      await submissionApi.grade(gradeTarget.id, {
        manualScore: parseFloat(gradeForm.manualScore),
        feedback: gradeForm.feedback,
      });
      toast.success('Graded successfully');
      setShowGradeModal(false);
      loadData();
    } catch {
      toast.error('Failed to grade');
    }
  };

  if (loading) return <LoadingSpinner text="Loading submissions..." />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-all cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-neutral-900">{assignment?.title} — Submissions</h2>
          <p className="text-sm text-neutral-500">{submissions.length} submissions • Max score: {assignment?.maxScore}</p>
        </div>
      </div>

      {submissions.length === 0 ? (
        <EmptyState icon={FileText} title="No submissions yet" description="Students haven't submitted their work yet" />
      ) : (
        <div className="glass-card overflow-hidden !rounded-xl">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Submitted At</th>
                <th>File/Link</th>
                <th>Late</th>
                <th>Auto Score</th>
                <th>Manual Score</th>
                <th>Final</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id}>
                  <td className="text-neutral-800 font-medium text-sm">{s.userId?.substring(0, 8)}...</td>
                  <td className="text-xs">{s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '-'}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {s.fileUrl && <a href={s.fileUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300"><FileText size={14} /></a>}
                      {s.linkUrl && <a href={s.linkUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300"><LinkIcon size={14} /></a>}
                      {!s.fileUrl && !s.linkUrl && <span className="text-neutral-300">—</span>}
                    </div>
                  </td>
                  <td>
                    <span className={`text-xs font-semibold ${s.isLate ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {s.isLate ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="text-neutral-700">{s.autoScore ?? '—'}</td>
                  <td className="text-neutral-700">{s.manualScore ?? '—'}</td>
                  <td className="font-semibold text-neutral-800">{s.finalScore ?? '—'}</td>
                  <td className="text-right">
                    <button
                      onClick={() => openGrade(s)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-500/15 text-primary-400 hover:bg-primary-500/25 transition-all cursor-pointer"
                    >
                      <Star size={12} className="inline mr-1" />
                      Grade
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grade Modal */}
      <Modal isOpen={showGradeModal} onClose={() => setShowGradeModal(false)} title="Grade Submission" size="md">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-1.5 block">Manual Score (out of {assignment?.maxScore})</label>
            <input type="number" value={gradeForm.manualScore} onChange={(e) => setGradeForm({ ...gradeForm, manualScore: e.target.value })} step="0.5" min="0" max={assignment?.maxScore} />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-1.5 block">
              <MessageSquare size={14} className="inline mr-1" />
              Feedback
            </label>
            <textarea rows={4} value={gradeForm.feedback} onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })} placeholder="Write feedback for the student..." />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
            <button onClick={() => setShowGradeModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleGrade} className="btn-primary">
              <Save size={16} /> Save Grade
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
