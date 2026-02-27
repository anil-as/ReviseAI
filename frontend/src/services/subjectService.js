import API from './api';

export const createSubject = (data) => API.post('/subjects/', data);
export const getMySubjects = () => API.get('/subjects/my');
export const getPublicSubjects = () => API.get('/subjects/public');
export const getEnrolledSubjects = () => API.get('/subjects/enrolled');
export const updateSubject = (id, data) => API.put(`/subjects/${id}`, data);
export const deleteSubject = (id) => API.delete(`/subjects/${id}`);

