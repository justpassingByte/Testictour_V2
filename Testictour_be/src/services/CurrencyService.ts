import axios from 'axios';
import logger from '../utils/logger';

let cachedVndRate = 0;
let lastFetchTime: number = 0;
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

export default class CurrencyService {
  /**
   * Fetches the current USD to VND exchange rate.
   * Caches the result to avoid hitting rate limits.
   * Falls back to a default value if the API fails.
   */
  static async getUsdToVndRate(): Promise<number> {
    const now = Date.now();
    
    // Return cached value if it's still valid
    if (cachedVndRate > 0 && (now - lastFetchTime) < CACHE_DURATION_MS) {
      return cachedVndRate;
    }

    try {
      // Free public API for exchange rates based on USD
      const response = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 5000 });
      
      if (response.data && response.data.rates && response.data.rates.VND) {
        cachedVndRate = response.data.rates.VND as number;
        lastFetchTime = now;
        logger.info(`[CurrencyService] Fetched updated USD to VND rate: ${cachedVndRate}`);
        return cachedVndRate;
      } else {
        throw new Error('VND rate not found in response');
      }
    } catch (error: any) {
      logger.error(`[CurrencyService] Failed to fetch currency rate: ${error.message}`);
      
      // Fallback to expired cache if available
      if (cachedVndRate > 0) {
        logger.info('[CurrencyService] Using expired cached rate as fallback.');
        return cachedVndRate;
      }
      
      const fallbackRate = Number(process.env.MOMO_USD_VND_RATE) || 25000;
      logger.warn(`[CurrencyService] Using fallback USD/VND rate: ${fallbackRate}`);
      return fallbackRate;
    }
  }
}
