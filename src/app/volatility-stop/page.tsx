/**
 * Volatility Stop Analysis Page
 * Analyze stocks using volatility-based trailing stops
 */

import VolatilityStopAnalyzer from "@/components/volatility-stop-analyzer";

export default function VolatilityStopPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Volatility Stop Analysis</h1>
          <p className="text-gray-600">
            Use historical data to calculate volatility-based trailing stop losses
          </p>
        </div>

        <VolatilityStopAnalyzer />

        <div className="mt-8 p-6 bg-white rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold mb-4">How It Works</h2>
          <div className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-semibold text-lg mb-2">What is Volatility Stop?</h3>
              <p>
                The Volatility Stop is a dynamic trailing stop-loss indicator that adjusts based on
                market volatility (measured by ATR - Average True Range). Unlike fixed percentage
                stops, it adapts to changing market conditions.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">How is it calculated?</h3>
              <ol className="list-decimal ml-6 space-y-2">
                <li>
                  <strong>ATR (Average True Range):</strong> Measures price volatility over a
                  specified period (default 14 days)
                </li>
                <li>
                  <strong>Stop Distance:</strong> Calculated as ATR × Multiplier (default 2.0)
                </li>
                <li>
                  <strong>Trailing Logic:</strong> In an uptrend, the stop loss only moves up; in a
                  downtrend, it only moves down
                </li>
                <li>
                  <strong>Trend Reversal:</strong> When price crosses the stop level, the trend
                  reverses
                </li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Signal Interpretation</h3>
              <ul className="list-disc ml-6 space-y-2">
                <li>
                  <strong>BUY:</strong> Stock is in uptrend with low volatility (stop distance &lt;
                  3%)
                </li>
                <li>
                  <strong>HOLD:</strong> Maintain position, monitor stop loss level
                </li>
                <li>
                  <strong>SELL:</strong> Consider exiting if price approaches or crosses stop loss
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Parameters</h3>
              <ul className="list-disc ml-6 space-y-2">
                <li>
                  <strong>ATR Period:</strong> Number of days to calculate volatility (14 is
                  standard)
                </li>
                <li>
                  <strong>Multiplier:</strong> How many ATRs away to set the stop (2.0 =
                  conservative, 3.0 = wider stops)
                </li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm">
                <strong>💡 Tip:</strong> The Volatility Stop is most effective in trending markets.
                In choppy, sideways markets, it may generate false signals. Always use in
                conjunction with other technical analysis tools.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
