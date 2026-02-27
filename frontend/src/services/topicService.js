import API from './api';

export const createTopic = (subjectId, formData) => {
    // Backend reads `title` and `difficulty_level` as query params (not form body)
    const title = formData.get('title');
    const difficulty_level = formData.get('difficulty_level');
    // Keep only the file in the FormData
    const fileOnly = new FormData();
    fileOnly.append('file', formData.get('file'));
    return API.post(`/topics/${subjectId}`, fileOnly, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: { title, difficulty_level },
    });
};

export const getTopics = (subjectId) => API.get(`/topics/${subjectId}`);
export const updateTopic = (topicId, params) => API.put(`/topics/${topicId}`, null, { params });
export const deleteTopic = (topicId, clearData = false) => API.delete(`/topics/${topicId}`, { params: { clear_data: clearData } });
