import { IUser } from '../types/user';
import api from '../lib/apiConfig';
import { InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';
import { useUserStore } from '@/app/stores/userStore';

// Add token to requests if available
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Do not add token for login or register routes
    if (config.url?.endsWith('/login') || config.url?.endsWith('/register')) {
      return config;
    }

    // With httpOnly cookies, the browser automatically sends the token.
    // No need to manually retrieve from localStorage or set Authorization header here.
    return config;
  },
  (error: AxiosError) => {
    // We don't log request errors here as they will be handled by the response interceptor
    return Promise.reject(error);
  }
);

// Add response logging and toast notifications for errors

export class AuthClientService {
  static async register(userData: { username: string; email: string; password: string; gameName?: string; tagName?: string; referrer?: string; region?: string }): Promise<IUser> {
    try {
      const response = await api.post('/auth/register', userData);
      const user: IUser = response.data.user;
      return user;
    } catch (err) {
      console.error('Error during registration:', err);
      throw new Error('Error during registration');
    }
  }

  static async login(credentials: { login: string; password: string }): Promise<{ user: IUser }> {
    console.log("[AuthClientService] login called with credentials:", credentials.login);
    try {
      const response = await api.post('/auth/login', credentials);
      console.log("[AuthClientService] API login response:", response.data);
      const user = response.data.user;
      useUserStore.getState().setCurrentUser(user);
      return response.data;
    } catch (err: any) {
      console.error("[AuthClientService] Error during login API call:", err);
      console.log("[AuthClientService] Full error object from API login:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      throw new Error(err.response?.data?.message || err.message || 'Error during login');
    }
  }

  static async logout(): Promise<void> {
    try {
      await api.post('/auth/logout'); // Call to backend to invalidate session/clear HttpOnly cookie
      localStorage.removeItem('authUser'); // Clear client-side stored user data
      useUserStore.getState().clearUser();
      // window.location.href = '/'; // Removed to prevent forced full page reload
    } catch (err) {
      console.error('Error during logout:', err);
      throw new Error('Error during logout');
    }
  }

  static async fetchCurrentUser(): Promise<IUser | null> {
    console.log("[AuthClientService] fetchCurrentUser called.");
    try {
      const response = await api.get('/auth/me');
      console.log("[AuthClientService] fetchCurrentUser success:", response.data.user);
      return response.data.user;
    } catch (err) {
      console.error("[AuthClientService] Error fetching current user:", err);
      // If fetching fails (e.g., token expired, no token), assume no user is logged in
      return null;
    }
  }
} 