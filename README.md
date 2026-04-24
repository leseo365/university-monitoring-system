# University Monitoring System

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- Firebase Account

### Backend Setup
1. `cd backend`
2. `npm install`
3. Create Firebase project and download serviceAccountKey.json
4. Place serviceAccountKey.json in `backend/config/`
5. Update `.env` file
6. `npm run dev`

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. Update `src/config/firebase.js` with your Firebase config
4. `npm start`

## Features
- Multi-role authentication
- Course management
- Lecture scheduling
- Report generation with Excel export
- Attendance tracking
- Rating system
- Search functionality

## Extra Credit Features ✅
- Search across all modules
- Excel report generation and download
