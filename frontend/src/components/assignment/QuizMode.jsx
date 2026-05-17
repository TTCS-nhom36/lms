import Button from '../ui/Button';
import { CheckCircle, ClipboardList, Clock, Eye, PlayCircle, Send, Timer } from 'lucide-react';

function QuizResultPanel({ assignment, quizResult, mySubmission, onReview }) {
  const bestScore = mySubmission ? Number(mySubmission.finalScore ?? mySubmission.autoScore ?? 0) : Number(quizResult.totalScore ?? 0);
  const maxScore = Number(assignment?.maxScore ?? quizResult?.maxScore ?? 0);
  const bestScorePercent = maxScore ? (bestScore / maxScore) * 100 : 0;
  const passed = bestScorePercent >= 60;

  return (
    <div className={`rounded-xl border bg-white p-5 ${passed ? 'border-emerald-200' : 'border-rose-200'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-neutral-900 mb-2 flex items-center gap-2">
          <CheckCircle size={18} className={passed ? 'text-emerald-500' : 'text-rose-400'} />
            Quiz submitted
          </h3>
          <p className={`text-3xl font-bold ${passed ? 'text-emerald-500' : 'text-rose-400'}`}>
            {bestScore.toFixed(2)} / {maxScore.toFixed(2)}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Submitted at: {new Date(quizResult.submittedAt).toLocaleString()}
          </p>
        </div>
        <Button variant="secondary" onClick={onReview}>
          <Eye size={15} /> Review
        </Button>
      </div>
    </div>
  );
}

function QuizQuestion({ question, index, selected, onToggle }) {
  const isMultiple = question.type === 'MULTIPLE_CHOICE';
  const isAnswered = selected.length > 0;

  return (
    <div className={`p-4 rounded-xl border transition-all ${isAnswered ? 'bg-primary-50/40 border-primary-200' : 'bg-neutral-50 border-neutral-100'}`}>
      <div className="flex justify-between items-start mb-3">
        <p className="font-medium text-neutral-900">
          <span className={`mr-2 font-bold ${isAnswered ? 'text-primary-500' : 'text-neutral-400'}`}>{index + 1}.</span>
          {question.content}
        </p>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-xs font-semibold px-2 py-1 bg-neutral-200 text-neutral-600 rounded">{question.score} pts</span>
          {isMultiple && <span className="text-xs text-violet-500 font-medium border border-violet-200 px-2 py-0.5 rounded">Multi</span>}
        </div>
      </div>
      <div className="space-y-2 mt-3">
        {question.options?.map((option) => {
          const isChecked = selected.includes(option.id);
          return (
            <label key={option.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? 'bg-primary-50 border-primary-300 shadow-sm' : 'bg-white border-neutral-200 hover:border-primary-200 hover:bg-primary-50/30'}`}>
              <input
                type={isMultiple ? 'checkbox' : 'radio'}
                name={`question_${question.id}`}
                checked={isChecked}
                onChange={() => onToggle(question.id, option.id, isMultiple)}
                className="w-4 h-4 accent-primary-500"
              />
              <span className={`text-sm ${isChecked ? 'text-primary-900 font-medium' : 'text-neutral-700'}`}>{option.content}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function ActiveQuiz({ questions, selectedAnswers, answeredCount, timeLeft, timerColor, formattedTime, submitting, onToggleAnswer, onSubmit }) {
  return (
    <div className="space-y-4">
      <div className="glass-card p-4 flex items-center justify-between sticky top-4 z-10 border border-neutral-200 shadow-sm">
        <span className="text-sm text-neutral-500 font-medium">
          Progress: <span className="text-neutral-900 font-bold">{answeredCount}/{questions.length}</span> answered
        </span>
        {timeLeft !== null && (
          <div className={`flex items-center gap-2 font-mono text-xl font-bold ${timerColor}`}>
            <Timer size={18} />
            {formattedTime}
          </div>
        )}
      </div>

      <div className="glass-card p-6 space-y-6">
        <h3 className="text-lg font-semibold text-neutral-900">Quiz Questions</h3>
        <div className="space-y-6">
          {questions.map((question, index) => (
            <QuizQuestion
              key={question.id}
              question={question}
              index={index}
              selected={selectedAnswers[question.id] || []}
              onToggle={onToggleAnswer}
            />
          ))}
        </div>
        <div className="pt-4 border-t border-neutral-200 flex items-center justify-between">
          <span className="text-sm text-neutral-500">{answeredCount} of {questions.length} answered</span>
          <Button onClick={onSubmit} disabled={submitting}>
            <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuizStart({ assignment, quizAttempt, isPastDue, submitting, onStart, onContinue }) {
  const hasStartedAttempt = Boolean(quizAttempt);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center">
      <ClipboardList size={40} className="text-neutral-300 mx-auto mb-3" />
      <p className="text-neutral-700 mb-2 font-medium">
        {hasStartedAttempt ? 'Continue your quiz?' : 'Ready to take this quiz?'}
      </p>
      <p className="text-xs text-neutral-500 mb-4">
        {hasStartedAttempt ? 'You started this quiz but have not submitted it yet.' : 'You can submit this quiz only once.'}
      </p>
      {assignment.timeLimitMins > 0 && (
        <p className="text-sm text-amber-500 mb-5 flex items-center justify-center gap-1">
          <Clock size={14} /> Time limit: {assignment.timeLimitMins} minutes - timer starts when you begin
        </p>
      )}
      <Button onClick={hasStartedAttempt ? onContinue : onStart} disabled={submitting || isPastDue}>
        <PlayCircle size={16} /> {submitting ? 'Loading...' : hasStartedAttempt ? 'Continue Quiz' : 'Start Quiz'}
      </Button>
      {isPastDue && <p className="text-xs text-rose-400 mt-3">This quiz is past due.</p>}
    </div>
  );
}

export default function QuizMode(props) {
  if (props.quizResult && !props.quizStarted) {
    return <QuizResultPanel {...props} />;
  }

  if (props.quizStarted) {
    return (
      <ActiveQuiz
        questions={props.questions}
        selectedAnswers={props.selectedAnswers}
        answeredCount={props.answeredCount}
        timeLeft={props.timeLeft}
        timerColor={props.timerColor}
        formattedTime={props.formattedTime}
        submitting={props.submitting}
        onToggleAnswer={props.onToggleAnswer}
        onSubmit={props.onSubmit}
      />
    );
  }

  return (
    <QuizStart
      assignment={props.assignment}
      quizAttempt={props.quizAttempt}
      isPastDue={props.isPastDue}
      submitting={props.submitting}
      onStart={props.onStart}
      onContinue={props.onContinue}
    />
  );
}
