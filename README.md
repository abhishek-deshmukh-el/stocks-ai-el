# Stock Volatility Monitoring System

A Next.js application for automated stock volatility monitoring with WhatsApp alerts. Built with Next.js 15, TypeScript, Tailwind CSS, and shadcn/ui components.

## 🎯 Project Overview

This is an **automated stock monitoring system** that:

- Monitors 20 stocks (10 US + 10 India) from a watchlist
- Runs hourly batch jobs to calculate volatility stops using ATR (Average True Range)
- Sends WhatsApp notifications when volatility thresholds are triggered
- Provides a web dashboard for managing watchlists and monitoring batch jobs
- **Advanced Volatility Stop Analysis** with historical data and trailing stops
- **Requires authentication** - users must login with name and WhatsApp number

## 🔑 Authentication System

The app uses **MongoDB-backed authentication** with localStorage for session management:

- **Login Page** (`/login`) - Users enter name + WhatsApp number (10-15 digits)
- **MongoDB Persistence** - User data is stored in MongoDB database
- **Protected Routes** - All main pages require authentication
- **Auto-redirect** - Unauthenticated users redirected to login
- **Session Management** - Logout clears session and returns to login

### Database Setup

Before running the app, set up MongoDB:

1. **With Docker (Recommended)**:

   ```bash
   docker-compose up -d
   ```

   - MongoDB will run on `localhost:27017`
   - MongoDB Express GUI available at `http://localhost:8081`

2. **Or use MongoDB Atlas** (cloud, free tier available)
   - See [MONGODB_SETUP.md](./MONGODB_SETUP.md) for detailed instructions

3. **Configure `.env.local`** (already set up for Docker):
   ```
   MONGODB_URI=mongodb://admin:password123@localhost:27017/stocks-ai?authSource=admin
   ```

For detailed setup instructions, see [MONGODB_SETUP.md](./MONGODB_SETUP.md)

### Protected Pages

- `/dashboard` - Main hub with feature cards and navigation
- `/batch` - Batch job monitoring dashboard
- `/watchlist` - Manage stock watchlist (add/edit/delete)
- `/stocks` - View stock lists and subscribe to alerts
- `/volatility-stop` - **NEW** Advanced volatility stop analysis with historical data

## 📊 Core Features

### 1. Automated Batch Jobs

- **Hourly Monitoring**: Runs every hour automatically
- **20-Stock Watchlist**: 10 US stocks + 10 India stocks
- **ATR Calculation**: Uses Average True Range for volatility analysis
- **Smart Alerts**: Only notifies when volatility stops are triggered
- **Manual Trigger**: Can run batch jobs on-demand from dashboard

### 2. Stock Watchlist Management

- **Regional Separation**: US and India stock sections
- **CRUD Operations**: Add, edit, delete stocks from watchlist
- **Customizable Parameters**:
  - Stock symbol and name
  - Target price (optional)
  - ATR period (default: 14)
  - ATR multiplier (default: 2.0)
- **Real-time Updates**: Changes reflect immediately in batch jobs

### 3. Volatility Stop Analysis (NEW)

- **Historical Data Fetching**: Get historical data with specific date ranges using Twelve Data API
- **Dynamic Trailing Stops**: Calculate volatility-based stop losses that adjust with market conditions
- **Trend Detection**: Identify UPTREND/DOWNTREND automatically
- **Buy/Hold/Sell Signals**: Get actionable trading signals based on volatility
- **Interactive Dashboard**: Visualize stop levels and trends over time
- **Customizable Parameters**: Adjust ATR period and multiplier for your strategy

**Access at**: `http://localhost:3000/volatility-stop`

**API Endpoint**: `GET /api/stock/historical?symbol=AAPL&start_date=2025-01-01&end_date=2025-12-01`

For detailed documentation, see [VOLATILITY_STOP_GUIDE.md](./VOLATILITY_STOP_GUIDE.md)

### 3. WhatsApp Notifications

- **Twilio Integration**: Sends alerts via WhatsApp
- **Smart Triggers**: Only alerts on significant volatility events
- **User Subscriptions**: Users can subscribe with their WhatsApp number
- **Dev Mode**: Mock notifications during development

### 4. Stock Data Integration

- **Multi-Provider Support**:
  - **NSE India**: Native integration using `stock-nse-india` package for Indian stocks
  - **Alpha Vantage**: US stock data and fallback for global markets
  - **Finnhub**: Alternative data provider with real-time quotes
  - **Twelve Data**: Additional data source for comprehensive coverage
- **NSE Features**:
  - Real-time NSE stock prices
  - Historical OHLC data with date ranges
  - All NSE stock symbols listing
  - Market indices (NIFTY 50, NIFTY BANK, etc.)
  - Equity trade information (volume, statistics)
  - Batch fetching with parallel requests
- **Mock Data**: Development mode with fake data
- **Real-time Prices**: Fetches current stock prices
- **Historical Data**: Calculates ATR from price history
- **Service Architecture**: Unified interface for all providers

**📖 For detailed NSE integration documentation, see [NSE_INTEGRATION.md](./NSE_INTEGRATION.md)**

## 🏗️ Architecture

### Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.4.1
- **UI Components**: shadcn/ui
- **Package Manager**: Yarn
- **Port**: 5001 (changed from 5000)

### Key Files

```
src/
├── app/
│   ├── page.tsx           # Root redirect (login/dashboard)
│   ├── login/page.tsx     # Authentication page
│   ├── dashboard/page.tsx # Main hub (protected)
│   ├── batch/page.tsx     # Batch monitoring (protected)
│   ├── watchlist/page.tsx # Watchlist management (protected)
│   └── stocks/page.tsx    # Stock subscription (protected)
├── lib/
│   ├── auth.ts           # Authentication utilities
│   ├── batch-job.ts      # Batch job processor
│   ├── volatility.ts     # ATR calculations
│   ├── whatsapp.ts       # WhatsApp notifications
│   ├── stock-api.ts      # Stock data fetching
│   ├── constants.ts      # Stock watchlist config
│   └── services/         # Stock data service providers
│       ├── stock-orchestrator.service.ts  # Central orchestration service
│       ├── nse.service.ts              # NSE India (stock-nse-india)
│       ├── alphavantage.service.ts     # Alpha Vantage API
│       ├── finnhub.service.ts          # Finnhub API
│       └── twelvedata.service.ts       # Twelve Data API
└── components/ui/        # shadcn components
```

### Stock Watchlist Configuration

Defined in `src/lib/constants.ts`:

**US Stocks (10)**:

- AAPL, MSFT, GOOGL, AMZN, TSLA
- NVDA, META, JPM, V, WMT

**India Stocks (10)**:

- RELIANCE.NS, TCS.NS, HDFCBANK.NS, INFY.NS, ICICIBANK.NS
- HINDUNILVR.NS, ITC.NS, SBIN.NS, BHARTIARTL.NS, KOTAKBANK.NS

Each stock includes:

- `symbol`: Stock ticker
- `name`: Company name
- `targetPrice`: Optional price target
- `atrPeriod`: ATR calculation period (default: 14)
- `atrMultiplier`: Stop distance multiplier (default: 2.0)
- `region`: 'US' or 'INDIA'

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or later
- Yarn package manager
- **MongoDB** (via Docker, local installation, or MongoDB Atlas)
- Twilio account (for WhatsApp notifications)
- Stock API key (Alpha Vantage or Finnhub)

### Installation

1. Clone the repository

2. Install dependencies:

   ```bash
   yarn install
   ```

3. Start MongoDB:

   ```bash
   docker-compose up -d
   ```

4. Configure environment variables (see Environment Setup below)

### Development Server

Run the development server:

```bash
yarn dev
```

Open [http://localhost:5001](http://localhost:5001) in your browser.

**First Time Setup:**

1. Navigate to [http://localhost:5001](http://localhost:5001)
2. You'll be redirected to `/login`
3. Enter your name and WhatsApp number (10-15 digits)
4. Click "Login" to access the dashboard

### Building for Production

```bash
yarn build
yarn start
```

## 🔧 Environment Setup

Create a `.env.local` file in the root directory:

```bash
# WhatsApp Notifications (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886  # Twilio sandbox number

# Stock API (choose one)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
# OR
FINNHUB_API_KEY=your_finnhub_key
```

**Getting API Keys:**

- **Twilio**: Sign up at [twilio.com](https://www.twilio.com)
- **Alpha Vantage**: Free key at [alphavantage.co](https://www.alphavantage.co)
- **Finnhub**: Free key at [finnhub.io](https://finnhub.io)

## 📱 Usage Guide

### 1. Login

- Visit the app and enter your credentials
- Name + WhatsApp number (format: 10-15 digits)
- Session stored in localStorage

### 2. Dashboard Overview

- **Batch Monitor**: View automated monitoring status
- **Manage Watchlist**: Add/edit/delete stocks
- **Subscribe to Alerts**: Configure notification preferences
- **Logout**: Clear session and return to login

### 3. Manage Watchlist

- Navigate to `/watchlist`
- **Add Stock**: Click "Add New Stock" → select region → enter details
- **Edit Stock**: Click edit icon → modify parameters → save
- **Delete Stock**: Click trash icon → confirm deletion
- View stocks organized by region (US/India)

### 4. Monitor Batch Jobs

- Navigate to `/batch`
- View hourly job status and last run time
- **Manual Run**: Click "Run Batch Job Now"
- See real-time results and alerts
- Monitor all 20 stocks at once

### 5. Subscribe to Alerts

- Navigate to `/stocks`
- View complete stock list (US + India regions)
- Enter WhatsApp number to receive alerts
- Subscribe to all stocks or specific ones

## 🔄 Batch Job System

### How It Works

1. **Automatic Trigger**: Runs every hour (3600000ms)
2. **Data Fetch**: Gets current prices for all 20 stocks
3. **ATR Calculation**: Computes volatility using historical data
4. **Stop Calculation**: Determines volatility stop levels
5. **Alert Check**: Compares price vs. stop level
6. **Notification**: Sends WhatsApp alert if triggered
7. **Results Storage**: Logs all results for dashboard display

### Manual Execution

- Go to `/batch` page
- Click "Run Batch Job Now" button
- View real-time processing status
- See results immediately

### Customization

Edit `src/lib/constants.ts` to modify:

- Stock list
- ATR periods
- Multipliers
- Target prices

## 🎨 UI Components

Built with shadcn/ui. Installed components:

- `button` - Action buttons
- `card` - Content containers
- `input` - Form inputs
- `label` - Form labels
- `toast` - Notifications
- `table` - Data tables
- `badge` - Status indicators

### Adding New Components

```bash
npx shadcn@latest add <component-name>
```

Example:

```bash
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
```

Browse: [ui.shadcn.com](https://ui.shadcn.com)

## 📂 Project Structure (Detailed)

```
/Users/abhishekdeshmukh/Desktop/Temp/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Root - redirects to login/dashboard
│   │   ├── login/page.tsx        # Auth page - name + phone input
│   │   ├── dashboard/page.tsx    # Main hub - protected route
│   │   ├── batch/page.tsx        # Batch monitoring - protected
│   │   ├── watchlist/page.tsx    # Watchlist management - protected
│   │   ├── stocks/page.tsx       # Stock subscription - protected
│   │   ├── api/
│   │   │   └── watchlist/route.ts # API for watchlist CRUD
│   │   ├── layout.tsx            # Root layout with providers
│   │   └── globals.css           # Global styles + Tailwind
│   ├── components/
│   │   └── ui/                   # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── toast.tsx
│   │       ├── table.tsx
│   │       ├── badge.tsx
│   │       └── toaster.tsx
│   ├── lib/
│   │   ├── auth.ts              # Authentication utilities
│   │   ├── batch-job.ts         # Batch job processing logic
│   │   ├── volatility.ts        # ATR calculations
│   │   ├── whatsapp.ts          # WhatsApp notification service
│   │   ├── stock-api.ts         # Stock data fetching (APIs)
│   │   ├── constants.ts         # Watchlist configuration
│   │   └── utils.ts             # Utility functions
│   └── hooks/
│       └── use-toast.ts         # Toast notification hook
├── public/                      # Static assets
├── .env.local                   # Environment variables
├── .github/
│   └── copilot-instructions.md # Project context for Copilot
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS config
├── tsconfig.json               # TypeScript config
├── components.json             # shadcn/ui config
├── package.json                # Dependencies (using Yarn)
└── README.md                   # This file
```

## 🔐 Authentication Flow

```
User visits app
    ↓
Check localStorage for user
    ↓
Not authenticated → Redirect to /login
    ↓
Enter name + WhatsApp number
    ↓
Validate (10-15 digits)
    ↓
Store in localStorage
    ↓
Redirect to /dashboard
    ↓
Access protected routes (/batch, /watchlist, /stocks)
    ↓
Click Logout → Clear session → Back to /login
```

**Authentication Files:**

- `src/lib/auth.ts` - Core auth functions
  - `isAuthenticated()` - Check if user logged in
  - `getCurrentUser()` - Get user info from storage
  - `logout()` - Clear session

**Protected Route Pattern:**

```typescript
// In every protected page
useEffect(() => {
  if (!isAuthenticated()) {
    router.push("/login");
    return;
  }
  const user = getCurrentUser();
  if (user) {
    setUserName(user.name);
  }
}, [router]);
```

## 📊 Data Flow

### Stock Monitoring Flow

```
Hourly Timer (3600000ms)
    ↓
Load Watchlist (20 stocks)
    ↓
For each stock:
    ↓
Fetch current price (API or mock)
    ↓
Get historical data (14-day default)
    ↓
Calculate ATR (Average True Range)
    ↓
Calculate volatility stop = price - (ATR × multiplier)
    ↓
Check if price <= stop
    ↓
If triggered → Send WhatsApp alert
    ↓
Log result to console/dashboard
    ↓
Update UI with status
```

### Watchlist Management Flow

```
User adds stock
    ↓
Enter: symbol, name, region, target price, ATR params
    ↓
Validate inputs
    ↓
Add to local state (usStocks or indiaStocks)
    ↓
Store in constants.ts (dev) or database (prod)
    ↓
Batch job picks up next run
    ↓
User can edit/delete anytime
```

## 🛠️ Development Notes

### Package Manager

- **Using Yarn** (not npm)
- Install: `yarn add <package>`
- Remove: `yarn remove <package>`

### Port Configuration

- **Port 5001** (changed from 5000)
- Configured in: `package.json` scripts
- `yarn dev` starts on port 5001

### Batch Job Interval

- Default: **1 hour** (3600000ms)
- Change in `src/lib/batch-job.ts`
- Search for `setInterval(runBatchJob, 3600000)`

## 🐛 Common Issues & Solutions

### "Port 5001 already in use"

```bash
# Kill process on port 5001
lsof -ti:5001 | xargs kill -9
# Then restart
yarn dev
```

### "WhatsApp notifications not working"

1. Check `.env.local` has correct Twilio credentials
2. Confirm WhatsApp number format: +1234567890
3. Check Twilio sandbox is activated

### "Stock data not loading"

1. Verify API key in `.env.local`
2. Check API rate limits (Alpha Vantage: 5 calls/min)

### "Authentication not persisting"

1. Clear browser localStorage
2. Check console for errors
3. Verify `isAuthenticated()` returns boolean
4. Ensure login redirects to `/dashboard`

### "Batch jobs not running"

1. Check browser console for errors
2. Verify interval is set (check `batch-job.ts`)
3. Ensure watchlist has stocks
4. Check API availability

## 🚦 Available Scripts

- `yarn dev` - Start development server (port 5001)
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn lint` - Run ESLint
- `yarn type-check` - TypeScript type checking

## 📈 Future Enhancements

Potential improvements:

- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Real user authentication (NextAuth.js)
- [ ] Email notifications alongside WhatsApp
- [ ] Advanced charting (TradingView integration)
- [ ] Stock search with autocomplete
- [ ] Portfolio tracking
- [ ] Custom alert rules
- [ ] Historical alert logs
- [ ] Multi-user support
- [ ] Mobile app (React Native)

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp)
- [Alpha Vantage API](https://www.alphavantage.co/documentation/)
- [Finnhub API](https://finnhub.io/docs/api)

## 📄 License

MIT

---

**Project Context for AI Assistants:**

This is a **stock volatility monitoring system** with:

- Authentication (localStorage-based)
- 20-stock watchlist (10 US + 10 India)
- Hourly batch jobs with ATR calculations
- WhatsApp notifications via Twilio
- Protected routes requiring login
- Full CRUD for watchlist management
- Next.js 15, TypeScript, Tailwind, shadcn/ui
- Yarn package manager, port 5001

Key behaviors:

- All main routes (except `/login`) are protected
- Batch jobs run automatically every hour
- Stock data from APIs or mock in dev mode
- Regional separation: US vs India stocks
- User session in localStorage (name + WhatsApp number)
