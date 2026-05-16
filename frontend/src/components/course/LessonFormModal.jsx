import { useState, useRef } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Tabs from '../ui/Tabs';
import Textarea from '../ui/Textarea';
import { lessonApi } from '../../api/lessonApi';
import { useToast } from '../../hooks/useToast';
import { Loader2, Upload } from 'lucide-react';

const contentTypeTabs = [
  { value: 'VIDEO', label: 'Video' },
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'TEXT', label: 'Text' },
  { value: 'LINK', label: 'Link' },
  { value: 'NOTEBOOK', label: 'Notebook' },
];

export default function LessonFormModal({ isOpen, onClose, onSave, lesson, form, onChange }) {
  const [uploading, setUploading] = useState(false);
  const toast = useToast();
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size must not exceed 25MB');
      return;
    }

    try {
      setUploading(true);
      const res = await lessonApi.uploadDocument(file);
      const uploadedUrl = res.data.objectUrl || res.data.url || res.data.s3Key;
      onChange({ ...form, contentUrl: uploadedUrl });
      toast.success('Document uploaded successfully');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to upload document';
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={lesson ? 'Edit Lesson' : 'Create Lesson'} size="md">
      <div className="space-y-4">
        <Input
          label="Lesson Title"
          type="text"
          value={form.title}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
          placeholder="Lesson title"
        />
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Content Type</label>
          <Tabs tabs={contentTypeTabs} activeTab={form.contentType} onChange={(contentType) => onChange({ ...form, contentType })} />
        </div>
        
        {form.contentType === 'TEXT' ? (
          <Textarea
            label="Lesson Content"
            rows={4}
            value={form.contentText}
            onChange={(e) => onChange({ ...form, contentText: e.target.value })}
            placeholder="Add lesson text content"
          />
        ) : form.contentType === 'DOCUMENT' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Upload PDF Document</label>
              <div className="flex items-center gap-2">
                <Button 
                  variant="secondary" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex justify-center items-center gap-2"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Uploading...' : 'Choose PDF File'}
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
              {form.contentUrl && (
                <p className="text-xs text-green-600 font-medium break-all">
                  ✓ File uploaded: {form.contentUrl.split('/').pop()}
                </p>
              )}
            </div>
            <Textarea
              label="Lesson Content / Notes"
              rows={3}
              value={form.contentText}
              onChange={(e) => onChange({ ...form, contentText: e.target.value })}
              placeholder="Add optional notes or description..."
            />
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="Content URL"
              type="url"
              value={form.contentUrl}
              onChange={(e) => onChange({ ...form, contentUrl: e.target.value })}
              placeholder="https://..."
            />
            {form.contentType !== 'VIDEO' && (
              <Textarea
                label="Lesson Content / Notes"
                rows={3}
                value={form.contentText}
                onChange={(e) => onChange({ ...form, contentText: e.target.value })}
                placeholder="Add optional content or notes..."
              />
            )}
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
            <input
              type="checkbox"
              checked={form.isFreePreview}
              onChange={(e) => onChange({ ...form, isFreePreview: e.target.checked })}
            />
            Free preview
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose} disabled={uploading}>Cancel</Button>
          <Button onClick={onSave} disabled={uploading || (form.contentType === 'DOCUMENT' && !form.contentUrl)}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
