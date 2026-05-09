import api from './axios';

export const statsApi = {
	getCourseOverview: (courseId) => api.get(`/stats/courses/${courseId}/overview`),
	getCourseCompletion: (courseId) => api.get(`/stats/courses/${courseId}/completion`),
	getSubmissionRate: (courseId) => api.get(`/stats/courses/${courseId}/submission-rate`),
	getScoreDistribution: (courseId) => api.get(`/stats/courses/${courseId}/score-distribution`),
	getAttendance: (courseId) => api.get(`/stats/courses/${courseId}/attendance`),
	getStudentProgress: (studentId) => api.get(`/stats/students/${studentId}/progress`),
	getStudentScores: (studentId) => api.get(`/stats/students/${studentId}/scores`),
	getAdminSummary: () => api.get('/stats/admin/summary'),
};