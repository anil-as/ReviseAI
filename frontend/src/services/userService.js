import API from './api';

export const getMyProfile = () => API.get('/users/me');
export const updateMyProfile = (data) => API.patch('/users/me', data);
