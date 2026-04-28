# Deployment Guide

This guide provides instructions for deploying the NeuroPass application.

## 1. Backend Deployment (Render)

The backend is a Django application. We recommend using [Render](https://render.com) for deployment.

### Prerequisites
- A Render account.
- A PostgreSQL database (can be created on Render).

### Steps
1.  **Create a New Web Service**:
    - Connect your GitHub repository.
    - Select the `backend` directory as the Root Directory (or leave as root and adjust build/start commands).
    - **Language**: `Python`
    - **Build Command**: `pip install -r requirements.txt`
    - **Start Command**: `gunicorn backend.wsgi:application` (You may need to add `gunicorn` to your `requirements.txt`).
      - *Note*: If you prefer `uvicorn`, use `uvicorn backend.asgi:application --host 0.0.0.0 --port $PORT`.

2.  **Environment Variables**:
    In the Render dashboard, add the following environment variables:
    - `SECRET_KEY`: A long random string.
    - `DEBUG`: `False`
    - `DATABASE_URL`: Your PostgreSQL connection string (Render provides this if you create a database there).
    - `ALLOWED_HOSTS`: Your Render URL (e.g., `neuropass-api.onrender.com`).
    - `PINATA_JWT`: Your Pinata API token.
    - `SOLANA_RPC`: Solana RPC URL (e.g., Alchemy/QuickNode/Helius).
    - `WALLET_SECRET_KEY`: Backend minter wallet private key (byte array format).
    - `SOLANA_VERIFIER_KEY`: Backend verifier keypair (byte array format).
    - `GOOGLE_API_KEY`: Gemini API key.
    - `YARNGPT_API_URL`: https://yarngpt.ai/api/v1
    - `YARNGPT_API_KEY`: Your YarnGPT key.
    - `VIRUSTOTAL_API_KEY`: Your VirusTotal key.

3.  **Static Files**:
    - Add `whitenoise` to your `requirements.txt`.
    - Update `backend/settings.py` to include `whitenoise.middleware.WhiteNoiseMiddleware` in `MIDDLEWARE` (immediately after `SecurityMiddleware`).
    - Add `STATIC_ROOT = BASE_DIR / "staticfiles"` to `settings.py`.

4.  **Database Migrations**:
    - After the first deploy, use the Render Shell to run migrations:
      ```bash
      python manage.py migrate
      ```
    - Create a superuser:
      ```bash
      python manage.py createsuperuser
      ```

---

## 2. Frontend Deployment (Vercel)

The frontend is a Vite + React application. We recommend using [Vercel](https://vercel.com) for deployment.

### Steps
1.  **Import Project**:
    - Connect your GitHub repository.
    - Select the `frontend` folder as the Root Directory.
2.  **Configure Project**:
    - **Framework Preset**: `Vite`.
    - **Build Command**: `npm run build`.
    - **Output Directory**: `dist`.
3.  **Environment Variables**:
    - Ensure your `frontend/src/lib/api.js` uses an environment variable for the API base URL.
    - **Recommended Change**: Update `frontend/src/lib/api.js`:
      ```javascript
      const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      ```
    - Add `VITE_API_URL` to Vercel environment variables, pointing to your Render backend URL.

---

## 3. Post-Deployment Configuration

### CORS Settings
Update `backend/backend/settings.py` to include your Vercel URL in `CORS_ALLOWED_ORIGINS`:
```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'https://your-app.vercel.app', # Add this
]
```

### Solana Programs
Ensure your Solana program is deployed to Devnet and the program ID matches in `backend/core/anchor.py` and any frontend configuration.
