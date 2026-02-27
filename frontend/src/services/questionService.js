import API from './api';

export const generateQuestions = (topicId) => API.get(`/questions/generate/${topicId}`);
