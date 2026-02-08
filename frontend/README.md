# RealBench Pro Frontend

Modern, polished web interface for the RealBench Pro AI evaluation platform built with Next.js 14, React 18, TypeScript, and Tailwind CSS.

## Features

### Dashboard
- Real-time system health monitoring
- Top performing models overview
- Recent safety signals tracking
- Quick access to all major features
- Live statistics with trend indicators

### Leaderboard
- Comprehensive model rankings
- Top 3 podium visualization
- Filter by safety status (clean/flagged)
- Sort by score or evaluation count
- Detailed task performance metrics
- Safety and contamination flags

### Evaluation Launcher
- Interactive model selection
- Custom evaluation criteria builder
- Weight normalization tools
- Detection settings configuration:
  - Safety detection
  - Contamination detection
  - Sandbagging detection
- Real-time evaluation status tracking
- Progress monitoring

### Safety Dashboard
- Safety signal distribution charts
- Severity breakdown (Critical/High/Medium/Low)
- Signal type analysis
- Advanced filtering by severity and type
- Detailed evidence viewing
- Interactive data visualization with Recharts

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- RealBench Pro backend running on http://localhost:8000

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:3000 in your browser

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/                      # Next.js app router pages
│   ├── page.tsx             # Dashboard
│   ├── leaderboard/         # Leaderboard page
│   ├── evaluate/            # Evaluation launcher
│   ├── safety/              # Safety dashboard
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Global styles
├── components/              # Reusable UI components
│   ├── Button.tsx           # Button component with variants
│   ├── Card.tsx             # Card components
│   ├── Badge.tsx            # Badge and status indicators
│   └── Table.tsx            # Data table component
├── lib/                     # Utilities and services
│   └── api.ts               # API client and types
└── public/                  # Static assets
```

## API Integration

The frontend communicates with the FastAPI backend through a centralized API service layer ([lib/api.ts](lib/api.ts)) that provides:

- Type-safe API calls with TypeScript interfaces
- Automatic request/response handling
- Error handling and retry logic
- Environment-based configuration

### Key API Functions

```typescript
// Launch an evaluation
evaluateTask(request: EvaluateRequest): Promise<{ task_id: string }>

// Get task status
getTaskStatus(taskId: string): Promise<TaskStatus>

// Fetch leaderboard
getLeaderboard(): Promise<LeaderboardEntry[]>

// Get safety signals
getSafetySignals(params?: FilterParams): Promise<SafetySignal[]>

// System health
getSystemHealth(): Promise<HealthStatus>
```

## Components

### Button
Multi-variant button component with loading states:
- Variants: primary, secondary, danger, ghost
- Sizes: sm, md, lg
- Loading spinner support

### Card
Container components with optional headers and actions:
- `Card`: Basic card container
- `CardGrid`: Responsive grid layout
- `StatCard`: Statistic display with trends

### Badge
Status and label indicators:
- Variants: default, success, warning, danger, info
- `SafetyBadge`: Severity-specific styling
- `StatusBadge`: Auto-colored based on status

### Table
Data table with loading and empty states:
- Custom column rendering
- Sortable columns
- Responsive design
- Loading placeholders

## Styling

The UI uses a dark theme with:
- Slate color palette (slate-900 to slate-300)
- Blue accent color for primary actions
- Status colors: green (success), yellow (warning), red (danger)
- Gradient backgrounds
- Custom scrollbar styling
- Smooth transitions and animations

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8000/api/v1` |

## Development

### Running in Development Mode

```bash
npm run dev
```

The app will auto-reload on file changes.

### Type Checking

```bash
npx tsc --noEmit
```

### Linting

```bash
npm run lint
```

## Features in Detail

### Real-time Updates
The dashboard polls for updates every 2 seconds when evaluations are running, providing live progress tracking.

### Responsive Design
Fully responsive layout that works on:
- Desktop (1920px+)
- Laptop (1280px+)
- Tablet (768px+)
- Mobile (320px+)

### Data Visualization
Interactive charts using Recharts:
- Bar charts for signal type distribution
- Pie charts for severity breakdown
- Progress bars for scores and completion
- Custom tooltips and legends

### Accessibility
- Semantic HTML
- Keyboard navigation support
- ARIA labels where needed
- Color contrast compliance

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t realbench-frontend .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://backend:8000/api/v1 realbench-frontend
```

## Troubleshooting

### API Connection Issues
- Verify backend is running on http://localhost:8000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Look for CORS errors in browser console

### Build Errors
- Clear `.next` directory: `rm -rf .next`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 20+)

### Performance Issues
- Enable production mode: `npm run build && npm start`
- Check network tab for slow API calls
- Verify backend response times

## Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## License

MIT License - see LICENSE file for details
