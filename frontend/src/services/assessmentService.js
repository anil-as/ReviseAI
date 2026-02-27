import API from './api';

export const createAttempt = (data) => API.post('/assessments/', data);
export const finalizeAssessment = (topicId, sessionId) =>
    API.post(`/assessments/finalize/${topicId}/${sessionId}`);
