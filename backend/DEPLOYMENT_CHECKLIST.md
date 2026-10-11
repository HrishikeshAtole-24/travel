# ✅ Pre-Deployment Checklist

## 🔍 Verify Before Deploying

### **1. Environment Variables Ready** ✅

Copy this list - you'll paste in Render:

```
PORT=5000
NODE_ENV=production
DB_HOST=<your-supabase-host>
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=<supabase-db-password>
DB_SSL=true
AMADEUS_API_KEY=<amadeus-api-key>
AMADEUS_API_SECRET=<amadeus-api-secret>
AMADEUS_API_URL=https://test.api.amadeus.com
JWT_SECRET=<generate-a-long-random-secret>
EMAIL_USER=rishiatole4545@gmail.com
EMAIL_PASSWORD=<gmail-app-password>
EMAIL_FROM=rishiatole4545@gmail.com
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=<razorpay-key-secret>
RAZORPAY_WEBHOOK_SECRET=razorpay_webhook_secret
LOG_LEVEL=info
```

---

### **2. Files Check**

- [x] `.gitignore` exists and includes `.env`
- [x] `package.json` has `"start": "node src/server.js"`
- [x] `server.js` uses `process.env.PORT`
- [x] All dependencies in `package.json`

---

### **3. Database Check**

Your Supabase database should have:
- [x] Users table
- [x] Bookings table
- [x] Payments table
- [x] Travelers table
- [x] Acquirers table
- [x] Airport data (10,000+ airports)

**Verify:** Run locally first to ensure everything works!

---

## 📋 Deployment Steps

### **Step 1: GitHub** (5 min)

```bash
cd c:\Users\hp\hrishi_projects\travel\backend
git init
git add .
git commit -m "Backend deployment ready"

# Create new repo on GitHub: travel-booking-backend
git remote add origin https://github.com/YOUR_USERNAME/travel-booking-backend.git
git push -u origin main
```

### **Step 2: Render** (10 min)

1. https://dashboard.render.com
2. New + → Web Service
3. Connect GitHub repo
4. Configure:
   - Name: `travel-booking-api`
   - Build: `npm install`
   - Start: `npm start`
   - Type: Free
5. Add all environment variables (paste from above)
6. Create Web Service

### **Step 3: Wait** (3-5 min)

Watch the logs in Render dashboard.

### **Step 4: Test**

Visit: `https://your-app.onrender.com/api/health`

Should see:
```json
{
  "status": "ok",
  "database": "connected"
}
```

---

## 🎯 After Backend Deployment

**Save your backend URL:** `https://travel-booking-api-xxxx.onrender.com`

You'll need this for:
1. Frontend environment variables
2. Razorpay callback URLs
3. Testing API endpoints

---

## 🚨 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Build fails | Check package.json dependencies |
| Database error | Verify DB_PASSWORD (no special char issues) |
| Port error | Already handled (using process.env.PORT) |
| Module not found | Run `npm install` locally first |
| CORS error | Update after deploying frontend |

---

## 📞 Need Help?

**Render Docs:** https://render.com/docs/deploy-node-express-app
**Status Page:** https://status.render.com

---

## 🎉 Ready to Deploy?

1. [ ] Copied environment variables
2. [ ] Created GitHub repository
3. [ ] Pushed code to GitHub
4. [ ] Have Render account ready
5. [ ] Verified `.env` is in `.gitignore`

**Let's go! Start with Step 1: GitHub** 🚀
