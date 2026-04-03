import { format } from 'date-fns';

const logger = {
  info: (message: string, context?: any) => {
    
      // console.log(`[INFO] ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')} - ${message}`, context || '');
    
  },
  debug: (message: string, context?: any) => {
    console.log(`[DEBUG] ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')} - ${message}`, context || '');
  },
  warn: (message: string, context?: any) => {
    console.warn(`[WARN] ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')} - ${message}`, context || '');
  },
  error: (message: string, error?: Error, context?: any) => {
    console.error(`[ERROR] ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')} - ${message}`, error, context || '');
  }
};

export default logger; 