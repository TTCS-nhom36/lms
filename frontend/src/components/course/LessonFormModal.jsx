import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Tabs from '../ui/Tabs';
import Textarea from '../ui/Textarea';

const contentTypeTabs = [
  { value: 'VIDEO', label: 'Video' },
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'TEXT', label: 'Text' },
  { value: 'LINK', label: 'Link' },
  { value: 'NOTEBOOK', label: 'Notebook' },
];

export default function LessonFormModal({ isOpen, onClose, onSave, lesson, form, onChange }) {
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
        ) : (
          <Input
            label="Content URL"
            type="url"
            value={form.contentUrl}
            onChange={(e) => onChange({ ...form, contentUrl: e.target.value })}
            placeholder="https://..."
          />
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
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
