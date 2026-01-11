# 🎯 QUICK DEPLOYMENT STEPS - Render Backend

## 📦 Step 1: Push to GitHub (5 minutes)

```bash
cd c:\Users\hp\hrishi_projects\travel\backend

# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "Backend ready for deployment"

# Add remote (create repo on GitHub first)
git remote add origin https://github.com/YOUR_USERNAME/travel-booking-backend.git

# Push
git push -u origin main
```

---

## 🌐 Step 2: Create Web Service on Render (5 minutes)

1. Go to: https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `travel-booking-api`
   - **Region:** Singapore/Frankfurt (closest to you)
   - **Branch:** `main`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

---

## 🔐 Step 3: Add Environment Variables

Click **"Advanced"** → Add these one by one:

### **Copy-Paste This Section:**

```
PORT=5000
NODE_ENV=production
DB_HOST=db.bbaxhfbntnfkpiqlnqiy.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=Hrishikesh@$%2406
DB_SSL=true
AMADEUS_API_KEY=Lhrlj073vKfxA5EB9ai52h1I82o7F7S9
AMADEUS_API_SECRET=oePorCGvIjGLEBPv
AMADEUS_API_URL=https://test.api.amadeus.com
JWT_SECRET=skywings_prod_jwt_secret_key_2026_secure_token
EMAIL_USER=rishiatole4545@gmail.com
EMAIL_PASSWORD=uyxyfotrnchmwozb
EMAIL_FROM=rishiatole4545@gmail.com
RAZORPAY_KEY_ID=rzp_test_Au81TcFRZWcmJD
RAZORPAY_KEY_SECRET=2Oi1Xf1iafgNBE1QDb1ACSIn
RAZORPAY_WEBHOOK_SECRET=razorpay_webhook_secret
LOG_LEVEL=info
```

**⚠️ Add each variable separately in Render UI!**

---

## 🚀 Step 4: Deploy

Click **"Create Web Service"** and wait 3-5 minutes.

---

## ✅ Step 5: Test Your Backend

Your URL will be: `https://travel-booking-api-xxxx.onrender.com`

### **Test Health:**
```
https://your-url.onrender.com/api/health
```

Should return:
```json
{
  "status": "ok",
  "database": "connected"
}
```

---

## 🎉 Done!

**Save Your Backend URL** - You'll need it for frontend deployment!

**Next:** Deploy frontend to Vercel (I'll guide you after this)

---

## ⚠️ Important Notes:

1. **Free tier sleeps after 15 min** - First request will be slow (~30s)
2. **Auto-deploys** on every GitHub push
3. **HTTPS** is automatic
4. **Logs** available in Render Dashboard

---

## 🔧 If Deployment Fails:

Check Render logs for:
- ❌ `Cannot find module` → Run `npm install` locally and push
- ❌ `Database connection failed` → Check DB_PASSWORD has no URL encoding issues
- ❌ `Port in use` → Already handled (using process.env.PORT)

---

**Questions? Let me know and I'll help! 🚀**
