/**
 * WhatsApp notification service using Twilio
 */

import { getCurrencySymbol } from "./constants";

interface WhatsAppOptions {
  to: string;
  message: string;
}

/**
 * Send WhatsApp notification via Twilio (Server-side only)
 * This should be called from API routes, not client components
 */
export async function sendWhatsApp(options: WhatsAppOptions): Promise<boolean> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    try {
      const { default: twilio } = await import("twilio");
      const client = twilio(accountSid, authToken);

      console.log("💬 Sending WhatsApp message via Twilio...");

      const messageConfig = {
        body: options.message,
        from: `whatsapp:${fromNumber}`,
        to: `whatsapp:${options.to}`,
      };

      const message = await client.messages.create(messageConfig);

      console.log("✅ WhatsApp message sent! SID:", message.sid);

      return true;
    } catch (twilioError: any) {
      // Check if it's a Twilio authentication error
      if (twilioError.status === 401 || twilioError.message?.includes("Authenticate")) {
        console.error("❌ Twilio Authentication Failed - Check your credentials");
        console.error("Account SID:", accountSid);
        console.error(
          "Auth Token:",
          authToken ? "Present (length: " + authToken.length + ")" : "Missing"
        );
      }
      throw twilioError;
    }
  } catch (error) {
    console.error("❌ WhatsApp sending failed:", error);
    return false;
  }
}

/**
 * Send stock volatility alert via WhatsApp
 */
export async function sendStockAlertWhatsApp(
  phoneNumber: string,
  stockSymbol: string,
  currentPrice: number,
  stopLoss: number,
  stopLossPercentage: number,
  atr: number,
  recommendation: string
): Promise<boolean> {
  const currency = getCurrencySymbol(stockSymbol);

  const message = `
🔔 *${stockSymbol} Volatility Alert*

📊 *Current Price:* ${currency}${currentPrice.toFixed(2)}
🛑 *Stop Loss:* ${currency}${stopLoss.toFixed(2)}
📉 *Distance:* ${stopLossPercentage.toFixed(2)}%
📈 *ATR (14-day):* ${currency}${atr.toFixed(2)}
⚠️ *Risk/Share:* ${currency}${(currentPrice - stopLoss).toFixed(2)}

💡 *Recommendation:* ${recommendation}

${
  recommendation === "BUY"
    ? "✅ *Low volatility* - Tight stop, stable stock"
    : recommendation === "SELL"
      ? "⚠️ *High volatility* - Wide stop, risky position"
      : "⚡ *Moderate volatility* - Standard risk level"
}
  `.trim();

  return sendWhatsApp({
    to: phoneNumber,
    message,
  });
}

/**
 * Validate phone number format (basic validation)
 */
export function validatePhoneNumber(phone: string): boolean {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // Check if it's a valid length (10-15 digits)
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Format phone number to E.164 format
 */
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  // Indian numbers (10 digits) - add +91
  if (digits.length === 10 && !digits.startsWith("1")) {
    return `+91${digits}`;
  }

  // US numbers (10 digits starting with area code)
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If already has country code
  if (digits.startsWith("91") && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.startsWith("1") && digits.length === 11) {
    return `+${digits}`;
  }

  // Otherwise, add + if not present
  return digits.startsWith("+") ? digits : `+${digits}`;
}
