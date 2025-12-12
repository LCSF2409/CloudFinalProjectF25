import axios from 'axios';
import { toast } from 'react-toastify';

// Auto-detect environment
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isDevelopment 
    ? 'http://localhost:5000/api'  // Local development
    : window.location.origin + '/api';  // Production - same domain as frontend

console.log('🌐 API URL:', API_URL);
console.log('📍 Current host:', window.location.hostname);
console.log('🚀 Environment:', isDevelopment ? 'development' : 'production');

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token AND fix DELETE requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['x-auth-token'] = token;
        }
        
        // 🔥 CRITICAL FIX: Remove body/data from DELETE requests
        if (config.method?.toLowerCase() === 'delete') {
            delete config.data;
            // Also ensure no content-type that might cause JSON parsing
            delete config.headers['Content-Type'];
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors (keep as is)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const { response } = error;
        
        if (!response) {
            console.error('🌐 Network Error - Cannot reach server');
            console.error('Attempted URL:', error.config?.baseURL + error.config?.url);
            toast.error('Cannot connect to server. Please check your internet connection or try again later.');
        } else {
            switch (response.status) {
                case 401:
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    toast.error('Session expired. Please login again.');
                    window.location.href = '/login';
                    break;
                case 403:
                    toast.error('You do not have permission to perform this action.');
                    break;
                case 404:
                    toast.error('The requested resource was not found.');
                    break;
                case 400:
                    if (response.data.errors) {
                        const errors = response.data.errors.map(err => err.msg).join(', ');
                        toast.error(errors);
                    } else if (response.data.message) {
                        toast.error(response.data.message);
                    }
                    break;
                case 500:
                    toast.error('Server error. Please try again later.');
                    break;
                default:
                    toast.error('An error occurred. Please try again.');
            }
        }

        return Promise.reject(error);
    }
);

// 🔥 UPDATED Helper function for making API calls
export const makeApiCall = async (method, endpoint, data = null) => {
    try {
        const config = {
            method,
            url: endpoint,
        };
        
        // Only add data for POST and PUT requests
        if (method === 'POST' || method === 'PUT') {
            config.data = data;
            config.headers = {
                'Content-Type': 'application/json'
            };
        } 
        // For GET requests with query parameters
        else if (method === 'GET' && data) {
            config.params = data;
        }
        // For DELETE requests - NO DATA/BODY
        else if (method === 'DELETE') {
            // Explicitly no data/body for DELETE
            delete config.data;
            delete config.headers;
        }
        
        const response = await api(config);
        
        if (response.data.success === false) {
            throw new Error(response.data.message || 'API call failed');
        }
        
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Specific API methods
export const authAPI = {
    login: (email, password) => makeApiCall('POST', '/auth/login', { email, password }),
    register: (username, email, password) => makeApiCall('POST', '/auth/register', { username, email, password }),
    verify: () => makeApiCall('GET', '/auth/verify'),
};

// 🔥 UPDATED: Use a direct axios call for DELETE to avoid body issues
export const inventoryAPI = {
    getAll: () => makeApiCall('GET', '/items'),
    getById: (id) => makeApiCall('GET', `/items/${id}`),
    create: (data) => makeApiCall('POST', '/items', data),
    update: (id, data) => makeApiCall('PUT', `/items/${id}`, data),
    
    // FIXED: Use direct axios.delete without body
    delete: (id) => {
        return api.delete(`/items/${id}`)
            .then(response => response.data)
            .catch(error => {
                throw error;
            });
    },
    
    search: (query) => makeApiCall('GET', '/items/search', { q: query }),
    getStats: () => makeApiCall('GET', '/items/stats/summary'),
};

export default api;