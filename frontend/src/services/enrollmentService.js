import API from './api';

export const requestEnrollment = (subjectId, details) => API.post(`/enrollments/request/${subjectId}`, details);
export const approveEnrollment = (enrollmentId) => API.post(`/enrollments/approve/${enrollmentId}`);
export const rejectEnrollment = (enrollmentId) => API.post(`/enrollments/reject/${enrollmentId}`);
export const getEnrollmentsForSubject = (subjectId) => API.get(`/enrollments/subject/${subjectId}`);
export const getPendingEnrollments = (subjectId) => getEnrollmentsForSubject(subjectId);
export const getMyEnrollments = () => API.get(`/enrollments/my`);
export const unenrollSubject = (subjectId) => API.delete(`/enrollments/unenroll/${subjectId}`);
