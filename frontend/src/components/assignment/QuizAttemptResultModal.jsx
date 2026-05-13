import Modal from '../ui/Modal';
import Button from '../ui/Button';
import QuizReview from './QuizReview';

export default function QuizAttemptResultModal({ isOpen, onClose, result, assignment, questions, scorePercent }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quiz Attempt Result" size="sm">
      {result && (
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center py-6 bg-neutral-50 rounded-xl">
            <span className="text-sm text-neutral-500 mb-2">Your Score</span>
            <span className={`text-4xl font-bold ${scorePercent >= 60 ? 'text-emerald-500' : 'text-rose-400'}`}>
              {Number(result.totalScore ?? 0).toFixed(2)} / {Number(result.maxScore ?? assignment?.maxScore ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-neutral-200 p-4 rounded-xl text-center">
              <span className="text-xs text-neutral-400 block mb-1">Correct</span>
              <span className="text-xl font-bold text-emerald-500">{result.correctAnswers}</span>
            </div>
            <div className="bg-white border border-neutral-200 p-4 rounded-xl text-center">
              <span className="text-xs text-neutral-400 block mb-1">Total Questions</span>
              <span className="text-xl font-bold text-neutral-900">{result.totalQuestions}</span>
            </div>
          </div>
          <div className="pt-4 flex">
              <Button onClick={onClose} className="flex-1">Close</Button>
          </div>
          <QuizReview questions={questions} attemptResult={result} />
        </div>
      )}
    </Modal>
  );
}
