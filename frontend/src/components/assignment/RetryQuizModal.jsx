import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { AlertTriangle, RefreshCw, Timer } from 'lucide-react';

export default function RetryQuizModal({ isOpen, onClose, onConfirm, assignment, submitting }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Retry Quiz?" size="sm">
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
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={onConfirm} disabled={submitting} className="flex-1 !bg-amber-500 hover:!bg-amber-600">
            <RefreshCw size={14} /> {submitting ? 'Starting...' : 'Yes, Retry'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
