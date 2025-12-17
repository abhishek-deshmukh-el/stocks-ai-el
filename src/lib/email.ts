/**
 * Email notification service
 * Configure environment variables for production use
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send email notification (mock implementation)
 * In production, replace with actual email service like Resend, SendGrid, etc.
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Mock email sending for development
    console.log('📧 Email Notification (Development Mode)');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('Body:', options.html);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In production, use a service like Resend:
    /*
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Stock Alerts <alerts@yourdomain.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    */
    
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
}

/**
 * Send stock volatility alert via email
 */
export async function sendStockAlertEmail(
  email: string,
  stockSymbol: string,
  currentPrice: number,
  stopLoss: number,
  stopLossPercentage: number,
  atr: number,
  recommendation: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .metric { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #667eea; }
          .metric-label { font-size: 14px; color: #6b7280; margin-bottom: 5px; }
          .metric-value { font-size: 24px; font-weight: bold; color: #1f2937; }
          .stop-loss { border-left-color: #ef4444; }
          .stop-loss .metric-value { color: #dc2626; }
          .recommendation { padding: 15px; margin: 20px 0; border-radius: 6px; text-align: center; font-weight: bold; font-size: 18px; }
          .rec-buy { background: #d1fae5; color: #065f46; }
          .rec-hold { background: #fef3c7; color: #92400e; }
          .rec-sell { background: #fee2e2; color: #991b1b; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">📈 Stock Volatility Alert</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Analysis for ${stockSymbol}</p>
          </div>
          <div class="content">
            <div class="metric">
              <div class="metric-label">Current Price</div>
              <div class="metric-value">$${currentPrice.toFixed(2)}</div>
            </div>
            
            <div class="metric">
              <div class="metric-label">Average True Range (ATR)</div>
              <div class="metric-value">$${atr.toFixed(2)}</div>
            </div>
            
            <div class="metric stop-loss">
              <div class="metric-label">Volatility Stop Loss</div>
              <div class="metric-value">$${stopLoss.toFixed(2)}</div>
              <div style="margin-top: 5px; font-size: 14px; color: #dc2626;">
                ${stopLossPercentage.toFixed(2)}% below current price
              </div>
            </div>
            
            <div class="recommendation rec-${recommendation.toLowerCase()}">
              Recommendation: ${recommendation}
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 6px; margin-top: 20px;">
              <h3 style="margin-top: 0;">What does this mean?</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Place your stop loss at <strong>$${stopLoss.toFixed(2)}</strong></li>
                <li>Risk per share: <strong>$${(currentPrice - stopLoss).toFixed(2)}</strong></li>
                <li>${
                  stopLossPercentage < 5
                    ? 'Low volatility - Tight stop, more stable stock'
                    : stopLossPercentage > 10
                    ? 'High volatility - Wide stop, riskier position'
                    : 'Moderate volatility - Standard risk level'
                }</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>This is an automated alert from your Stock Volatility Analyzer.</p>
              <p>⚠️ This is not financial advice. Always do your own research before making investment decisions.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `${stockSymbol} Volatility Alert - Stop Loss: $${stopLoss.toFixed(2)}`,
    html,
  });
}
