import { CheckCircle, X } from 'lucide-react';

export default function QuizReview({ questions, attemptResult }) {
  if (!attemptResult || !questions.length) return null;

  const sameId = (a, b) => String(a) === String(b);

  const selectedAnswers = (questionId) => (attemptResult.answers || [])
    .filter((answer) => sameId(answer.questionId, questionId));

  const selectedIds = (questionId) => selectedAnswers(questionId)
    .map((answer) => String(answer.selectedOptionId));

  const isCorrect = (question) => {
    const answers = selectedAnswers(question.id);
    const selectedOptionIds = selectedIds(question.id);
    const correctOptionIds = (question.options || [])
      .filter((option) => option.isCorrect === true)
      .map((option) => String(option.id));

    if (correctOptionIds.length === 0) {
      return answers.length > 0 && answers.every((answer) => answer.isCorrect === true);
    }

    return selectedOptionIds.length > 0
      && selectedOptionIds.length === correctOptionIds.length
      && correctOptionIds.every((optionId) => selectedOptionIds.includes(optionId));
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-neutral-900">Review Answers</h4>
        <span className="text-xs text-neutral-500">Dung / sai tung cau</span>
      </div>

      <div className="space-y-4">
        {questions.map((question, idx) => {
          const answers = selectedAnswers(question.id);
          const selectedOptionIds = selectedIds(question.id);
          const correctOptionIds = (question.options || [])
            .filter((option) => option.isCorrect === true)
            .map((option) => String(option.id));
          const answeredCorrectly = isCorrect(question);
          const isAnswered = selectedOptionIds.length > 0;

          return (
            <div
              key={question.id}
              className={`rounded-xl border p-4 ${answeredCorrectly ? 'border-emerald-200 bg-emerald-50/60' : isAnswered ? 'border-rose-200 bg-rose-50/50' : 'border-neutral-200 bg-neutral-50/60'}`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-medium text-neutral-900">
                    <span className="mr-2 font-bold text-primary-500">{idx + 1}.</span>
                    {question.content}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    <span className="px-2 py-1 rounded-full bg-white/80 text-neutral-500 border border-neutral-200">
                      {question.type === 'MULTIPLE_CHOICE' ? 'Multiple choice' : 'Single choice'}
                    </span>
                    <span className={`px-2 py-1 rounded-full border ${answeredCorrectly ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : isAnswered ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-neutral-100 text-neutral-500 border-neutral-200'}`}>
                      {answeredCorrectly ? 'Dung' : isAnswered ? 'Sai' : 'Chua tra loi'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2 py-1 bg-white/80 text-neutral-600 rounded border border-neutral-200 shrink-0">
                  {question.score} pts
                </span>
              </div>

              <div className="space-y-2">
                {question.options?.map((option) => {
                  const selectedAnswer = answers.find((answer) => sameId(answer.selectedOptionId, option.id));
                  const isSelected = selectedOptionIds.includes(String(option.id));
                  const isCorrectOption = correctOptionIds.includes(String(option.id)) || selectedAnswer?.isCorrect === true;
                  let optionClasses = 'bg-white border-neutral-200 text-neutral-700';
                  if (isCorrectOption && isSelected) optionClasses = 'bg-emerald-100 border-emerald-300 text-emerald-900';
                  else if (isCorrectOption) optionClasses = 'bg-emerald-50 border-emerald-200 text-emerald-900';
                  else if (isSelected) optionClasses = 'bg-rose-100 border-rose-300 text-rose-900';

                  return (
                    <div key={option.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${optionClasses}`}>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isCorrectOption ? 'border-emerald-500' : isSelected ? 'border-rose-500' : 'border-neutral-300'}`}>
                        {isCorrectOption && <CheckCircle size={10} className="text-emerald-600" />}
                        {isSelected && !isCorrectOption && <X size={10} className="text-rose-600" />}
                      </div>
                      <p className="text-sm font-medium break-words flex-1 min-w-0">{option.content}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
