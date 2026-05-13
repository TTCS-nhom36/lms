import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function ChapterFormModal({ isOpen, onClose, onSave, chapter, form, onChange }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={chapter ? 'Edit Chapter' : 'Create Chapter'} size="md">
      <div className="space-y-4">
        <Input
          label="Title"
          type="text"
          value={form.title}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
          placeholder="Chapter title"
        />
        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
