# FocusDen 🎧 | Collaborative Virtual Study Rooms & Synced Pomodoro

FocusDen is a premium, web-based, distraction-free virtual study room platform designed to help students, developers, and writers stay consistent, focused, and accountable. 

Built with **React (Vite)** and a custom **Vanilla CSS** glassmorphism design system, it delivers a production-grade full-stack experience with secure User Authentication, Postgres relational storage, and real-time syncing via WebSockets—all running on a **100% free serverless architecture**.

---

## ⚡ Zero-Config Hybrid Mode (Evaluator-Friendly)
FocusDen features a **smart hybrid connection fallback**:
*   **Offline Tab-Sync Fallback (No Setup Needed):** If no environment variables are detected, the app automatically falls back to **sessionStorage & BroadcastChannel** synchronization. The evaluator can run `npm run dev` and test real-time chat, whiteboards, and timers immediately across tabs on their local machine without creating any databases.
*   **Production Cloud Mode:** Once you configure your Supabase URL & Key in a `.env` file, the app automatically upgrades to a production-grade cloud database with persistent profiles, email/password signup, and real-time multiplayer syncing across different networks.

---

## 🚀 Live Demo & Repository
*   **Live Deployment URL:** *[Insert Deployed Vercel/Netlify URL Here]*
*   **GitHub Repository:** *[Insert Public Repository URL Here]*

---

## ✨ Features Implemented

### 🔒 1. Production Authentication & Profiles
*   **Secure Email Signup/Login:** Full email & password signups with secure password requirements.
*   **Anonymous Guest Mode:** Instant anonymous authentication so evaluators can test the application with a single click.
*   **Auto-provision Profiles:** PostgreSQL triggers automatically provision profile items (XP, streaks, avatars) upon user registration.

### 🏢 2. Virtual Study Room Management
*   **Preloaded Study Rooms:** Seeded with standard study hubs (Lofi Beats, LeetCode Grind, Cozy Rainy Library).
*   **Launch Custom Rooms:** Modals to set up new rooms with custom tags, categories (Lofi, Coding, Quiet, General), and select between Pomodoro countdowns and general stopwatches.
*   **Search & Filter:** Find rooms quickly with text search and category tab toggles.

### ⏱️ 3. Synchronized Study Timer (Pomodoro & Stopwatch)
*   **Synced Timer Math:** Timer ticks down on the server. Starting, pausing, or resetting the timer updates the Postgres database and syncs all clients globally.
*   **Stateless Persistence:** If a user closes their browser and joins back, the timer is still ticking at the correct elapsed second.
*   **Audio Chimes:** Plays a chime to signal session completion.

### 💬 4. Interactive Live Chat Room
*   **Multi-Device Chat:** Instant WebSocket-powered text messaging.
*   **System Notifications:** Automated announcements in chat when a user joins, leaves, or adjusts the timer.
*   **Bubble Alignment:** User's own messages align to the right in high-contrast violet, and other study partners align to the left in slate grey.

### 📋 5. Synced Task Checklist
*   **Collaborative Checklist:** Add tasks to a shared checklist.
*   **Reactive Checkboxes:** Toggling checkmarks or deleting tasks updates the state for all active users in the room instantly.

### 🎨 6. Shared Whiteboard / Sketchpad
*   **Drawing Tools:** HTML5 Canvas drawing board supporting custom brush thickness (Small, Medium, Large) and color selectors.
*   **Real-time Canvas Sync:** Drawings replicate to other users' screens instantly. Canvas states persist in the database.

### 🏆 7. Gamification & Streak Dashboard
*   **User Progression:** Earn XP (10 XP per minute studied) to level up.
*   **Streak Tracker:** Tracks consecutive daily study sessions.
*   **Achievements & Badges:** Unlock badges like "Early Bird", "Deep Focus Master", "Lofi Addict", and "Social Scholar" as goals are reached.
*   **Offline Session Logger:** Allows users to manually log offline hours, updating their stats and streaks instantly.

---

## 🛠️ Tech Stack Used
*   **Core Framework:** [React 19](https://react.dev/) + [Vite](https://vite.dev/)
*   **Styling:** Modern **Vanilla CSS3** (glassmorphism overlays, custom scrollbars, spin keyframes).
*   **Icons:** [Lucide React](https://lucide.dev/)
*   **Backend & DB (Supabase):** 
    *   **Supabase Auth**: Secure email/password and anonymous guest sign-ins.
    *   **Supabase Database**: PostgreSQL relational database for messages, tasks, whiteboards, and user stats.
    *   **Supabase Realtime**: Postgres database change listeners for instant syncing.
    *   **Supabase Presence**: WebSocket-based online user state tracking.

---

## 📦 Project Setup & Local Running

### 1. Database Setup (Supabase)
To enable the Cloud database features:
1.  Go to [Supabase.com](https://supabase.com) and create a new project (completely free).
2.  In your Supabase project dashboard, click on the **SQL Editor** tab in the sidebar.
3.  Click **New Query**, copy the entire contents of the [schema.sql](file:///C:/Users/pc/.gemini/antigravity-ide/scratch/collaborative-study-room/schema.sql) file in this repository, paste it into the editor, and click **Run**. This will set up your tables, relationships, triggers, and seed data in 5 seconds.
4.  Navigate to **Settings > API** in your Supabase dashboard and copy your `Project URL` and `Anon Key`.

### 2. Run Locally
1.  **Clone the Repository & Install Dependencies:**
    ```bash
    git clone <your-repository-url>
    cd collaborative-study-room
    npm install
    ```
2.  **Configure Environment Variables:**
    Create a `.env` file in the project root:
    ```env
    VITE_SUPABASE_URL=your-supabase-url-here
    VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
    ```
3.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    Open your browser and navigate to `http://localhost:5173`. 
    *(Note: If you skip step 2, the app will run automatically in offline Broadcast Tab-Sync mode!)*

4.  **Build for Production:**
    ```bash
    npm run build
    ```
    This compiles the production-ready build to the `dist` directory.

---

## ☁️ Deployment Guide

### Deploy to Vercel (Free & Instant)
1. Install Vercel CLI: `npm install -g vercel`.
2. In the project root, run: `vercel`.
3. Follow the prompts to log in and select build configurations (Vite will be detected).
4. Add your **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** environment variables in your Vercel Project Settings under the **Environment Variables** tab.
5. Deploy to production: `vercel --prod`.
