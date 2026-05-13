import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';
import Dropdown from '../ui/Dropdown';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { Plus, Trash2 } from 'lucide-react';

const questionTypes = [
  { value: 'SINGLE_CHOICE', label: 'Single Choice' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'TRUE_FALSE', label: 'True / False' },
];

export default function QuestionsModal({
  isOpen,
  onClose,
  assignment,
  details,
  loading,
  form,
  onFormChange,
  saving,
  onAddQuestion,
  onDeleteQuestion,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={assignment ? `Questions for ${assignment.title}` : 'Manage Questions'} size="lg">
      <div className="space-y-4">
        {loading ? (
          <div className="p-6 text-center">
            <LoadingSpinner text="Loading questions..." />
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Add question</h3>
                <p className="text-xs text-gray-500">Use the assignment question endpoint to add quiz questions.</p>
              </div>
              <div className="space-y-3">
                <Textarea label="Question" rows={3} value={form.content} onChange={(e) => onFormChange({ ...form, content: e.target.value })} placeholder="Write the question content here" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Dropdown label="Type" value={form.type} options={questionTypes} onChange={(type) => onFormChange({ ...form, type })} />
                  <Input label="Score" type="number" min="0" value={form.score} onChange={(e) => onFormChange({ ...form, score: e.target.value })} />
                  <Input label="Order" type="number" min="1" value={form.orderIndex} onChange={(e) => onFormChange({ ...form, orderIndex: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <Button variant="secondary" onClick={onClose}>Close</Button>
                  <Button onClick={onAddQuestion} disabled={saving}>
                    <Plus size={14} className="inline-block mr-1" /> {saving ? 'Adding...' : 'Add Question'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Existing Questions</h3>
              {details?.questions?.length ? (
                <div className="space-y-3">
                  {details.questions.map((question, index) => (
                    <div key={question.id || index} className="p-3 bg-gray-50 rounded-xl border border-gray-100 relative group">
                      <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
                        <span>{question.type || 'Question'}</span>
                        <div className="flex items-center gap-3">
                          <span>Score: {question.score ?? '-'}</span>
                          <button onClick={() => onDeleteQuestion(question.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Question">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{question.content || 'No content available'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No question data available yet. After adding, questions will appear here if the backend includes them.</p>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
