# 🚀 SkyWings Frontend - Quick Start Guide

## ⚠️ Pre-requisites

1. **Node.js 18+** installed
2. **Minimum 500MB disk space** free
3. **Backend server** running at `http://localhost:5000`

## 📦 Installation Steps

### Step 1: Clean Install (if needed)
```bash
# If you see disk space errors, clean first:
cd frontend
rmdir /s /q node_modules
del package-lock.json

# Then install fresh
npm install
```

### Step 2: Environment Setup
```bash
# Create .env.local file in frontend directory
# Copy these lines:

NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key_here
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_GUEST_BOOKING=true
```

### Step 3: Start Development Server
```bash
npm run dev
```

### Step 4: Open Browser
```
http://localhost:3000
```

## ✅ Verification Checklist

### Backend Connection
1. ✅ Backend running at `http://localhost:5000`
2. ✅ Test backend health: `curl http://localhost:5000/api/health`

### Frontend Loading
1. ✅ Homepage loads with search widget
2. ✅ Header displays "SkyWings" logo
3. ✅ Popular Destinations section visible
4. ✅ Footer links present

### Navigation Test
1. ✅ Click "Sign In" → Goes to `/auth/login`
2. ✅ Click "Flights" → Goes to `/search`
3. ✅ Fill search form → Submit → See loading spinner

## 🐛 Troubleshooting

### Issue: "next is not recognized"
**Solution:** Run `npm install` first

### Issue: "ENOSPC: no space left"
**Solutions:**
1. **Clear npm cache:** `npm cache clean --force`
2. **Clear temp files:** Delete `C:\Users\hp\AppData\Local\Temp\*`
3. **Remove old node_modules:** Find and delete unused project folders
4. **Check disk space:** Run `wmic logicaldisk get size,freespace,caption`

### Issue: Port 3000 already in use
**Solution:**
```bash
# Windows: Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F

# Or use different port
npm run dev -- -p 3001
```

### Issue: Backend API not responding
**Solutions:**
1. Check backend is running: `cd backend && npm start`
2. Verify `.env.local` has correct API URL
3. Check browser console for CORS errors
4. Test backend: `curl http://localhost:5000/api/health`

### Issue: White screen / blank page
**Solutions:**
1. Open browser console (F12) → Check for errors
2. Hard refresh (Ctrl + Shift + R)
3. Clear browser cache
4. Check terminal for build errors

## 🧪 Testing Flow

### 1. Homepage Test
- ✅ Search widget visible
- ✅ Select "Round Trip"
- ✅ Enter: From "Delhi", To "Mumbai"
- ✅ Select dates (future dates)
- ✅ Click "Search Flights"

### 2. Search Results Test
- ✅ Loading spinner appears
- ✅ Flight cards display (if backend returns data)
- ✅ Filters sidebar visible
- ✅ Try changing filters
- ✅ Click "Select Flight" on any card

### 3. Booking Test
- ✅ Booking form loads
- ✅ Fill passenger details
- ✅ Enter email & phone
- ✅ Check booking summary on right
- ✅ Click "Continue to Payment"

### 4. Payment Test
- ✅ Payment methods visible
- ✅ Select payment method (radio buttons)
- ✅ Check booking summary
- ✅ Click "Proceed to Pay"

### 5. Confirmation Test
- ✅ Success icon shows
- ✅ Booking reference displays
- ✅ "View My Bookings" button works
- ✅ "Back to Home" button works

### 6. Auth Test
- ✅ Go to `/auth/signup`
- ✅ Fill signup form
- ✅ Submit → Redirects to login
- ✅ Login with credentials
- ✅ Redirects to homepage
- ✅ Header shows "My Trips" & "Logout"

### 7. My Bookings Test
- ✅ Login required (redirects if not logged in)
- ✅ Shows list of bookings
- ✅ Status badges display correctly
- ✅ Empty state if no bookings

## 📱 Responsive Test

### Desktop (1920×1080)
- ✅ Full layout with sidebar
- ✅ 3-column grids
- ✅ All spacing looks good

### Tablet (768×1024)
- ✅ Sidebar becomes top section
- ✅ 2-column grids
- ✅ Touch-friendly buttons

### Mobile (375×667)
- ✅ Single column layout
- ✅ Stacked forms
- ✅ Large touch targets
- ✅ Horizontal scroll prevented

## 🔌 API Integration Checklist

### Expected Backend Responses

#### Search Flight (POST `/api/flights/search`)
```json
{
  "success": true,
  "data": {
    "flights": [
      {
        "offerId": "OFFER_1",
        "supplier": "amadeus",
        "segments": [...],
        "price": {
          "total": 5000,
          "base": 4200,
          "taxes": 800,
          "currency": "INR"
        }
      }
    ]
  }
}
```

#### Create Booking (POST `/api/bookings/create-and-pay`)
```json
{
  "success": true,
  "data": {
    "bookingId": "BK123456",
    "bookingReference": "ABC123",
    "totalAmount": 5000,
    "status": "pending"
  }
}
```

#### My Bookings (GET `/api/bookings/my-bookings`)
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "BK123456",
        "bookingReference": "ABC123",
        "origin": "DEL",
        "destination": "BOM",
        "departureDate": "2025-01-15",
        "totalAmount": 5000,
        "status": "confirmed"
      }
    ]
  }
}
```

## 🎨 Customization Quick Guide

### Change Brand Colors
Edit `frontend/app/globals.css`:
```css
:root {
  --primary-color: #0066FF;      /* Your brand blue */
  --secondary-color: #00C48C;    /* Your brand green */
  --accent-color: #FF6B35;       /* Your brand orange */
}
```

### Change Logo
Edit `frontend/app/components/Header/Header.js`:
```javascript
// Replace SVG logo with your logo image
<img src="/logo.png" alt="Your Brand" />
```

### Change Site Name
Edit `frontend/app/layout.js`:
```javascript
export const metadata = {
  title: 'Your Brand - Travel Booking',
  description: 'Your description',
};
```

## 📊 Performance Tips

### Development
- Use `npm run dev` for hot reload
- Browser console shows errors immediately
- React DevTools extension helpful

### Production
```bash
# Build optimized bundle
npm run build

# Start production server
npm start

# Check bundle size
npm run build -- --profile
```

## 🚀 Deployment to Vercel

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit - SkyWings frontend"
git remote add origin <your-github-repo>
git push -u origin main
```

### Step 2: Import to Vercel
1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repo
4. **Root Directory:** Set to `frontend`
5. **Environment Variables:** Add from `.env.local`
6. Click "Deploy"

### Step 3: Configure Backend URL
After deployment, update:
```
NEXT_PUBLIC_API_BASE_URL=https://your-backend-url.com/api
```

## 📞 Support

### Common Questions

**Q: Why is search not working?**
A: Ensure backend is running and returning flight data. Check browser console for API errors.

**Q: Styles not loading?**
A: Hard refresh (Ctrl+Shift+R). Check if CSS files exist in each component folder.

**Q: Getting 401 errors?**
A: Token might be expired. Logout and login again.

**Q: Payment not processing?**
A: Payment integration requires Razorpay/Stripe setup in backend. Currently shows placeholder.

**Q: Images not showing?**
A: Add real images to `frontend/public/` folder. Currently using placeholder colors.

## 🎯 Next Steps

1. **Clear disk space** (if needed)
2. **Run `npm install`** in frontend directory
3. **Create `.env.local`** with API URL
4. **Start backend** server first
5. **Run `npm run dev`** to start frontend
6. **Open browser** at http://localhost:3000
7. **Test complete flow** from search to booking

---

## 🎉 You're All Set!

Once you complete these steps, you'll have a **fully functional travel booking platform** running locally!

**Need help?** Check the error messages in:
- Browser console (F12)
- Terminal output
- Backend logs

**Happy Coding! ✈️🚀**
