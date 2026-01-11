# 🚀 Frontend Deployment Guide - Vercel

## ✅ Backend is Live!
**Backend URL:** `https://travel-booking-api-j4op.onrender.com`

Now let's deploy the frontend to Vercel!

---

## 📋 Step 1: Update Backend CORS (IMPORTANT!)

Before deploying frontend, we need to allow Vercel domain in backend CORS.

**After you deploy, you'll get a URL like:** `https://your-app.vercel.app`

We'll update CORS after deployment.

---

## 🌐 Step 2: Deploy Frontend to Vercel

### **Option A: Deploy via Vercel Dashboard (Recommended)**

1. Go to: **https://vercel.com**
2. Sign in with GitHub
3. Click **"New Project"**
4. Select your GitHub repository: `travel`
5. **Configure Project:**
   - **Root Directory:** `frontend`
   - **Framework Preset:** Next.js (auto-detected)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)

6. **Add Environment Variables:**

Click **"Environment Variables"** and add these:

```
NEXT_PUBLIC_API_BASE_URL=https://travel-booking-api-j4op.onrender.com/api
```

```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

(You'll update this after deployment with your actual Vercel URL)

```
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_Au81TcFRZWcmJD
```

7. Click **"Deploy"**

---

### **Option B: Deploy via Vercel CLI (Alternative)**

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Navigate to frontend
cd c:\Users\hp\hrishi_projects\travel\frontend

# Deploy
vercel
```

Follow the prompts:
- **Set up and deploy?** Y
- **Which scope?** Your account
- **Link to existing project?** N
- **Project name:** skywings-travel
- **Directory:** `./` (current)
- **Override settings?** N

After deployment, add environment variables:
```bash
vercel env add NEXT_PUBLIC_API_BASE_URL
# Paste: https://travel-booking-api-j4op.onrender.com/api

vercel env add NEXT_PUBLIC_RAZORPAY_KEY_ID  
# Paste: rzp_test_Au81TcFRZWcmJD
```

Then redeploy:
```bash
vercel --prod
```

---

## 🔧 Step 3: Update Backend CORS

After frontend deployment, you'll get a URL like:
```
https://skywings-travel-xxxx.vercel.app
```

**Update backend CORS:**

1. Go to GitHub: `backend/src/app.js`
2. Find the CORS section (around line 11-19)
3. Add your Vercel URL:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'https://skywings-travel-xxxx.vercel.app',  // Add this
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

4. Commit and push:
```bash
cd c:\Users\hp\hrishi_projects\travel
git add .
git commit -m "Update CORS for Vercel frontend"
git push origin main
```

Render will auto-redeploy backend with new CORS settings!

---

## 🔄 Step 4: Update Frontend Environment Variable

After deployment, update `NEXT_PUBLIC_APP_URL`:

**In Vercel Dashboard:**
1. Go to your project → Settings → Environment Variables
2. Edit `NEXT_PUBLIC_APP_URL`
3. Change to: `https://your-actual-vercel-url.vercel.app`
4. **Redeploy** (Vercel → Deployments → Latest → ... → Redeploy)

---

## 🎯 Step 5: Update Razorpay Callback URLs

**In Razorpay Dashboard:**

1. Go to: https://dashboard.razorpay.com
2. Settings → API Keys
3. Update Callback URLs:
   - Success URL: `https://your-vercel-url.vercel.app/payment-success`
   - Failure URL: `https://your-vercel-url.vercel.app/payment-failed`
   - Webhook URL: `https://travel-booking-api-j4op.onrender.com/api/payment/webhook`

---

## ✅ Step 6: Test Your Deployment

### **Test Backend:**
```
https://travel-booking-api-j4op.onrender.com/api/health
```

Should return:
```json
{
  "status": "ok",
  "database": "connected"
}
```

### **Test Frontend:**
```
https://your-vercel-url.vercel.app
```

Should load the homepage!

### **Test API Integration:**
1. Search for flights
2. Try to sign up/login
3. Make a test booking with Razorpay test card: `4111 1111 1111 1111`

---

## 🐛 Common Issues & Fixes

### **Issue: CORS Error**
**Fix:** Make sure you added your Vercel URL to backend CORS and redeployed

### **Issue: API calls fail**
**Fix:** Check `NEXT_PUBLIC_API_BASE_URL` is correct in Vercel env variables

### **Issue: 404 on routes**
**Fix:** Vercel handles Next.js routing automatically, no config needed

### **Issue: Environment variables not working**
**Fix:** 
1. All frontend env vars must start with `NEXT_PUBLIC_`
2. Redeploy after adding/changing env vars

---

## 📝 Environment Variables Summary

### **Vercel (Frontend):**
```
NEXT_PUBLIC_API_BASE_URL=https://travel-booking-api-j4op.onrender.com/api
NEXT_PUBLIC_APP_URL=https://your-vercel-url.vercel.app
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_Au81TcFRZWcmJD
```

### **Render (Backend) - Already Set:**
```
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://postgres.bbaxhfbntnfkpiqlnqiy:TravelApp2026SecurePass@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres
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
NODE_OPTIONS=--dns-result-order=ipv4first
```

---

## 🎉 What You'll Have After Deployment:

- ✅ **Backend:** https://travel-booking-api-j4op.onrender.com
- ✅ **Frontend:** https://your-vercel-url.vercel.app
- ✅ **Database:** Supabase PostgreSQL (connected)
- ✅ **Payments:** Razorpay TEST mode
- ✅ **API:** Amadeus flights
- ✅ **Email:** Gmail SMTP
- ✅ **HTTPS:** Automatic on both platforms
- ✅ **Auto-deploy:** Push to main → auto-deploy

---

## 🚀 Next Steps After Deployment:

1. **Test complete booking flow** with test card
2. **Submit to Razorpay KYC** for international payments
3. **Add custom domain** (optional)
4. **Enable Razorpay Live mode** after approval
5. **Switch to Amadeus Production API** when ready

---

## 📞 Quick Reference

**Deployment URLs:**
- Backend: https://travel-booking-api-j4op.onrender.com
- Frontend: https://vercel.com/dashboard (after deployment)

**Test Cards:**
- Success: `4111 1111 1111 1111`
- Failure: `4000 0000 0000 0002`
- CVV: Any 3 digits
- Expiry: Any future date

---

**Your travel platform is ready to go live! 🎊**
