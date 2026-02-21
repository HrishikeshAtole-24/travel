# 🔄 Keep-Active Service Setup Guide

This guide will help you set up automatic pinging to prevent **Supabase DB** and **Render** from going inactive.

## 📋 What We Created

```
backend/src/activateService/
├── keepAlive.controller.js  # Logic to ping DB
└── keepAlive.routes.js      # Route definitions
```

## 🎯 Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/keep-active-service` | Full health check - queries DB tables |
| `GET /api/keep-active-service/status` | Quick lightweight ping |

## ⚠️ Why External Cron is Needed

**Render Free Tier** stops the service after **15 minutes of inactivity**. So internal `node-cron` won't work because the server itself is down!

We need an **EXTERNAL** service to wake up the Render instance.

---

## 🚀 Setup Options (Choose One)

### Option 1: cron-job.org (Recommended - FREE)

1. Go to [cron-job.org](https://cron-job.org)
2. Create free account
3. Click **"Create Cronjob"**
4. Configure:
   - **Title:** `Travel API Keep Alive`
   - **URL:** `https://your-render-app.onrender.com/api/keep-active-service`
   - **Schedule:** Every 2 hours (or custom)
     - Minutes: `0`
     - Hours: `*/2` (every 2 hours)
   - **Request Method:** `GET`
5. Click **Create**

### Option 2: UptimeRobot (FREE)

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Create free account
3. Click **"Add New Monitor"**
4. Configure:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `Travel API Keep Alive`
   - **URL:** `https://your-render-app.onrender.com/api/keep-active-service`
   - **Monitoring Interval:** `5 minutes` (minimum on free tier)
5. Click **Create Monitor**

> 💡 UptimeRobot's 5-minute interval is great for keeping Render awake (won't sleep after 15 min)

### Option 3: GitHub Actions (FREE)

Create `.github/workflows/keep-alive.yml`:

```yaml
name: Keep Services Alive

on:
  schedule:
    # Run every 2 hours
    - cron: '0 */2 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Keep-Alive Endpoint
        run: |
          curl -X GET "https://your-render-app.onrender.com/api/keep-active-service" \
            -H "Accept: application/json"
          echo "Ping successful at $(date)"
```

---

## 🧪 Test Locally First

```bash
# Make sure backend is running
cd backend
npm run dev

# Test the endpoint
curl http://localhost:5000/api/keep-active-service
```

Expected response:
```json
{
  "status": "ALIVE",
  "message": "🚀 Services are active and running!",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": {
    "connected": true,
    "serverTime": "2024-01-15T10:30:00.000Z",
    "stats": {
      "airports": 8000,
      "users": 5,
      "bookings": 3
    }
  },
  "performance": {
    "responseTimeMs": 150,
    "status": "FAST"
  },
  "services": {
    "supabase": "ACTIVE",
    "render": "ACTIVE"
  }
}
```

---

## 📊 Monitoring

Check the Render logs to see keep-alive pings:
```
[KEEP-ALIVE] ✅ Ping successful - DB: 8000 airports, Response: 150ms
```

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Supabase still pausing | Increase cron frequency to hourly |
| Render cold start slow | First request takes ~30-60s, subsequent are fast |
| 500 errors | Check DB connection string in Render env vars |

---

## 📝 Summary

| Service | Problem | Solution |
|---------|---------|----------|
| **Supabase** | Pauses after 1 month inactivity | Ping queries the DB |
| **Render** | Sleeps after 15 min inactivity | External cron wakes it up |

Your URL to set up in cron:
```
https://YOUR-RENDER-APP.onrender.com/api/keep-active-service
```

Replace `YOUR-RENDER-APP` with your actual Render app name!
