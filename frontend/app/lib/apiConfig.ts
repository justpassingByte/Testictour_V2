import axios, { AxiosHeaders, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

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


// Auto-remove Content-Type for FormData requests so the browser sets
// multipart/form-data with the correct boundary automatically.
// Without this, the axios default 'application/json' header overrides the FormData boundary.
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (config.data instanceof FormData) {
      // Delete from all header tiers so axios doesn't merge the instance default back in.
      // AxiosHeaders needs its own delete API; plain object deletion is not enough there.
      if (config.headers) {
        if (config.headers instanceof AxiosHeaders) {
          config.headers.delete('Content-Type');
        } else {
          delete (config.headers as any)['Content-Type'];
          delete (config.headers as any)['content-type'];
          delete (config.headers as any).post?.['Content-Type'];
          delete (config.headers as any).post?.['content-type'];
          delete (config.headers as any).common?.['Content-Type'];
          delete (config.headers as any).common?.['content-type'];
        }
      }
    }
    return config;
  },
  (error: AxiosError) => {
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
