# 🚀 Backend Deployment Guide - Render.com

## 📋 Pre-Deployment Checklist

### ✅ What You Need:
- [x] Render.com account (you have this)
- [x] GitHub account (to push your code)
- [x] Supabase database (already configured)
- [x] Amadeus API credentials (already configured)
- [x] Razorpay API credentials (already configured)

---

## 🔧 Step 1: Prepare Your Code for Deployment

### **1.1 Create `.gitignore` (if not exists)**

Make sure these are in your `.gitignore`:

```
node_modules/
.env
.env.local
logs/
*.log
npm-debug.log*
.DS_Store
```

### **1.2 Update `package.json` Start Script**

✅ Your `package.json` already has the correct start script:
```json
"scripts": {
  "start": "node src/server.js"
}
```

---

## 📦 Step 2: Push Code to GitHub

### **2.1 Initialize Git (if not already done)**

```bash
cd c:\Users\hp\hrishi_projects\travel\backend
git init
```

### **2.2 Add Remote Repository**

Create a new repository on GitHub (e.g., `travel-booking-backend`), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/travel-booking-backend.git
```

### **2.3 Commit and Push**

```bash
git add .
git commit -m "Initial backend deployment setup"
git push -u origin main
```

**⚠️ IMPORTANT:** Make sure `.env` is in `.gitignore` so secrets are NOT pushed!

---

## 🌐 Step 3: Create Web Service on Render

### **3.1 Go to Render Dashboard**

1. Visit: https://dashboard.render.com
2. Click **"New +"** button
3. Select **"Web Service"**

### **3.2 Connect GitHub Repository**

1. Click **"Connect GitHub"**
2. Authorize Render to access your repositories
3. Select your `travel-booking-backend` repository

### **3.3 Configure Web Service**

Fill in these details:

| Field | Value |
|-------|-------|
| **Name** | `travel-booking-api` (or your choice) |
| **Region** | Choose closest to you (e.g., Singapore, Frankfurt) |
| **Branch** | `main` |
| **Root Directory** | (leave empty) |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | **Free** (for now) |

---

## 🔐 Step 4: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these **EXACT** environment variables:

### **Database Configuration (Supabase)**

```env
DB_HOST=db.bbaxhfbntnfkpiqlnqiy.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=Hrishikesh@$%2406
DB_SSL=true
```

### **Server Configuration**

```env
PORT=5000
NODE_ENV=production
```

### **Amadeus API (Test)**

```env
AMADEUS_API_KEY=Lhrlj073vKfxA5EB9ai52h1I82o7F7S9
AMADEUS_API_SECRET=oePorCGvIjGLEBPv
AMADEUS_API_URL=https://test.api.amadeus.com
```

### **JWT Secret**

```env
JWT_SECRET=skywings_prod_jwt_secret_key_2026_secure_token
```

**⚠️ Change this to a random strong key!** Generate one:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### **Email Configuration**

```env
EMAIL_USER=rishiatole4545@gmail.com
EMAIL_PASSWORD=uyxyfotrnchmwozb
EMAIL_FROM=rishiatole4545@gmail.com
```

### **Razorpay Payment Gateway**

```env
RAZORPAY_KEY_ID=rzp_test_Au81TcFRZWcmJD
RAZORPAY_KEY_SECRET=2Oi1Xf1iafgNBE1QDb1ACSIn
RAZORPAY_WEBHOOK_SECRET=razorpay_webhook_secret_change_this
```

### **Redis Configuration** (Optional - Skip for now)

```env
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
```

### **Logging**

```env
LOG_LEVEL=info
```

---

## 🚀 Step 5: Deploy

1. Scroll down and click **"Create Web Service"**
2. Render will:
   - Clone your repository
   - Install dependencies (`npm install`)
   - Start your server (`npm start`)
3. Wait 3-5 minutes for deployment

---

## ✅ Step 6: Verify Deployment

### **6.1 Get Your Backend URL**

After deployment, you'll get a URL like:
```
https://travel-booking-api-xxxx.onrender.com
```

### **6.2 Test Health Endpoint**

Open in browser or use curl:
```
https://your-render-url.onrender.com/api/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2026-01-11T...",
  "database": "connected"
}
```

### **6.3 Test Auth Endpoint**

```
https://your-render-url.onrender.com/api/auth/health
```

Should return success response.

---

## 🔒 Step 7: Update CORS for Frontend

After deployment, you need to update CORS to allow your frontend.

### **Option A: Update in Code**

In `backend/src/app.js`, update CORS:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-vercel-app.vercel.app'  // Add after deploying frontend
  ],
  credentials: true
}));
```

Then commit and push:
```bash
git add .
git commit -m "Update CORS for production"
git push origin main
```

Render will auto-deploy!

### **Option B: Use Environment Variable**

Add this env variable in Render:
```env
FRONTEND_URL=https://your-vercel-app.vercel.app
```

Then update `app.js`:
```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));
```

---

## 🎯 Step 8: Database Check

### **8.1 Verify Database Connection**

Your Supabase database should already have:
- ✅ All tables (users, bookings, payments, etc.)
- ✅ Airport data imported
- ✅ Standard status codes

### **8.2 Check Logs in Render**

1. Go to your service in Render Dashboard
2. Click **"Logs"** tab
3. Look for:
```
✅ Database connected successfully
✅ Server running on port 5000
```

---

## 🐛 Troubleshooting

### **Issue: Port Already in Use**

Render automatically assigns port. Don't hardcode port in `server.js`.

Should be:
```javascript
const PORT = process.env.PORT || 5000;
```

### **Issue: Database Connection Failed**

Check:
- ✅ DB_SSL=true is set
- ✅ Password doesn't have special characters (or URL encode them)
- ✅ Supabase IP whitelist allows Render IPs

### **Issue: Module Not Found**

Make sure `package.json` has all dependencies:
```bash
npm install
```

### **Issue: Environment Variables Not Loading**

- Restart the service in Render Dashboard
- Clear cache and redeploy

---

## 📊 Performance Tips

### **1. Use Redis for Caching (Optional)**

Add Redis from Render Dashboard:
- Go to "New +" → "Redis"
- Copy connection URL
- Add to env variables

### **2. Database Connection Pooling**

Already configured in your `database.js`:
```javascript
max: 20,  // Maximum connections
idleTimeoutMillis: 30000
```

### **3. Enable Auto-Deploy**

In Render Dashboard:
- Settings → Build & Deploy
- Enable "Auto-Deploy: Yes"

Now every push to `main` branch auto-deploys!

---

## 💰 Free Tier Limits

Render Free Tier includes:
- ✅ 750 hours/month (enough for one service)
- ✅ Automatic HTTPS
- ✅ Auto-deploy from GitHub
- ⚠️ Sleeps after 15 minutes of inactivity
- ⚠️ Cold start time: ~30 seconds

**Cold Start:** First request after sleep will be slow. Consider upgrading to paid tier ($7/month) for always-on.

---

## 🔄 Step 9: Update Frontend with Backend URL

After backend is deployed, update your frontend `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=https://travel-booking-api-xxxx.onrender.com/api
```

---

## 📝 Environment Variables Summary

Here's a **complete copy-paste list** for Render:

```env
# Server
PORT=5000
NODE_ENV=production

# Database (Supabase)
DB_HOST=db.bbaxhfbntnfkpiqlnqiy.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=Hrishikesh@$%2406
DB_SSL=true

# Amadeus API
AMADEUS_API_KEY=Lhrlj073vKfxA5EB9ai52h1I82o7F7S9
AMADEUS_API_SECRET=oePorCGvIjGLEBPv
AMADEUS_API_URL=https://test.api.amadeus.com

# JWT Secret (CHANGE THIS!)
JWT_SECRET=skywings_prod_jwt_secret_key_2026_secure_token

# Email
EMAIL_USER=rishiatole4545@gmail.com
EMAIL_PASSWORD=uyxyfotrnchmwozb
EMAIL_FROM=rishiatole4545@gmail.com

# Razorpay
RAZORPAY_KEY_ID=rzp_test_Au81TcFRZWcmJD
RAZORPAY_KEY_SECRET=2Oi1Xf1iafgNBE1QDb1ACSIn
RAZORPAY_WEBHOOK_SECRET=razorpay_webhook_secret_change_this

# Logging
LOG_LEVEL=info
```

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] `.env` is in `.gitignore`
- [ ] Web Service created on Render
- [ ] All environment variables added
- [ ] Deployment successful (check logs)
- [ ] Health endpoint works
- [ ] Database connection verified
- [ ] API endpoints tested
- [ ] CORS configured for frontend
- [ ] Frontend updated with backend URL

---

## 🎉 Next Steps

After backend deployment:
1. ✅ Test all API endpoints
2. ✅ Deploy frontend to Vercel
3. ✅ Update Razorpay callback URLs
4. ✅ Test complete booking flow
5. ✅ Submit for Razorpay KYC approval

---

## 📞 Support

**Render Docs:** https://render.com/docs
**Render Status:** https://status.render.com

---

**Your backend will be live at:** `https://travel-booking-api-xxxx.onrender.com` 🚀
