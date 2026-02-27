import API from './api';

export const getSubjectAnalytics = (subjectId) => API.get(`/analytics/subject/${subjectId}`);
export const getSubjectStudents = (subjectId) => API.get(`/analytics/subject/${subjectId}/students`);
export const getStudentAnalytics = (subjectId, studentId) => API.get(`/analytics/subject/${subjectId}/student/${studentId}`);

