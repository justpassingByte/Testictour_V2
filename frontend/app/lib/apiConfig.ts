import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

const isServer = typeof window === 'undefined';
const baseURL = isServer 
  ? (process.env.INTERNAL_BACKEND_URL || (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '')}/api` : 'http://localhost:4000/api'))
  : (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '')}/api` : 'http://localhost:4000/api');

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});


// Add token to requests if available
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Let cookies handle authentication automatically
    // No need to manually add Authorization header from localStorage
    return config;
  },
  (error: AxiosError) => {
    // We don't log request errors here as they will be handled by the response interceptor
    return Promise.reject(error);
  }
);

// Add response logging and toast notifications for errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // We don't need to log successful responses in production
    return response;
  },
  (error: AxiosError) => {
    // Frontend client components will handle toast notifications for errors
    let errorMessage = "An unknown error occurred";
    if (error.response?.data && typeof error.response.data === 'object' && 'message' in error.response.data) {
        errorMessage = (error.response.data as { message: string }).message;
    } else if (error.message) {
        errorMessage = error.message;
    }
    return Promise.reject(new Error(errorMessage));
  }
);

export default api; 
