import Button from '../ui/Button';
import { ClipboardList, Edit, Eye, Send, Trash2 } from 'lucide-react';

export default function FileLinkSubmissionPanel({ submission, submissionFileUrl, isPastDue, onSubmit, onEdit, onReview, onDelete }) {
  if (submission) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white p-4">
        <div>
          <p className="text-sm font-semibold text-neutral-900">Submission sent</p>
          <p className="text-xs text-neutral-500">{submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'Submitted'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onReview}>
            <Eye size={14} /> Review
          </Button>
          <Button variant="secondary" size="sm" onClick={onEdit} disabled={isPastDue}>
            <Edit size={14} /> Edit
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete} disabled={isPastDue}>
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center">
      <ClipboardList size={36} className="text-neutral-300 mx-auto mb-3" />
      <p className="text-neutral-600 mb-4">You haven't submitted this assignment yet.</p>
      <Button onClick={onSubmit} disabled={isPastDue}>
        <Send size={16} /> Submit Assignment
      </Button>
    </div>
  );
}
