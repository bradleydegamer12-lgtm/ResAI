# ResumeAI — AI-Powered Resume Builder

Build professional, ATS-optimized resumes with AI assistance.

## Features

- Email + Google Authentication
- 8 Resume Templates (Modern, Minimal, Professional, Executive, Creative, Student, Developer, Corporate)
- AI Writing Assistant (generate summaries, rewrite experience, fix grammar)
- AI Resume Scoring (0-100 with category breakdown)
- ATS Keyword Checker (compare resume vs job description)
- AI Career Chat Assistant
- Real-time Autosave with Offline Backup
- PDF Download
- Public Resume Sharing
- Drag-and-Drop Reordering
- Responsive Design (works on phone, tablet, desktop)
- PWA (installable as app)

## Setup

### 1. Create Firebase Project
- Go to [Firebase Console](https://console.firebase.google.com)
- Create a new project
- Enable Authentication (Email/Password + Google)
- Enable Cloud Firestore
- Enable Cloud Functions

### 2. Update Config
Edit `js/config.js` with your Firebase credentials.

### 3. Deploy Security Rules
```bash
firebase deploy --only firestore:rules,storage:rules
