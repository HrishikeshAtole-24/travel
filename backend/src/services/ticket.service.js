/**
 * E-Ticket PDF for SkyWings flight bookings.
 * Airline-style "E-Ticket & Itinerary Receipt": boarding-card per segment with a
 * scannable QR stub, passenger + ticket numbers, baggage, fare rules and receipt.
 *
 * Input itinerary comes from itinerary.service (supplier order > priced offer > summary).
 * Only WinAnsi characters are used so the built-in Helvetica renders everything.
 */

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const axios = require('axios');
const logger = require('../config/winstonLogger');

// Horizon palette
const C = {
  ink: '#0B1630',
  inkRaised: '#13213F',
  brand: '#1F5EFF',
  brandSubtle: '#EEF3FF',
  accent: '#FF6A3D',
  text: '#151B2E',
  text2: '#4E5872',
  text3: '#6B7590',
  border: '#E2E6EF',
  borderStrong: '#CBD2DF',
  subtle: '#F6F7FB',
  success: '#0B7A3B',
  successBg: '#E9F8EF',
  warning: '#B4740B',
  warningBg: '#FFF7E6',
  white: '#FFFFFF',
  onInkMuted: '#CBD2DF',
  sunrise300: '#FFAC8C'
};

const PAGE = { w: 595.28, h: 841.89, m: 40 };
const CONTENT_W = PAGE.w - PAGE.m * 2;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ---------- formatting (airport-local wall clock, no TZ shifting) ---------- */
const parts = (stamp) => {
  const m = typeof stamp === 'string' && stamp.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (m) return { y: +m[1], mo: +m[2], d: +m[3], hh: m[4], mm: m[5] };
  const t = typeof stamp === 'string' && stamp.match(/^(\d{2}):(\d{2})/);
  return t ? { hh: t[1], mm: t[2] } : null;
};
const fmtTime = (s) => { const p = parts(s); return p?.hh ? `${p.hh}:${p.mm}` : '--:--'; };
const fmtDate = (s, withDay = true) => {
  const p = parts(s);
  if (!p?.y) return '';
  const day = DAYS[new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay()];
  return `${withDay ? `${day}, ` : ''}${p.d} ${MONTHS[p.mo - 1]} ${p.y}`;
};
const fmtDuration = (min) => (min ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m` : '');
const money = (n, cur = 'INR') => {
  if (n === null || n === undefined || isNaN(n)) return '-';
  return `${cur} ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const clean = (s) => String(s ?? '').replace(/[^\x20-\x7E -ÿ–—•‘’“”]/g, '').trim();
const titleCase = (s) => clean(s).toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

/** Fetch an airline logo; PNG/JPEG only (pdfkit can't draw SVG). */
async function fetchLogo(url) {
  if (!url) return null;
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 4000 });
    const buf = Buffer.from(res.data);
    const isPng = buf[0] === 0x89 && buf[1] === 0x50;
    const isJpg = buf[0] === 0xff && buf[1] === 0xd8;
    return isPng || isJpg ? buf : null;
  } catch {
    return null;
  }
}

/* ---------- drawing helpers ---------- */
const overline = (doc, text, x, y, color = C.text3, opts = {}) =>
  doc.font('Helvetica-Bold').fontSize(6.5).fillColor(color).text(clean(text).toUpperCase(), x, y, { characterSpacing: 0.8, lineBreak: false, ...opts });

const roundRect = (doc, x, y, w, h, r, fill, stroke) => {
  doc.save().roundedRect(x, y, w, h, r);
  if (fill && stroke) doc.lineWidth(0.75).fillAndStroke(fill, stroke);
  else if (fill) doc.fill(fill);
  else doc.lineWidth(0.75).stroke(stroke);
  doc.restore();
};

/** Horizon mark: blue rounded square with a white plane (Lucide path) */
const drawMark = (doc, x, y, size) => {
  doc.save().roundedRect(x, y, size, size, size * 0.25).fill(C.brand);
  const s = (size * 0.62) / 24;
  doc.translate(x + size * 0.19, y + size * 0.19).scale(s)
    .path('M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z')
    .fill(C.white);
  doc.restore();
};

/** Small plane glyph on the route line */
const drawPlane = (doc, cx, cy, size, color) => {
  const s = size / 24;
  doc.save().translate(cx - size / 2, cy - size / 2).rotate(45, { origin: [size / 2, size / 2] }).scale(s)
    .path('M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z')
    .fill(color);
  doc.restore();
};

/**
 * Generate the e-ticket.
 * @param {Object} booking - { booking_reference, pnr, status, total_price, currency, created_at, travelers, payments, contact_email }
 * @param {Object} itinerary - normalized itinerary (itinerary.service)
 * @returns {Promise<Buffer>}
 */
async function generateTicketPDF(booking, itinerary) {
  const it = itinerary || { slices: [], baggage: [], tickets: [], airlineLocators: [], price: {} };
  const segments = it.slices.flatMap(s => s.segments);
  const logos = {};
  await Promise.all([...new Set(segments.map(s => s.airline?.logo).filter(Boolean))].map(async url => { logos[url] = await fetchLogo(url); }));

  const pnrs = it.airlineLocators?.length
    ? it.airlineLocators.map(a => a.pnr).filter(Boolean)
    : (booking.pnr ? [booking.pnr] : []);
  const qr = await QRCode.toBuffer(
    [`SKYWINGS ${booking.booking_reference}`, pnrs.length ? `PNR ${pnrs.join('/')}` : null,
      segments.map(s => `${s.flightNumber} ${s.departure.code}-${s.arrival.code} ${(s.departure.time || '').slice(0, 10)}`).join(' | ')]
      .filter(Boolean).join('\n'),
    { errorCorrectionLevel: 'M', margin: 0, width: 220, color: { dark: C.ink, light: '#FFFFFF' } }
  );

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: PAGE.m, bufferPages: true, info: { Title: `E-Ticket ${booking.booking_reference}`, Author: 'SkyWings' } });
      const buffers = [];
      doc.on('data', b => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      let y = 0;
      const ensure = (h) => { if (y + h > PAGE.h - 60) { doc.addPage(); y = PAGE.m; } };

      /* ================= HEADER ================= */
      doc.rect(0, 0, PAGE.w, 118).fill(C.ink);
      doc.save().circle(PAGE.w - 40, -30, 170).fillOpacity(0.18).fill(C.brand).restore();
      drawMark(doc, PAGE.m, 34, 30);
      doc.font('Helvetica-Bold').fontSize(18).fillColor(C.white).text('SkyWings', PAGE.m + 40, 40, { lineBreak: false });
      overline(doc, 'E-ticket & itinerary receipt', PAGE.m, 80, C.sunrise300);
      doc.font('Helvetica').fontSize(8.5).fillColor(C.onInkMuted)
        .text(`Issued ${fmtDate(new Date().toISOString().slice(0, 10), false)}`, PAGE.m, 93, { lineBreak: false });

      overline(doc, 'Booking reference', PAGE.w - PAGE.m - 220, 38, C.onInkMuted, { width: 220, align: 'right' });
      doc.font('Helvetica-Bold').fontSize(15).fillColor(C.white)
        .text(clean(booking.booking_reference), PAGE.w - PAGE.m - 300, 50, { width: 300, align: 'right', lineBreak: false });
      if (pnrs.length) {
        overline(doc, 'Airline PNR', PAGE.w - PAGE.m - 220, 80, C.onInkMuted, { width: 220, align: 'right' });
        doc.font('Helvetica-Bold').fontSize(14).fillColor(C.sunrise300)
          .text(pnrs.join(' / '), PAGE.w - PAGE.m - 220, 91, { width: 220, align: 'right', characterSpacing: 1.5, lineBreak: false });
      }

      /* ================= STATUS STRIP ================= */
      y = 134;
      const ticketed = it.tickets?.some(t => t.ticketNumber) || booking.ticket_number;
      roundRect(doc, PAGE.m, y, CONTENT_W, 30, 8, C.successBg);
      doc.circle(PAGE.m + 16, y + 15, 6).fill(C.success);
      doc.save().lineWidth(1.6).strokeColor(C.white).moveTo(PAGE.m + 13, y + 15).lineTo(PAGE.m + 15.5, y + 17.5).lineTo(PAGE.m + 19.5, y + 12.5).stroke().restore();
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.success)
        .text(ticketed ? 'CONFIRMED & TICKETED' : 'CONFIRMED', PAGE.m + 30, y + 10.5, { lineBreak: false });
      doc.font('Helvetica').fontSize(8.5).fillColor(C.text2)
        .text(it.supplierName ? `Fare supplied by ${it.supplierName}${it.supplierRef ? ` · Order ${clean(it.supplierRef)}` : ''}` : 'Show with a valid photo ID at check-in',
          PAGE.m + 180, y + 11, { width: CONTENT_W - 192, align: 'right', lineBreak: false });
      y += 48;

      /* ================= FLIGHTS ================= */
      it.slices.forEach((slice, si) => {
        ensure(40);
        const first = slice.segments[0];
        const stops = slice.segments.length - 1;
        doc.font('Helvetica-Bold').fontSize(11).fillColor(C.text)
          .text(`${si === 0 ? 'Departure' : 'Return'}  ·  ${clean(first?.departure.code)} to ${clean(slice.segments[slice.segments.length - 1]?.arrival.code)}`, PAGE.m, y, { lineBreak: false });
        doc.font('Helvetica').fontSize(9).fillColor(C.text3)
          .text(`${fmtDate(first?.departure.time) || 'Date on airline confirmation'}  ·  ${stops === 0 ? 'Non-stop' : `${stops} stop${stops > 1 ? 's' : ''}`}${slice.durationMinutes ? `  ·  ${fmtDuration(slice.durationMinutes)}` : ''}`,
            PAGE.m, y, { width: CONTENT_W, align: 'right', lineBreak: false });
        y += 20;

        slice.segments.forEach((seg, gi) => {
          const H = 150;
          ensure(H + 40);
          const stubW = 128;
          const mainW = CONTENT_W - stubW;
          roundRect(doc, PAGE.m, y, CONTENT_W, H, 12, C.white, C.border);

          // perforation between card and stub
          doc.save().dash(3, { space: 3 }).lineWidth(0.8).strokeColor(C.borderStrong)
            .moveTo(PAGE.m + mainW, y + 10).lineTo(PAGE.m + mainW, y + H - 10).stroke().undash().restore();
          doc.circle(PAGE.m + mainW, y, 7).fill(C.white); doc.circle(PAGE.m + mainW, y + H, 7).fill(C.white);
          doc.save().lineWidth(0.75).strokeColor(C.border)
            .path(`M ${PAGE.m + mainW - 7} ${y} A 7 7 0 0 0 ${PAGE.m + mainW + 7} ${y}`).stroke()
            .path(`M ${PAGE.m + mainW - 7} ${y + H} A 7 7 0 0 1 ${PAGE.m + mainW + 7} ${y + H}`).stroke().restore();

          // airline row
          const ax = PAGE.m + 18; const ay = y + 16;
          const logo = logos[seg.airline?.logo];
          if (logo) {
            roundRect(doc, ax, ay, 26, 26, 6, C.white, C.border);
            try { doc.image(logo, ax + 3, ay + 3, { fit: [20, 20], align: 'center', valign: 'center' }); } catch { /* bad image */ }
          } else {
            roundRect(doc, ax, ay, 26, 26, 6, C.brand);
            doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white).text(clean(seg.airline?.code), ax, ay + 9, { width: 26, align: 'center', lineBreak: false });
          }
          doc.font('Helvetica-Bold').fontSize(10.5).fillColor(C.text).text(clean(seg.airline?.name || seg.airline?.code), ax + 34, ay + 2, { lineBreak: false });
          doc.font('Helvetica').fontSize(8.5).fillColor(C.text3)
            .text(`${clean(seg.flightNumber)}${seg.operatingAirline ? `  ·  Operated by ${clean(seg.operatingAirline.name)}` : ''}${seg.aircraft ? `  ·  ${clean(seg.aircraft)}` : ''}`, ax + 34, ay + 15, { lineBreak: false });

          // cabin pill (right of airline row)
          const cabinTxt = `${clean(seg.cabin || it.cabin)}${seg.bookingClass ? `  ·  Class ${clean(seg.bookingClass)}` : ''}`;
          doc.font('Helvetica-Bold').fontSize(7.5);
          const pw = doc.widthOfString(cabinTxt) + 16;
          roundRect(doc, PAGE.m + mainW - 18 - pw, ay + 4, pw, 18, 9, C.brandSubtle);
          doc.fillColor(C.brand).text(cabinTxt, PAGE.m + mainW - 18 - pw, ay + 9.5, { width: pw, align: 'center', lineBreak: false });

          // route block
          const ry = y + 58;
          const colW = 150;
          const dep = seg.departure; const arr = seg.arrival;
          const depX = PAGE.m + 18; const arrX = PAGE.m + mainW - 18 - colW;
          doc.font('Helvetica-Bold').fontSize(26).fillColor(C.ink).text(clean(dep.code), depX, ry, { lineBreak: false });
          doc.font('Helvetica-Bold').fontSize(26).fillColor(C.ink).text(clean(arr.code), arrX, ry, { width: colW, align: 'right', lineBreak: false });
          doc.font('Helvetica-Bold').fontSize(13).fillColor(C.text).text(fmtTime(dep.time), depX, ry + 31, { lineBreak: false });
          doc.font('Helvetica-Bold').fontSize(13).fillColor(C.text).text(fmtTime(arr.time), arrX, ry + 31, { width: colW, align: 'right', lineBreak: false });
          doc.font('Helvetica').fontSize(8).fillColor(C.text2)
            .text(fmtDate(dep.time), depX, ry + 48, { width: colW, lineBreak: false })
            .text(fmtDate(arr.time), arrX, ry + 48, { width: colW, align: 'right', lineBreak: false });
          const placeLine = (p) => [clean(p.name || p.city), p.terminal ? `Terminal ${clean(p.terminal)}` : null].filter(Boolean).join('  ·  ');
          doc.font('Helvetica').fontSize(7.5).fillColor(C.text3)
            .text(placeLine(dep), depX, ry + 61, { width: colW, height: 20, ellipsis: true })
            .text(placeLine(arr), arrX, ry + 61, { width: colW, align: 'right', height: 20, ellipsis: true });

          // middle line with plane
          const lx1 = depX + 92; const lx2 = arrX + colW - 92; const ly = ry + 14;
          const mid = (lx1 + lx2) / 2;
          doc.font('Helvetica').fontSize(8).fillColor(C.text2).text(fmtDuration(seg.durationMinutes), lx1, ly - 14, { width: lx2 - lx1, align: 'center', lineBreak: false });
          doc.save().dash(2.5, { space: 2.5 }).lineWidth(1).strokeColor(C.borderStrong).moveTo(lx1, ly).lineTo(mid - 10, ly).moveTo(mid + 10, ly).lineTo(lx2, ly).stroke().undash().restore();
          doc.circle(lx1, ly, 2.5).lineWidth(1).stroke(C.text3);
          doc.circle(lx2, ly, 2.5).fill(C.brand);
          drawPlane(doc, mid, ly, 13, C.brand);
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.success).text('Non-stop', lx1, ly + 7, { width: lx2 - lx1, align: 'center', lineBreak: false });

          // stub: QR + references
          const sx = PAGE.m + mainW;
          doc.image(qr, sx + (stubW - 72) / 2, y + 18, { width: 72 });
          overline(doc, 'PNR', sx, y + 98, C.text3, { width: stubW, align: 'center' });
          doc.font('Helvetica-Bold').fontSize(11).fillColor(C.ink)
            .text(pnrs[0] || '-', sx, y + 108, { width: stubW, align: 'center', characterSpacing: 1.2, lineBreak: false });
          doc.font('Helvetica').fontSize(7).fillColor(C.text3)
            .text(clean(seg.flightNumber) + (seg.fareBasis ? ` · ${clean(seg.fareBasis)}` : ''), sx, y + 126, { width: stubW, align: 'center', lineBreak: false });

          y += H + 10;

          const lay = slice.layovers?.[gi];
          if (gi < slice.segments.length - 1 && lay) {
            roundRect(doc, PAGE.m + 40, y - 2, CONTENT_W - 80, 22, 11, C.warningBg);
            doc.font('Helvetica-Bold').fontSize(8).fillColor(C.warning)
              .text(`${fmtDuration(lay.minutes) || 'Connection'} layover in ${clean(lay.airportName || lay.airport)} (${clean(lay.airport)})`, PAGE.m + 40, y + 5, { width: CONTENT_W - 80, align: 'center', lineBreak: false });
            y += 30;
          }
        });
        y += 6;
      });

      if (!it.slices.length) {
        roundRect(doc, PAGE.m, y, CONTENT_W, 40, 10, C.subtle);
        doc.font('Helvetica').fontSize(9).fillColor(C.text2).text('Flight details are on the airline confirmation for this PNR.', PAGE.m, y + 15, { width: CONTENT_W, align: 'center' });
        y += 56;
      }

      /* ================= PASSENGERS ================= */
      const travelers = booking.travelers || [];
      ensure(60 + travelers.length * 30);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(C.text).text('Passengers', PAGE.m, y, { lineBreak: false });
      y += 18;
      const cols = [
        { label: 'Passenger', x: 0, w: 210 },
        { label: 'Type', x: 210, w: 80 },
        { label: 'E-ticket number', x: 290, w: 140 },
        { label: 'Seat', x: 430, w: CONTENT_W - 430 }
      ];
      roundRect(doc, PAGE.m, y, CONTENT_W, 22, 6, C.subtle);
      cols.forEach(c => overline(doc, c.label, PAGE.m + c.x + 12, y + 8, C.text3));
      y += 22;
      travelers.forEach((t, i) => {
        const name = `${clean(t.last_name).toUpperCase()}/${clean(t.first_name).toUpperCase()}${t.title ? ` ${clean(t.title).toUpperCase()}` : ''}`;
        const ticket = it.tickets?.find(k => k.name && k.name.toUpperCase().includes(clean(t.last_name).toUpperCase()))?.ticketNumber
          || it.tickets?.[i]?.ticketNumber || (i === 0 ? booking.ticket_number : null);
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.text).text(name, PAGE.m + 12, y + 9, { width: cols[0].w - 16, lineBreak: false, ellipsis: true });
        doc.font('Helvetica').fontSize(9).fillColor(C.text2).text(titleCase(t.traveler_type || 'Adult'), PAGE.m + cols[1].x + 12, y + 9, { lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(9).fillColor(ticket ? C.text : C.text3).text(ticket ? clean(ticket) : 'Pending', PAGE.m + cols[2].x + 12, y + 9, { lineBreak: false, characterSpacing: 0.4 });
        doc.font('Helvetica').fontSize(9).fillColor(C.text3).text('At check-in', PAGE.m + cols[3].x + 12, y + 9, { lineBreak: false });
        y += 28;
        doc.moveTo(PAGE.m, y).lineTo(PAGE.m + CONTENT_W, y).lineWidth(0.5).stroke(C.border);
      });
      y += 18;

      /* ================= BAGGAGE + FARE RULES ================= */
      ensure(110);
      const half = (CONTENT_W - 12) / 2;
      const boxH = 96;
      roundRect(doc, PAGE.m, y, half, boxH, 10, C.white, C.border);
      roundRect(doc, PAGE.m + half + 12, y, half, boxH, 10, C.white, C.border);
      overline(doc, 'Baggage allowance (per passenger)', PAGE.m + 14, y + 14);
      const bags = it.baggage?.length ? it.baggage : [{ type: 'info', description: 'As per airline policy for this fare' }];
      bags.slice(0, 4).forEach((b, i) => {
        const label = clean(b.description || (b.type === 'checked' ? 'Checked bag' : b.type === 'cabin' ? 'Cabin bag' : 'Personal item'));
        const detail = [b.pieces ? `${b.pieces} pc` : null, b.weightKg ? `${b.weightKg} kg` : null].filter(Boolean).join(' · ');
        doc.font('Helvetica').fontSize(8.5).fillColor(C.text).text(label, PAGE.m + 14, y + 30 + i * 15, { width: half - 90, lineBreak: false, ellipsis: true });
        if (detail) doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.text).text(detail, PAGE.m + 14, y + 30 + i * 15, { width: half - 28, align: 'right', lineBreak: false });
      });
      if (!it.baggage?.some(b => b.type === 'checked')) {
        doc.font('Helvetica').fontSize(7.5).fillColor(C.warning).text('No checked bag included - add one with the airline before travel.', PAGE.m + 14, y + boxH - 18, { width: half - 28, lineBreak: false, ellipsis: true });
      }

      const fx = PAGE.m + half + 26;
      overline(doc, 'Fare conditions', fx, y + 14);
      const rule = (label, ok, i) => {
        doc.font('Helvetica').fontSize(8.5).fillColor(C.text).text(label, fx, y + 30 + i * 15, { lineBreak: false });
        const v = ok === null || ok === undefined ? 'As per fare rules' : ok ? 'Allowed (fees may apply)' : 'Not allowed';
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(ok === false ? '#B4262B' : ok ? C.success : C.text2)
          .text(v, fx, y + 30 + i * 15, { width: half - 28, align: 'right', lineBreak: false });
      };
      doc.font('Helvetica').fontSize(8.5).fillColor(C.text).text('Fare', fx, y + 30, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.text).text(clean(it.fareFamily || it.cabin || 'Economy'), fx, y + 30, { width: half - 28, align: 'right', lineBreak: false });
      rule('Refund', it.refundable, 1);
      rule('Date / name change', it.changeable, 2);
      y += boxH + 18;

      /* ================= PAYMENT RECEIPT ================= */
      ensure(110);
      const cur = it.price?.currency || booking.currency || 'INR';
      const total = it.price?.total ?? booking.total_price;
      const base = it.price?.base;
      const taxes = it.price?.taxes ?? (base != null && total != null ? total - base : null);
      const pay = (booking.payments || []).find(p => ['SUCCESS', 'completed'].includes(p.status)) || booking.payments?.[0];
      roundRect(doc, PAGE.m, y, CONTENT_W, 92, 10, C.subtle);
      overline(doc, 'Payment receipt', PAGE.m + 16, y + 14);
      const rowR = (label, val, i, bold) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 10.5 : 9).fillColor(bold ? C.text : C.text2).text(label, PAGE.m + 16, y + 30 + i * 16, { lineBreak: false });
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 10.5 : 9).fillColor(C.text).text(val, PAGE.m + 16, y + 30 + i * 16, { width: 300, align: 'right', lineBreak: false });
      };
      if (base != null) rowR('Base fare', money(base, cur), 0);
      if (taxes != null) rowR('Taxes & fees', money(taxes, cur), 1);
      rowR('Total paid', money(total, cur), 2, true);
      const px = PAGE.m + 360;
      overline(doc, 'Paid via', px, y + 30);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text).text('Razorpay', px, y + 40, { lineBreak: false });
      if (pay?.payment_reference) {
        overline(doc, 'Payment reference', px, y + 58);
        doc.font('Helvetica').fontSize(8).fillColor(C.text2).text(clean(pay.payment_reference), px, y + 68, { width: CONTENT_W - 376, lineBreak: false, ellipsis: true });
      }
      y += 110;

      /* ================= GOOD TO KNOW ================= */
      const notes = [
        'Check in online on the airline website - usually opens 24 to 48 hours before departure.',
        'Reach the airport 2 hours before domestic and 3 hours before international departures.',
        'Carry a valid government photo ID (passport for international travel) matching the name above.',
        'Times are local to each airport. Check flight status with the airline on the day of travel.'
      ];
      ensure(20 + notes.length * 14);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(C.text).text('Good to know', PAGE.m, y, { lineBreak: false });
      y += 18;
      notes.forEach(n => {
        doc.circle(PAGE.m + 3, y + 4.5, 1.6).fill(C.brand);
        doc.font('Helvetica').fontSize(8.5).fillColor(C.text2).text(n, PAGE.m + 12, y, { width: CONTENT_W - 12 });
        y += 14;
      });

      /* ================= FOOTER (every page) ================= */
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.page.margins.bottom = 0; // footer sits below the content margin - don't auto-paginate
        const fy = PAGE.h - 46;
        doc.moveTo(PAGE.m, fy).lineTo(PAGE.w - PAGE.m, fy).lineWidth(0.5).stroke(C.border);
        drawMark(doc, PAGE.m, fy + 10, 14);
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.text).text('SkyWings', PAGE.m + 20, fy + 13, { lineBreak: false });
        doc.font('Helvetica').fontSize(7).fillColor(C.text3)
          .text(`Electronic ticket - no signature required.${process.env.SUPPORT_EMAIL ? `  Help: ${process.env.SUPPORT_EMAIL}` : ''}   Page ${i - range.start + 1} of ${range.count}`,
            PAGE.m + 80, fy + 14, { width: CONTENT_W - 80, align: 'right', lineBreak: false });
      }

      doc.end();
    } catch (error) {
      logger.error('[Ticket] PDF generation failed:', error.message);
      reject(error);
    }
  });
}

module.exports = { generateTicketPDF };
