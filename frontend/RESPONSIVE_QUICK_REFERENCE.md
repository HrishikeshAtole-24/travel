# 📱 Quick Responsive Breakpoints Reference

## Media Query Breakpoints

```css
/* Extra Small Devices (Phones in portrait) */
@media (max-width: 480px) {
  /* 320px - 480px */
  /* iPhone SE, small Android phones */
}

/* Small Devices (Phones in landscape, small tablets) */
@media (max-width: 640px) {
  /* 481px - 640px */
  /* iPhone 14, standard phones */
}

/* Medium Devices (Tablets) */
@media (max-width: 768px) {
  /* 641px - 768px */
  /* iPad Mini, small tablets */
}

/* Large Tablets & Small Laptops */
@media (max-width: 1024px) {
  /* 769px - 1024px */
  /* iPad Pro, Surface */
}

/* Standard Laptops */
@media (max-width: 1280px) {
  /* 1025px - 1280px */
  /* Most laptops */
}

/* Large Screens */
@media (min-width: 1281px) {
  /* 1281px+ */
  /* Desktop monitors, large displays */
}
```

## Common Responsive Patterns Used

### 1. Grid Transformations
```css
/* Desktop: 4 columns */
.grid { grid-template-columns: repeat(4, 1fr); }

/* Tablet: 2 columns */
@media (max-width: 1024px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}

/* Mobile: 1 column */
@media (max-width: 768px) {
  .grid { grid-template-columns: 1fr; }
}
```

### 2. Sidebar Layouts
```css
/* Desktop: Sidebar + Content */
.layout { grid-template-columns: 280px 1fr; }

/* Mobile: Stacked */
@media (max-width: 1024px) {
  .layout { grid-template-columns: 1fr; }
}
```

### 3. Typography Scaling
```css
/* Fluid typography */
h1 { font-size: clamp(2rem, 5vw, 3rem); }
/* Scales from 2rem (32px) to 3rem (48px) based on viewport */
```

### 4. Touch Targets
```css
/* Desktop: Comfortable size */
.btn { padding: 12px 24px; }

/* Mobile: Larger for touch */
@media (max-width: 768px) {
  .btn { 
    padding: 16px 24px;
    min-height: 44px;
  }
}
```

### 5. Navigation Patterns
```css
/* Desktop: Horizontal menu */
.nav { display: flex; }

/* Mobile: Hidden, show hamburger */
@media (max-width: 768px) {
  .nav { display: none; }
  .mobile-toggle { display: block; }
}
```

## Utility Classes Available

```html
<!-- Hide on mobile -->
<div class="hide-mobile">Desktop only content</div>

<!-- Show only on mobile -->
<div class="show-mobile">Mobile only content</div>

<!-- Container with responsive padding -->
<div class="container">
  <!-- Auto adjusts padding based on screen size -->
</div>
```

## Component-Specific Breakpoints

### Flight Search Widget
- **1024px**: Switch to single column, hide swap button
- **768px**: Smaller inputs, responsive dropdown
- **480px**: Ultra-compact, icon-only tabs

### Flight Cards
- **1024px**: 3-column grid → 2-column
- **768px**: 2-column → 1-column, stacked layout
- **480px**: Ultra-compact details

### Header
- **1024px**: Condensed navigation
- **768px**: Hamburger menu activated
- **480px**: Minimal header, essential items only

### Search Results
- **1024px**: Hide sidebar
- **768px**: Stacked filters, full-width results
- **480px**: Compact result cards

## Testing Viewports

### In Chrome DevTools
1. Press `F12` or `Cmd+Opt+I` (Mac)
2. Click device toolbar icon (or `Cmd+Shift+M`)
3. Select preset devices or enter custom dimensions

### Recommended Test Sizes
- 375px × 667px (iPhone SE)
- 414px × 896px (iPhone 11 Pro)
- 430px × 932px (iPhone 14 Pro Max)
- 768px × 1024px (iPad)
- 1024px × 768px (iPad Landscape)
- 1280px × 720px (Laptop)
- 1920px × 1080px (Desktop)

## Performance Tips

1. **Mobile First**: Styles cascade from mobile → desktop
2. **Minimize Media Queries**: Use CSS Grid and Flexbox when possible
3. **Avoid Fixed Widths**: Use `max-width` instead of `width`
4. **Use Relative Units**: `rem`, `em`, `%`, `vw`, `vh` over `px`
5. **Test Real Devices**: Emulators don't catch everything

## Common Issues & Solutions

### Issue: Horizontal Scrolling
```css
/* Solution */
body { overflow-x: hidden; }
* { box-sizing: border-box; }
```

### Issue: Text Too Small on Mobile
```css
/* Solution: Minimum readable size */
body { font-size: clamp(13px, 2vw, 16px); }
```

### Issue: Buttons Too Small to Tap
```css
/* Solution: 44px minimum */
button { min-height: 44px; min-width: 44px; }
```

### Issue: Images Overflowing
```css
/* Solution */
img {
  max-width: 100%;
  height: auto;
  display: block;
}
```

### Issue: Fixed Positioning Issues
```css
/* Solution: Use sticky or relative positioning on mobile */
@media (max-width: 768px) {
  .fixed-element { position: relative; }
}
```

## Quick Checklist

- ✅ Viewport meta tag added
- ✅ All grids responsive
- ✅ Touch targets ≥ 44px
- ✅ Font sizes ≥ 13px
- ✅ No horizontal scroll
- ✅ Images flexible
- ✅ Forms full-width on mobile
- ✅ Navigation adapted
- ✅ Tested on real devices
- ✅ Performance optimized

---

**Quick Start**: Just resize your browser or use Chrome DevTools to see all the responsive magic in action! 🎨✨
