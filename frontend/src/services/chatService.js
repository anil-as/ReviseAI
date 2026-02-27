import API from './api';

export const getMessages = (subjectId) => API.get(`/chat/${subjectId}`);
export const sendMessage = (subjectId, content) => API.post(`/chat/${subjectId}`, { content });
export const deleteMessage = (msgId) => API.delete(`/chat/message/${msgId}`);
export const getChatSubjects = () => API.get(`/chat/subjects/list`);
