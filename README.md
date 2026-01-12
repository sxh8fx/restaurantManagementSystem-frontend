# The Overlook Restaurant - Frontend

This is the user interface for **The Overlook Restaurant**, a modern web application for dining reservations and food ordering. It features a clean, responsive design and a dedicated Admin Dashboard.

## 🛠️ Technology Stack
- **Framework:** React 18 + Vite
- **Styling:** CSS Modules / Vanilla CSS
- **State Management:** Context API
- **Routing:** React Router DOM
- **HTTP Client:** Axios

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### 1. Environment Setup
Create a `.env` file in the `frontend` root directory for local development:

```env
# Point this to your local backend or production URL
VITE_API_BASE_URL=http://localhost:8080/api
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Locally
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

## 📦 Building for Production

To create an optimized production build:

```bash
npm run build
```
The output will be in the `dist` folder.

## ☁️ Deployment (Vercel)

1.  Push this repo to GitHub.
2.  Import the project into Vercel.
3.  **Important:** Add the `VITE_API_BASE_URL` Environment Variable in Vercel settings, pointing to your deployed Backend URL (e.g., `https://your-backend.railway.app/api`).
4.  Deploy! 🚀

## 📂 Project Structure
- `/src/pages` - Main views (Login, Dashboard, Menu, Admin)
- `/src/components` - Reusable UI components
- `/src/context` - Auth and global state
- `/src/services` - API calls (Axios configuration)
- `/src/styles` - CSS files
- `/public` - Static assets (Logos, favicons)
