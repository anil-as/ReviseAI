import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
    getRevisionDashboard, 
    getScheduledAssessments, 
    getCalendarData 
} from '../services/dashboardService';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const refreshNotifications = useCallback(async () => {
        try {
            const [revRes, assessRes, calRes] = await Promise.all([
                getRevisionDashboard(),
                getScheduledAssessments(),
                getCalendarData()
            ]);

            const now = new Date();
            const threeDaysFromNow = new Date();
            threeDaysFromNow.setDate(now.getDate() + 3);

            // 1. Revisions
            const revs = revRes.data.filter(r => r.status === 'due_today' || r.status === 'overdue').map(r => ({
                id: `rev-${r.topic_id}`,
                type: 'study',
                title: r.topic_title,
                subtitle: `Study due: ${r.status === 'overdue' ? 'Overdue' : 'Today'}`,
                originalData: r,
                timestamp: new Date()
            }));

            // 2. Assessments
            const assessments = assessRes.data.filter(a => a.can_take_today).map(a => ({
                id: `assess-${a.topic_id}`,
                type: 'assessment',
                title: `Assessment: ${a.topic_title}`,
                subtitle: `Deadline: ${new Date(a.assessment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
                originalData: a,
                timestamp: new Date()
            }));

            // 3. Calendar Events
            const events = (calRes.data.events || []).filter(e => {
                const eventDate = new Date(e.start);
                return eventDate >= now && eventDate <= threeDaysFromNow;
            }).map(e => ({
                id: `event-${e.id}`,
                type: 'event',
                title: e.title,
                subtitle: `Event: ${new Date(e.start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
                originalData: e,
                timestamp: new Date()
            }));

            setNotifications([...revs, ...assessments, ...events]);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshNotifications();
        // Refresh every 5 minutes
        const interval = setInterval(refreshNotifications, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [refreshNotifications]);

    const clearNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    return (
        <NotificationContext.Provider value={{ 
            notifications, 
            loading, 
            refreshNotifications, 
            clearNotification, 
            clearAll 
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
