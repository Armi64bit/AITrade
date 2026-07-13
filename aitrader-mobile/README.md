# AiTrader Mobile App

React Native (Expo) mobile application for the AiTrader crypto trading bot.

## Features

- **Dashboard** - Portfolio overview, balance, P&L, win rate, current position
- **Trading** - Live price chart, ensemble signals, position controls
- **AI Insights** - AI trading signals, market analysis, pair recommendations
- **Strategy** - Active strategy params, performance, history, optimization
- **History** - Trade history with filters, daily P&L, strategy performance
- **Settings** - Notifications, theme, API keys, data management

## Tech Stack

- **Framework**: Expo Router (React Native)
- **State Management**: Zustand + Persist
- **Navigation**: React Navigation 6 (Bottom Tabs + Stack)
- **Charts**: react-native-chart-kit + react-native-svg
- **Styling**: Custom theme with dark mode
- **API**: Axios + WebSocket

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── Text.tsx
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   └── Charts.tsx
├── screens/          # Screen components
│   ├── DashboardScreen.tsx
│   ├── TradingScreen.tsx
│   ├── AIInsightsScreen.tsx
│   ├── StrategyScreen.tsx
│   ├── HistoryScreen.tsx
│   └── SettingsScreen.tsx
├── navigation/       # Navigation setup
│   └── AppNavigator.tsx
├── services/         # API services
│   └── api.ts
├── store/            # Zustand store
│   └── useAppStore.ts
├── theme/            # Design system
│   └── index.ts
├── types/            # TypeScript types
│   └── index.ts
├── utils/            # Utility functions
│   └── format.ts
└── constants/        # App constants
    └── index.ts
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)

### Installation

```bash
cd aitrader-mobile
npm install
```

### Development

```bash
# Start Expo dev server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web
```

### Building

```bash
# Build APK for testing
npm run build:apk

# Build for production
eas build --platform android --profile production
eas build --platform ios --profile production
```

## API Integration

The app connects to the AiTrader backend at:
- **REST API**: `https://aitrade-production-ecba.up.railway.app/api`
- **WebSocket**: `wss://aitrade-production-ecba.up.railway.app/ws`

## Environment Variables

Create `.env` file:
```env
EXPO_PUBLIC_API_URL=https://aitrade-production-ecba.up.railway.app/api
EXPO_PUBLIC_WS_URL=wss://aitrade-production-ecba.up.railway.app/ws
```

## Key Features Implementation

### Dashboard
- Real-time balance, P&L, win rate
- Current position with entry/exit levels
- Mini price chart
- Quick action buttons

### Trading
- Candlestick chart with EMA overlays
- Ensemble strategy votes with confidence
- Position management (close position)
- Bot control (start/stop/optimize/train)

### AI Insights
- Tabbed interface (Insights / AI Signal / Deep Analysis)
- Live AI signals with confidence bars
- Market messages with color coding
- Pair recommendations

### Strategy
- Active strategy parameters grid
- Sharpe ratio with color coding
- Strategy history with activate/deactivate
- One-click optimization and ML training

### History
- Three tabs: All Trades / Daily P&L / Strategies
- Trade filtering (Wins/Losses/All)
- Daily P&L grouping
- Strategy performance comparison

## Theme

Custom dark theme with:
- Primary: Purple (#8B5CF6)
- Success: Green (#10B981)
- Warning: Amber (#F59E0B)
- Error: Red (#EF4444)
- Background: Dark navy (#0F0F1A)

## License

MIT