/**
 * Market Hours Utility
 * Checks if US stock market is currently open
 * Can be used on both client and server side
 */

/**
 * US market holidays for 2025 (NYSE/NASDAQ)
 */
export const MARKET_HOLIDAYS_2025 = [
  '2025-01-01', // New Year's Day
  '2025-01-20', // Martin Luther King Jr. Day
  '2025-02-17', // Presidents' Day
  '2025-04-18', // Good Friday
  '2025-05-26', // Memorial Day
  '2025-06-19', // Juneteenth
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-11-27', // Thanksgiving
  '2025-12-25', // Christmas
];

/**
 * Check if US stock market is currently open
 * Market hours: 9:30 AM - 4:00 PM EST, Monday-Friday (excluding holidays)
 */
export function isMarketOpen(): boolean {
  // Get current time in EST
  const now = new Date();
  const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  // Check if weekend
  const dayOfWeek = estTime.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    console.log('🔴 Market closed: Weekend');
    return false;
  }
  
  // Check if holiday
  const dateString = estTime.toISOString().split('T')[0];
  if (MARKET_HOLIDAYS_2025.includes(dateString)) {
    console.log('🔴 Market closed: Holiday');
    return false;
  }
  
  // Check market hours (9:30 AM - 4:00 PM EST)
  const hours = estTime.getHours();
  const minutes = estTime.getMinutes();
  const currentTime = hours * 60 + minutes;
  
  const marketOpen = 9 * 60 + 30;  // 9:30 AM
  const marketClose = 16 * 60;      // 4:00 PM
  
  if (currentTime < marketOpen || currentTime >= marketClose) {
    console.log(`🔴 Market closed: Outside trading hours (Current: ${hours}:${minutes.toString().padStart(2, '0')} EST)`);
    return false;
  }
  
  console.log(`🟢 Market open (${hours}:${minutes.toString().padStart(2, '0')} EST)`);
  return true;
}

/**
 * Get next market open time
 */
export function getNextMarketOpen(): Date {
  const now = new Date();
  const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  let nextOpen = new Date(estTime);
  
  // Set to next 9:30 AM
  nextOpen.setHours(9, 30, 0, 0);
  
  // If it's past market hours today, move to tomorrow
  if (estTime.getHours() >= 16) {
    nextOpen.setDate(nextOpen.getDate() + 1);
  }
  
  // Skip weekends
  while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6) {
    nextOpen.setDate(nextOpen.getDate() + 1);
  }
  
  // Skip holidays
  let dateString = nextOpen.toISOString().split('T')[0];
  while (MARKET_HOLIDAYS_2025.includes(dateString)) {
    nextOpen.setDate(nextOpen.getDate() + 1);
    // Skip weekends again if holiday moved us there
    while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6) {
      nextOpen.setDate(nextOpen.getDate() + 1);
    }
    dateString = nextOpen.toISOString().split('T')[0];
  }
  
  return nextOpen;
}

/**
 * Get market status summary
 */
export function getMarketStatus(): {
  isOpen: boolean;
  nextOpen: Date;
  message: string;
} {
  const isOpen = isMarketOpen();
  const nextOpen = getNextMarketOpen();
  
  let message = '';
  if (isOpen) {
    message = 'Market is currently open for trading';
  } else {
    const timeUntilOpen = nextOpen.getTime() - Date.now();
    const hoursUntil = Math.floor(timeUntilOpen / (1000 * 60 * 60));
    message = `Market closed. Opens in ~${hoursUntil} hours`;
  }
  
  return {
    isOpen,
    nextOpen,
    message,
  };
}
