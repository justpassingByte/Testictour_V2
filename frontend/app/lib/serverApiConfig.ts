import axios from 'axios';

// Server-side API client (no authentication needed for public endpoints)
const serverApi = axios.create({
  baseURL: process.env.INTERNAL_BACKEND_URL || (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '')}/api` : 'http://localhost:4000/api'),
  headers: {
    'Content-Type': 'application/json',
  },
});

export default serverApi;
