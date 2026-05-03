import api from './axios';

export const quizAttemptApi = {
  createAttempt: (data) => api.post(`/quiz-attempts`, data),
  submitQuiz: (data) => api.post(`/quiz-attempts/submit`, data),
  getAttemptResult: (id) => api.get(`/quiz-attempts/${id}/result`),
  getMyAttempt: (assignmentId) => api.get(`/quiz-attempts/assignment/${assignmentId}/my-attempt`),
};
