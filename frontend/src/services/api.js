import axios from 'axios';
import { loginUser, logoutUser, selectLanguage  } from '../features/userSlice';
export const getEvents = (reptileId) => api.get(`/reptile/events/${reptileId}`);
export const postEvent = (event) => api.post('/reptile/events', event);
export const deleteEvent = (eventId) => api.delete(`/reptile/events/${eventId}`);
export const createStripeCheckout = (plan, userId) => api.post('/stripe/create-checkout-session', { plan, userId });
export const manageStripeSubscription = (newPlan, userId) => api.post('/stripe/manage-subscription', { newPlan, userId });
export const cancelStripeSubscription = (userId) => api.post('/stripe/cancel-subscription', { userId });
export const createStripePortalSession = (userId) => api.post('/stripe/create-portal-session', { userId });
export const getCalendarEvents = (reptileId) => 
  api.get(`/calendar${reptileId ? `?reptileId=${reptileId}` : ""}`);

export const createCustomCalendarEvent = (event) => 
  api.post("/calendar/custom", event);

export const deleteCustomCalendarEvent = (eventId) => 
  api.delete(`/calendar/custom/${eventId}`);


let currentLanguage = navigator.language.split('-')[0] || 'it';
let reduxStore;
export const injectStore = (_store) => {
  reduxStore = _store;
};
export const setApiLanguage = (lang) => {
  currentLanguage = lang;
};

const api = axios.create({
    baseURL: process.env.REACT_APP_BACKEND_URL,
    withCredentials: true,
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
    config.headers['Accept-Language'] = currentLanguage;
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(

    response => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');

                let data;
                if (refreshToken) {
                    const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/v1/refresh-token`, null, {
                        headers: { Authorization: `Bearer ${refreshToken}` },
                    });
                    data = response.data;
                } else {
                    const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/v1/refresh-token`, null, {
                        withCredentials: true,
                    });
                    data = response.data;
                }
                if (data.accessToken) {
                    reduxStore.dispatch(loginUser(data.accessToken));
                    localStorage.setItem('token', data.accessToken);

                    originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                reduxStore.dispatch(logoutUser());
                localStorage.removeItem('token');
                window.location.href = '/login'
            }
        }

        return Promise.reject(error);
    }
);

export default api;
