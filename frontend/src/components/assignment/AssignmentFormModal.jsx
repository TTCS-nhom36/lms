import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Dropdown from '../ui/Dropdown';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';

const assignmentTypes = [
  { value: 'QUIZ', label: 'Quiz' },
  { value: 'FILE_UPLOAD', label: 'File Upload' },
  { value: 'LINK_SUBMIT', label: 'Link Submit' },
];

export default function AssignmentFormModal({ isOpen, onClose, onSave, assignment, form, onChange }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={assignment ? 'Edit Assignment' : 'New Assignment'} size="lg">
      <div className="space-y-3">
        <Input label="Title" type="text" value={form.title} onChange={(e) => onChange({ ...form, title: e.target.value })} />
        <Textarea label="Description" rows={3} value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Dropdown label="Type" value={form.type} options={assignmentTypes} onChange={(type) => onChange({ ...form, type })} />
          <Input label="Max Score" type="number" value={form.maxScore} onChange={(e) => onChange({ ...form, maxScore: parseFloat(e.target.value) })} />
          <Input label="Weight" type="number" step="0.1" value={form.weight} onChange={(e) => onChange({ ...form, weight: parseFloat(e.target.value) })} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Due Date" type="datetime-local" value={form.dueDate} onChange={(e) => onChange({ ...form, dueDate: e.target.value })} />
          <Input label="Time Limit (min)" type="number" value={form.timeLimitMins} onChange={(e) => onChange({ ...form, timeLimitMins: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="flex items-center gap-5 flex-wrap">
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={form.allowLate} onChange={(e) => onChange({ ...form, allowLate: e.target.checked })} className="!w-4 !h-4 accent-red-500" />
            Allow Late
          </label>
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={form.shuffleQuestions} onChange={(e) => onChange({ ...form, shuffleQuestions: e.target.checked })} className="!w-4 !h-4 accent-red-500" />
            Shuffle Questions
          </label>
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={form.shuffleOptions} onChange={(e) => onChange({ ...form, shuffleOptions: e.target.checked })} className="!w-4 !h-4 accent-red-500" />
            Shuffle Options
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
