import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = 'https://cloudfinalprojectf25-5.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;
    
    if (response) {
      switch (response.status) {
        case 401:
          // unauthorized - token expired or invalid
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          toast.error('Session expired. Please login again.');
          window.location.href = '/login';
          break;
        
        case 403:
          // forbidden
          toast.error('You do not have permission to perform this action.');
          break;
        
        case 404:
          // not found
          toast.error('The requested resource was not found.');
          break;
        
        case 400:
          // bad request
          if (response.data.errors) {
            const errors = response.data.errors.map(err => err.msg).join(', ');
            toast.error(errors);
          } else if (response.data.message) {
            toast.error(response.data.message);
          }
          break;
        
        case 500:
          // server error
          toast.error('Server error. Please try again later.');
          break;
        
        default:
          // other errors
          toast.error('An error occurred. Please try again.');
      }
    } else if (error.message === 'Network Error') {
      toast.error('Network error. Please check your connection.');
    }

    return Promise.reject(error);
  }
);

// helper function for making API calls with better error handling
export const makeApiCall = async (method, endpoint, data = null) => {
  try {
    const response = await api({
      method,
      url: endpoint,
      data: method !== 'GET' ? data : undefined,
      params: method === 'GET' ? data : undefined,
    });
    
    if (response.data.success === false) {
      throw new Error(response.data.message || 'API call failed');
    }
    
    return response.data;
  } catch (error) {
    // error is already handled by interceptor
    throw error;
  }
};

// specific API methods
export const authAPI = {
  login: (email, password) => makeApiCall('POST', '/auth/login', { email, password }),
  register: (username, email, password) => makeApiCall('POST', '/auth/register', { username, email, password }),
  verify: () => makeApiCall('GET', '/auth/verify'),
};

export const inventoryAPI = {
  getAll: () => makeApiCall('GET', '/items'),
  getById: (id) => makeApiCall('GET', `/items/${id}`),
  create: (data) => makeApiCall('POST', '/items', data),
  update: (id, data) => makeApiCall('PUT', `/items/${id}`, data),
  delete: (id) => {
    // special handling for DELETE since it might not have a response body
    return api.delete(`/items/${id}`)
      .then(response => {
        // some APIs return empty response for DELETE
        if (response.status === 200 || response.status === 204) {
          return { success: true, message: 'Item deleted successfully' };
        }
        return response.data;
      })
      .catch(error => {
        throw error;
      });
  },
  search: (query) => makeApiCall('GET', '/items/search', { q: query }),
  getStats: () => makeApiCall('GET', '/items/stats/summary'),
};

export default api;