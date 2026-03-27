import React, { createContext, useContext, useState } from 'react';
import { createTopic } from '../services/topicService';
import { useToast } from '../components/Toast';

const UploadContext = createContext();

export const useUploads = () => useContext(UploadContext);

export const UploadProvider = ({ children }) => {
    const [activeUploads, setActiveUploads] = useState({});
    const toast = useToast();

    const startUpload = async (subjectId, formData, onComplete) => {
        const tempId = `upload-${Date.now()}`;
        const title = formData.get('title');

        setActiveUploads(prev => ({
            ...prev,
            [tempId]: { id: tempId, title, progress: 0, status: 'uploading' }
        }));

        try {
            const response = await createTopic(subjectId, formData, (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setActiveUploads(prev => ({
                    ...prev,
                    [tempId]: { ...prev[tempId], progress: percentCompleted }
                }));
            });

            setActiveUploads(prev => ({
                ...prev,
                [tempId]: { ...prev[tempId], progress: 100, status: 'completed' }
            }));

            toast(`"${title}" uploaded successfully!`, "success");
            if (onComplete) onComplete(response.data);

            // Remove from active list after 5 seconds
            setTimeout(() => {
                setActiveUploads(prev => {
                    const next = { ...prev };
                    delete next[tempId];
                    return next;
                });
            }, 5000);

        } catch (error) {
            console.error("Upload failed:", error);
            setActiveUploads(prev => ({
                ...prev,
                [tempId]: { ...prev[tempId], status: 'error' }
            }));
            toast(`Failed to upload "${title}"`, "error");
        }
    };

    return (
        <UploadContext.Provider value={{ activeUploads, startUpload }}>
            {children}
        </UploadContext.Provider>
    );
};
