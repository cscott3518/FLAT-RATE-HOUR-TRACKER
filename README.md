# Flat Rate Hour Tracker (Vercel-ready)

A simple React/Vite web app to track flat-rate hours with fields for **RO**, **Date**, **Description**, and **Hours Flagged**. 
Data is saved to `localStorage`. Includes filtering, quick date ranges, edit/delete, and export/import (CSV/JSON).

## Local Development
1. Install Node.js LTS: https://nodejs.org
2. In this folder run:
   ```bash
   npm install
   npm run dev
   ```
3. Open the local URL shown (e.g., http://localhost:5173).

## Build
```bash
npm run build
npm run preview
```

## Deploy to Vercel
**Option A: Import Git Repository**
1. Create a new GitHub repo and push these files.
2. Go to https://vercel.com → New Project → Import your GitHub repo.
3. Vercel detects Vite automatically. Framework Preset: **Vite**. Build Command: `npm run build`. Output Directory: `dist`.
4. Click **Deploy**.

**Option B: Vercel CLI**
1. Install Vercel CLI: `npm i -g vercel` and run `vercel` in this folder.
2. On first run, Vercel will prompt for project settings and then deploy.
