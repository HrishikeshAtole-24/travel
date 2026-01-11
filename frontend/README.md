# SkyWings - Travel Booking Frontend 🛫

A production-ready Next.js travel booking platform with pure CSS3 styling. Built for flight bookings with a clean, modern UI inspired by Booking.com and MakeMyTrip.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## 🎨 Features

✅ **Homepage** - Hero with search widget + Popular destinations
✅ **Flight Search** - Round trip/One way + Filters
✅ **Search Results** - Flight cards + Sidebar filters
✅ **Booking Flow** - Passenger details + Summary
✅ **Payment** - Multiple payment methods (Razorpay/UPI/NetBanking)
✅ **My Bookings** - Booking history with status
✅ **Authentication** - Login/Signup with JWT
✅ **Pure CSS3** - No frameworks, fully responsive

## 📁 Structure

```
app/
├── components/        # Reusable UI components
├── search/           # Flight search results
├── booking/          # Booking form
├── payment/          # Payment gateway
├── confirmation/     # Success page
├── my-bookings/      # User bookings
└── auth/             # Login/Signup

lib/api/              # API client & config
```

## 🎯 Tech Stack

- Next.js 14+ (App Router)
- JavaScript (ES6+)
- Pure CSS3 (Variables, Grid, Flexbox)
- Fetch API for backend integration

## 🔌 Backend Integration

Connects to backend API at `http://localhost:5000/api`

Configure in `.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

## 🎨 Design System

- **Colors:** Blue (#0066FF), Green (#00C48C), Orange (#FF6B35)
- **Typography:** System fonts with responsive sizing
- **Spacing:** 4px base unit (0.25rem)
- **Responsive:** Desktop-first with mobile breakpoints

## 📱 Pages

1. **Homepage** (`/`) - Landing with search
2. **Search** (`/search?...`) - Flight results
3. **Booking** (`/booking`) - Traveler details
4. **Payment** (`/payment`) - Payment methods
5. **Confirmation** (`/confirmation`) - Success screen
6. **My Bookings** (`/my-bookings`) - User bookings
7. **Login** (`/auth/login`) - User login
8. **Signup** (`/auth/signup`) - User registration

## 🚀 Build & Deploy

```bash
# Build for production
npm run build

# Start production server
npm start

# Deploy to Vercel (recommended)
vercel deploy
```

## 📋 Environment Variables

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_key
```

## 🎯 Component Architecture

- **Client Components:** Interactive (search, forms, filters)
- **Server Components:** Static (footer, static sections)
- **Modular CSS:** Component-scoped styling
- **API Client:** Centralized with auth token management

---

**Built with ❤️ for Travel Booking Platform**
