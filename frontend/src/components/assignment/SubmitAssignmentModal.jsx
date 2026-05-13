import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { FileText, Loader2, Send, Upload, X } from 'lucide-react';

export default function SubmitAssignmentModal({
  isOpen,
  onClose,
  assignment,
  submitForm,
  onSubmitFormChange,
  submitting,
  uploadingFile,
  uploadedFileName,
  uploadedS3Key,
  fileInputRef,
  onFileSelect,
  onClearFile,
  onSubmit,
  isEditing = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Submission' : 'Submit Assignment'} size="md">
      <div className="space-y-4">
        {assignment.type === 'FILE_UPLOAD' && (
          <div>
            <label className="text-sm font-medium text-neutral-700 mb-2 block">Submission file <span className="text-neutral-400 font-normal">(max 50 MB)</span></label>
            {uploadedS3Key ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <FileText size={20} className="text-emerald-500 shrink-0" />
                <span className="text-sm text-emerald-800 truncate flex-1">{uploadedFileName}</span>
                <button type="button" onClick={onClearFile} className="p-1 hover:bg-emerald-100 rounded-lg transition-colors text-emerald-700">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-neutral-200 rounded-xl p-6 text-center hover:border-primary-300 hover:bg-primary-50/30 transition-all cursor-pointer"
                onClick={() => !uploadingFile && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary-400', 'bg-primary-50/50'); }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-primary-400', 'bg-primary-50/50'); }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-primary-400', 'bg-primary-50/50');
                  await onFileSelect(e.dataTransfer.files[0]);
                }}
              >
                <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => onFileSelect(e.target.files[0])} />
                {uploadingFile ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <Loader2 size={24} className="animate-spin text-primary-500" />
                    <p className="text-sm text-primary-500 font-medium">Uploading...</p>
                  </div>
                ) : (
                  <>
                    <Upload size={24} className="mx-auto text-neutral-400 mb-2" />
                    <p className="text-sm font-medium text-neutral-700">Drag a file here or click to choose</p>
                    <p className="text-xs text-neutral-400 mt-1">All formats accepted - Max 50 MB</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {assignment.type === 'LINK_SUBMIT' && (
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-1.5 block">Link URL</label>
            <Input type="url" value={submitForm.linkUrl} onChange={(e) => onSubmitFormChange({ ...submitForm, linkUrl: e.target.value })} placeholder="https://github.com/..." className="w-full" />
          </div>
        )}
        <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit} disabled={submitting}>
            <Send size={16} /> {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Submit'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
