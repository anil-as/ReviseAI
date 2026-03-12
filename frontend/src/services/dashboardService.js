import API from './api';

export const getRevisionDashboard = () => API.get('/dashboard/revisions');
export const postponeRevision = (topicId) => API.post(`/dashboard/postpone/${topicId}`);
export const getStudentDashboard = () => API.get('/dashboard/student');
export const getInstructorDashboard = () => API.get('/dashboard/instructor');
export const getCalendarData = () => API.get('/dashboard/calendar');
export const createCalendarEvent = (data) => API.post('/dashboard/calendar/event', data);
export const deleteCalendarEvent = (id) => API.delete(`/dashboard/calendar/event/${id}`);
export const deleteRevision = (topicId) => API.delete(`/dashboard/revisions/${topicId}`);

