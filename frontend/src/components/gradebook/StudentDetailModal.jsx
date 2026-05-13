import Modal from '../ui/Modal';
import StatusBadge from '../ui/StatusBadge';

const formatScore = (score) => {
  if (score == null) return '-';
  const numScore = Number(score);
  return Number.isNaN(numScore) ? '-' : numScore.toFixed(1);
};

const getScoreColor = (score) => {
  if (score == null) return 'text-gray-500';
  const numScore = Number(score);
  if (numScore >= 8) return 'text-emerald-600';
  if (numScore >= 5) return 'text-amber-600';
  return 'text-red-500';
};

export default function StudentDetailModal({ isOpen, onClose, student }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Student Details" size="md">
      {student && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-gray-500 uppercase tracking-wide">Full Name</p><p className="font-semibold text-gray-900">{student.fullName}</p></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wide">Email</p><p className="font-semibold text-gray-900">{student.email}</p></div>
          </div>

          <div className="border-t pt-4 grid grid-cols-2 gap-4">
            <div><p className="text-xs text-gray-500 uppercase tracking-wide">Status</p><div className="mt-1"><StatusBadge status={student.enrollmentStatus} size="xs" /></div></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wide">Enrollment Status</p><p className="font-semibold text-gray-900">{student.enrollmentStatus}</p></div>
          </div>

          <div className="border-t pt-4 grid grid-cols-3 gap-4">
            <div><p className="text-xs text-gray-500 uppercase tracking-wide">Submitted</p><p className="text-2xl font-bold text-blue-600">{student.submittedAssignments}</p></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wide">Total</p><p className="text-2xl font-bold text-gray-700">{student.totalAssignments}</p></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wide">Average Score</p><p className={`text-2xl font-bold ${getScoreColor(student.averageScore)}`}>{formatScore(student.averageScore)}</p></div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Completion Rate</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: student.totalAssignments > 0 ? `${(student.submittedAssignments / student.totalAssignments) * 100}%` : '0%' }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {student.totalAssignments > 0 ? `${((student.submittedAssignments / student.totalAssignments) * 100).toFixed(0)}% complete` : 'No assignments'}
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
