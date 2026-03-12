import API from './api';

export const createAttempt = (data) => API.post('/assessments/', data);
export const finalizeAssessment = (topicId, sessionId) =>
    API.post(`/assessments/finalize/${topicId}/${sessionId}`);
export const evaluateAnswer = (data) => API.post('/assessments/evaluate-answer', data);
