import API from './api';

export const createTopic = (subjectId, formData) => {
    // Backend reads `title`, `topic_type`, and `file` as Form data
    return API.post(`/topics/${subjectId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const getTopics = (subjectId) => API.get(`/topics/${subjectId}`);
export const updateTopic = (topicId, params) => API.put(`/topics/${topicId}`, null, { params });
export const deleteTopic = (topicId, clearData = false) => API.delete(`/topics/${topicId}`, { params: { clear_data: clearData } });
