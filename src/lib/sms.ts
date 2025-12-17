/**
 * SMS notification service
 * Configure environment variables for production use
 */

interface SMSOptions {
  to: string;
  message: string;
}

/**
 * Send SMS notification (mock implementation)
 * In production, replace with actual SMS service like Twilio, AWS SNS, etc.
 */
export async function sendSMS(options: SMSOptions): Promise<boolean> {
  try {
    // Mock SMS sending for development
    console.log('📱 SMS Notification (Development Mode)');
    console.log('To:', options.to);
    console.log('Message:', options.message);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In production, use a service like Twilio:
    /*
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    await client.messages.create({
      body: options.message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: options.to,
    });
    */
    
    return true;
  } catch (error) {
    console.error('SMS sending failed:', error);
    return false;
  }
}

/**
 * Send stock volatility alert via SMS
 */
export async function sendStockAlertSMS(
  phoneNumber: string,
  stockSymbol: string,
  currentPrice: number,
  stopLoss: number,
  stopLossPercentage: number,
  recommendation: string
): Promise<boolean> {
  const message = `
📈 ${stockSymbol} Volatility Alert

Current: $${currentPrice.toFixed(2)}
Stop Loss: $${stopLoss.toFixed(2)} (${stopLossPercentage.toFixed(2)}% down)
Risk: $${(currentPrice - stopLoss).toFixed(2)}/share

Recommendation: ${recommendation}

${
  recommendation === 'BUY'
    ? '✅ Low volatility - Stable stock'
    : recommendation === 'SELL'
    ? '⚠️ High volatility - Risky position'
    : '⚡ Moderate volatility'
}

Not financial advice. Trade responsibly.
  `.trim();

  return sendSMS({
    to: phoneNumber,
    message,
  });
}

/**
 * Validate phone number format (basic validation)
 */
export function validatePhoneNumber(phone: string): boolean {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Check if it's a valid length (10-15 digits)
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Format phone number to E.164 format
 */
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  
  // If no country code, assume US (+1)
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If already has country code
  if (digits.startsWith('1') && digits.length === 11) {
    return `+${digits}`;
  }
  
  // Otherwise, add + if not present
  return digits.startsWith('+') ? digits : `+${digits}`;
}
