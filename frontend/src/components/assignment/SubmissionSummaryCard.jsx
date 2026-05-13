import { CheckCircle, Download, Link as LinkIcon } from 'lucide-react';

export default function SubmissionSummaryCard({ submission, submissionFileUrl }) {
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
              {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : '-'}
            </span>
          </div>
          <div>
            <span className="text-xs text-neutral-400 block">Late</span>
            <span className={`text-sm font-semibold ${submission.isLate ? 'text-rose-400' : 'text-emerald-400'}`}>
              {submission.isLate ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
        {submission.fileUrl && (
          <div>
            <span className="text-xs text-neutral-400 block mb-1">Submitted file</span>
            {submissionFileUrl ? (
              <a href={submissionFileUrl} target="_blank" rel="noreferrer" download className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors font-medium text-sm">
                <Download size={15} /> Download file
              </a>
            ) : (
              <span className="text-sm text-neutral-400">Loading link...</span>
            )}
          </div>
        )}
        {submission.linkUrl && (
          <div>
            <span className="text-xs text-neutral-400 block mb-1">Link</span>
            <a href={submission.linkUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1 break-all">
              <LinkIcon size={14} /> {submission.linkUrl}
            </a>
          </div>
        )}
        <div className="grid grid-cols-3 gap-4 p-4 bg-neutral-50/50 rounded-xl mt-4">
          <div><span className="text-xs text-neutral-400 block">Auto Score</span><span className="text-lg font-bold text-neutral-900">{submission.autoScore ?? '-'}</span></div>
          <div><span className="text-xs text-neutral-400 block">Manual Score</span><span className="text-lg font-bold text-neutral-900">{submission.manualScore ?? '-'}</span></div>
          <div><span className="text-xs text-neutral-400 block">Final Score</span><span className="text-lg font-bold text-primary-400">{submission.finalScore ?? '-'}</span></div>
        </div>
        {submission.feedback && (
          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl mt-3">
            <span className="text-xs text-blue-400 font-semibold block mb-1">Instructor Feedback</span>
            <p className="text-sm text-neutral-700">{submission.feedback}</p>
          </div>
        )}
      </div>
    </div>
  );
}
