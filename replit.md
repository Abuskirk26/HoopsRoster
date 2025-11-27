# Monday Night Hoops - Basketball Roster Management App

## Overview
A React-based web application for managing weekly Monday basketball games. Players can sign up, check roster status, and admins can manage teams and track game history.

## Key Features
- **Player Authentication**: PIN-based login system for existing players
- **Roster Management**: Track player availability (In/Out/Waitlist/Pending)
- **Tier System**: 3-tier priority system for managing sign-ups
- **Team Generation**: AI-powered balanced team creation using Google Gemini
- **Scoreboard**: Live score tracking during games
- **Google Sheets Integration**: Sync roster data with Google Sheets backend
- **Game History**: Archive and track historical game participation
- **Player Stats**: View game participation statistics

## Technology Stack
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **AI Integration**: Google Gemini API (@google/genai)
- **Icons**: Lucide React
- **Backend**: Google Apps Script (optional, for data persistence)

## Project Structure
```
├── src/
│   ├── components/        # React components
│   │   ├── PlayerCard.tsx
│   │   ├── PlayerForm.tsx
│   │   ├── Scoreboard.tsx
│   │   └── TeamBuilder.tsx
│   ├── services/          # API integrations
│   │   ├── geminiService.ts    # Gemini AI integration
│   │   └── sheetService.ts     # Google Sheets sync
│   ├── App.tsx            # Main application
│   ├── constants.ts       # Initial player data
│   └── types.ts           # TypeScript definitions
├── backend/
│   └── google_apps_script.js   # Google Sheets backend (optional)
└── vite.config.ts         # Vite configuration
```

## Environment Variables
- `VITE_GEMINI_API_KEY`: Google Gemini API key for AI features
  - Get your key at: https://aistudio.google.com/apikey

## Development
The app runs on port 5000 with Vite's dev server configured for Replit's environment:
- Host: 0.0.0.0:5000
- HMR configured for Replit's proxy environment

## Deployment
The app is configured for Replit's autoscale deployment:
- Build command: `npm run build`
- Run command: `npm run preview`

## Google Sheets Backend (Optional)
The app includes a Google Apps Script backend for data persistence:
1. Create a new Google Sheet
2. Deploy the script in `backend/google_apps_script.js` as a web app
3. Update the `HARDCODED_DB_URL` in `src/App.tsx` with your deployed script URL

The app works without Google Sheets using local storage, but syncing provides:
- Multi-device data persistence
- Audit logging
- Game history archival
- Player statistics tracking

## Recent Changes
- **2025-11-25**: Initial Replit setup
  - Configured Vite for Replit environment (port 5000, proxy support)
  - Set up Gemini API integration
  - Added .gitignore for Node.js project
  - Configured deployment settings

## User Preferences
None set yet.
