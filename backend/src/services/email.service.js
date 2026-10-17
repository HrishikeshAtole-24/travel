/**
 * Email Service for SkyWings
 * Handles sending booking confirmations, tickets, and notifications
 */

const nodemailer = require('nodemailer');
const logger = require('../config/winstonLogger');

// Create transporter (use environment variables)
const createTransporter = () => {
  // Check for Gmail credentials first
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  
  // Fallback to SMTP settings
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Development: use ethereal email (fake SMTP)
  logger.warn('[Email] No email credentials configured. Emails will be logged only.');
  return null;
};

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

const FRONTEND_URL = () => (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

/** HTML-escape anything that came from users or suppliers */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Horizon email shell (table layout + inline styles for email clients)
 * @param {string} content - inner HTML
 * @param {'success'|'failed'} type - accent for the status line
 */
const generateEmailTemplate = (content, type = 'success') => {
  const supportLine = process.env.SUPPORT_EMAIL
    ? `Questions? Reply to this email or write to <a href="mailto:${esc(process.env.SUPPORT_EMAIL)}" style="color:#1F5EFF;text-decoration:none;">${esc(process.env.SUPPORT_EMAIL)}</a>.`
    : 'Questions? Reply to this email and our team will help.';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>SkyWings</title>
</head>
<body style="margin:0;padding:0;background:#F6F7FB;font-family:Inter,'Segoe UI',Helvetica,Arial,sans-serif;color:#151B2E;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7FB;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #E2E6EF;border-radius:20px;overflow:hidden;">
        <tr>
          <td style="background:#0B1630;padding:24px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="vertical-align:middle;">
                <span style="display:inline-block;width:30px;height:30px;line-height:30px;border-radius:8px;background:#1F5EFF;color:#FFFFFF;text-align:center;font-size:15px;font-weight:700;vertical-align:middle;">&#9992;</span>
                <span style="font-size:19px;font-weight:800;color:#FFFFFF;letter-spacing:-0.3px;vertical-align:middle;margin-left:8px;">SkyWings</span>
              </td>
              <td align="right" style="vertical-align:middle;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${type === 'success' ? '#6FDB9C' : '#FF8A8E'};">
                ${type === 'success' ? 'Booking confirmed' : 'Action needed'}
              </td>
            </tr></table>
          </td>
        </tr>
        <tr><td style="padding:32px;">${content}</td></tr>
        <tr>
          <td style="background:#F6F7FB;padding:20px 32px;border-top:1px solid #E2E6EF;font-size:12px;line-height:1.6;color:#6B7590;">
            ${supportLine}<br>
            <a href="${FRONTEND_URL()}/my-bookings" style="color:#1F5EFF;text-decoration:none;">My trips</a> &nbsp;·&nbsp;
            <a href="${FRONTEND_URL()}/terms-and-conditions" style="color:#1F5EFF;text-decoration:none;">Terms</a> &nbsp;·&nbsp;
            <a href="${FRONTEND_URL()}/privacy-policy" style="color:#1F5EFF;text-decoration:none;">Privacy</a><br>
            © ${new Date().getFullYear()} SkyWings Travel
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

/**
 * Generate booking confirmation email content
 */
const generateBookingConfirmationContent = (booking) => {
  const flightData = booking.flight_data || booking.flightData;
  const outboundSegment = flightData?.itineraries?.[0]?.segments?.[0];
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };
  
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const travelers = booking.travelers || [];
  const travelersList = travelers.map(t => 
    `<li style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
      ${t.title || ''} ${t.first_name} ${t.last_name} 
      <span style="color: #64748b; font-size: 13px;">(${t.traveler_type || 'Adult'})</span>
    </li>`
  ).join('');

  return `
    <!-- Success Badge -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: #f0fdf4; border: 2px solid #22c55e; border-radius: 50%; width: 80px; height: 80px; line-height: 76px; margin-bottom: 16px;">
        <span style="font-size: 40px;">✓</span>
      </div>
      <h2 style="color: #22c55e; font-size: 24px; font-weight: 700; margin-bottom: 8px;">
        Booking Confirmed!
      </h2>
      <p style="color: #64748b; font-size: 16px;">
        Thank you for choosing SkyWings
      </p>
    </div>

    <!-- Booking Reference -->
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">
        Booking Reference
      </p>
      <p style="color: white; font-size: 32px; font-weight: 700; letter-spacing: 3px; margin: 0;">
        ${booking.booking_reference}
      </p>
      <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin-top: 8px;">
        Please save this for check-in and support
      </p>
    </div>

    <!-- Flight Details -->
    <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 20px; display: flex; align-items: center;">
        ✈️ Flight Details
      </h3>
      
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="text-align: center; padding: 16px;">
            <p style="font-size: 28px; font-weight: 700; color: #1e293b; margin: 0;">
              ${outboundSegment?.departure?.iataCode || flightData?.origin || 'DEP'}
            </p>
            <p style="color: #2563eb; font-weight: 600; margin: 8px 0 4px;">
              ${formatTime(outboundSegment?.departure?.at)}
            </p>
            <p style="color: #64748b; font-size: 13px; margin: 0;">
              ${formatDate(outboundSegment?.departure?.at)}
            </p>
          </td>
          <td style="text-align: center; padding: 16px;">
            <p style="font-size: 24px; margin: 0;">✈️</p>
            <p style="color: #64748b; font-size: 12px; margin-top: 4px;">
              ${outboundSegment?.duration?.replace('PT', '').replace('H', 'h ').replace('M', 'm') || 'Direct'}
            </p>
          </td>
          <td style="text-align: center; padding: 16px;">
            <p style="font-size: 28px; font-weight: 700; color: #1e293b; margin: 0;">
              ${outboundSegment?.arrival?.iataCode || flightData?.destination || 'ARR'}
            </p>
            <p style="color: #2563eb; font-weight: 600; margin: 8px 0 4px;">
              ${formatTime(outboundSegment?.arrival?.at)}
            </p>
            <p style="color: #64748b; font-size: 13px; margin: 0;">
              ${formatDate(outboundSegment?.arrival?.at)}
            </p>
          </td>
        </tr>
      </table>

      ${outboundSegment?.carrierCode ? `
        <div style="border-top: 1px solid #e5e7eb; margin-top: 16px; padding-top: 16px; display: flex; justify-content: space-between;">
          <span style="color: #64748b; font-size: 14px;">Flight:</span>
          <span style="color: #1e293b; font-weight: 600;">${outboundSegment.carrierCode} ${outboundSegment.number}</span>
        </div>
      ` : ''}
      
      ${booking.pnr ? `
        <div style="display: flex; justify-content: space-between; margin-top: 12px;">
          <span style="color: #64748b; font-size: 14px;">PNR:</span>
          <span style="color: #2563eb; font-weight: 700; font-family: monospace; background: #eff6ff; padding: 4px 12px; border-radius: 4px;">${booking.pnr}</span>
        </div>
      ` : ''}
    </div>

    <!-- Passengers -->
    ${travelers.length > 0 ? `
      <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 16px;">
          👥 Passengers
        </h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${travelersList}
        </ul>
      </div>
    ` : ''}

    <!-- Total Price -->
    <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #166534; font-size: 16px; font-weight: 500;">Total Amount Paid</span>
      <span style="color: #22c55e; font-size: 24px; font-weight: 700;">
        ${booking.currency} ${parseFloat(booking.total_price).toLocaleString()}
      </span>
    </div>

    <!-- Important Info -->
    <div style="background: #eff6ff; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #1e293b; font-size: 16px; margin-bottom: 16px;">
        📋 Important Information
      </h3>
      <ul style="color: #475569; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
        <li>Web check-in opens <strong>48 hours</strong> before departure</li>
        <li>Carry a valid photo ID for domestic flights</li>
        <li>Carry your passport for international flights</li>
        <li>Reach the airport at least <strong>2 hours</strong> before departure</li>
      </ul>
    </div>

    <!-- CTA Buttons -->
    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-bookings" 
         style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 8px;">
        View My Bookings
      </a>
    </div>
  `;
};

/**
 * Generate payment failed email content
 */
const generatePaymentFailedContent = (booking, reason = 'Payment was declined') => {
  return `
    <!-- Failed Badge -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: #fef2f2; border: 2px solid #ef4444; border-radius: 50%; width: 80px; height: 80px; line-height: 76px; margin-bottom: 16px;">
        <span style="font-size: 40px;">✕</span>
      </div>
      <h2 style="color: #ef4444; font-size: 24px; font-weight: 700; margin-bottom: 8px;">
        Payment Failed
      </h2>
      <p style="color: #64748b; font-size: 16px;">
        We couldn't process your payment
      </p>
    </div>

    <!-- Error Details -->
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <p style="color: #dc2626; font-size: 14px; margin: 0;">
        <strong>Reason:</strong> ${reason}
      </p>
    </div>

    <!-- Booking Reference -->
    <div style="background: #f8fafc; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <p style="color: #64748b; font-size: 14px; margin-bottom: 8px;">
        Booking Reference
      </p>
      <p style="color: #1e293b; font-size: 24px; font-weight: 700; letter-spacing: 2px; margin: 0;">
        ${booking.booking_reference}
      </p>
      <p style="color: #64748b; font-size: 13px; margin-top: 12px;">
        Your booking is still reserved. Please try again.
      </p>
    </div>

    <!-- What You Can Do -->
    <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #1e293b; font-size: 16px; margin-bottom: 16px;">
        💡 What you can do:
      </h3>
      <ul style="color: #475569; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
        <li>Check your card details and try again</li>
        <li>Use a different payment method</li>
        <li>Ensure sufficient balance in your account</li>
        <li>Contact your bank if the issue persists</li>
      </ul>
    </div>

    <!-- CTA Buttons -->
    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-bookings" 
         style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 8px;">
        Try Payment Again
      </a>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/contact" 
         style="display: inline-block; background: white; color: #2563eb; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 8px; border: 2px solid #2563eb;">
        Contact Support
      </a>
    </div>
  `;
};

/**
 * Send booking confirmation email
 */
const sendBookingConfirmation = async (booking, email) => {
  try {
    const transport = getTransporter();
    
    if (!transport) {
      logger.info(`[Email] Would send confirmation to ${email} for booking ${booking.booking_reference}`);
      return { success: true, message: 'Email logged (no transport configured)' };
    }

    const content = generateBookingConfirmationContent(booking);
    const html = generateEmailTemplate(content, 'success');

    const mailOptions = {
      from: `"SkyWings" <${process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@skywings.com'}>`,
      to: email,
      subject: `✈️ Booking Confirmed - ${booking.booking_reference} | SkyWings`,
      html: html
    };

    const info = await transport.sendMail(mailOptions);
    logger.info(`[Email] Confirmation sent to ${email} for booking ${booking.booking_reference}`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('[Email] Failed to send confirmation:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send payment failed email
 */
const sendPaymentFailed = async (booking, email, reason) => {
  try {
    const transport = getTransporter();
    
    if (!transport) {
      logger.info(`[Email] Would send payment failed to ${email} for booking ${booking.booking_reference}`);
      return { success: true, message: 'Email logged (no transport configured)' };
    }

    const content = generatePaymentFailedContent(booking, reason);
    const html = generateEmailTemplate(content, 'failed');

    const mailOptions = {
      from: `"SkyWings" <${process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@skywings.com'}>`,
      to: email,
      subject: `⚠️ Payment Failed - ${booking.booking_reference} | SkyWings`,
      html: html
    };

    const info = await transport.sendMail(mailOptions);
    logger.info(`[Email] Payment failed email sent to ${email} for booking ${booking.booking_reference}`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('[Email] Failed to send payment failed email:', error.message);
    return { success: false, error: error.message };
  }
};

/* ================= Flight e-ticket email (itinerary + PDF attachment) ================= */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const stampTime = (s) => (typeof s === 'string' && s.match(/T(\d{2}:\d{2})/) ? s.match(/T(\d{2}:\d{2})/)[1] : (s && /^\d{2}:\d{2}/.test(s) ? s.slice(0, 5) : '--:--'));
const stampDate = (s) => {
  const m = typeof s === 'string' && s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return `${DAYS[d.getUTCDay()]}, ${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}`;
};
const dur = (min) => (min ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m` : '');
const inr = (n, cur = 'INR') => (n === null || n === undefined || isNaN(n) ? '-' : `${cur === 'INR' ? '&#8377;' : `${esc(cur)} `}${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);

function flightTicketContent(booking, it) {
  const segs = (it?.slices || []).flatMap(s => s.segments);
  const last = segs[segs.length - 1];
  const destination = last?.arrival?.city || (last?.arrival?.name || '').replace(/\s+(International\s+)?Airport.*$/i, '') || last?.arrival?.code || 'your trip';
  const pnrs = it?.airlineLocators?.length ? it.airlineLocators.map(a => a.pnr) : (booking.pnr ? [booking.pnr] : []);

  const segRows = segs.map(s => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E6EF;border-radius:14px;margin-bottom:12px;">
      <tr><td style="padding:14px 18px 0;font-size:13px;color:#4E5872;">
        <strong style="color:#151B2E;">${esc(s.airline?.name || s.airline?.code)}</strong> &nbsp;·&nbsp; ${esc(s.flightNumber)} &nbsp;·&nbsp; ${esc(s.cabin || it.cabin)}
      </td></tr>
      <tr><td style="padding:10px 18px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="38%" style="vertical-align:top;">
            <div style="font-size:26px;font-weight:800;color:#0B1630;letter-spacing:-0.5px;">${esc(s.departure?.code)}</div>
            <div style="font-size:16px;font-weight:700;color:#151B2E;">${stampTime(s.departure?.time)}</div>
            <div style="font-size:12px;color:#4E5872;">${stampDate(s.departure?.time)}</div>
            <div style="font-size:11px;color:#6B7590;">${esc(s.departure?.name || '')}${s.departure?.terminal ? ` · T${esc(s.departure.terminal)}` : ''}</div>
          </td>
          <td width="24%" align="center" style="vertical-align:top;padding-top:10px;font-size:11px;color:#4E5872;">
            ${dur(s.durationMinutes)}<br><span style="color:#1F5EFF;font-size:16px;">&#9992;</span><br><span style="color:#0B7A3B;font-weight:600;">Non-stop</span>
          </td>
          <td width="38%" align="right" style="vertical-align:top;">
            <div style="font-size:26px;font-weight:800;color:#0B1630;letter-spacing:-0.5px;">${esc(s.arrival?.code)}</div>
            <div style="font-size:16px;font-weight:700;color:#151B2E;">${stampTime(s.arrival?.time)}</div>
            <div style="font-size:12px;color:#4E5872;">${stampDate(s.arrival?.time)}</div>
            <div style="font-size:11px;color:#6B7590;">${esc(s.arrival?.name || '')}${s.arrival?.terminal ? ` · T${esc(s.arrival.terminal)}` : ''}</div>
          </td>
        </tr></table>
      </td></tr>
    </table>`).join('');

  const paxRows = (booking.travelers || []).map((t, i) => {
    const ticket = it?.tickets?.find(k => k.name && k.name.toUpperCase().includes(String(t.last_name || '').toUpperCase()))?.ticketNumber
      || it?.tickets?.[i]?.ticketNumber || (i === 0 ? booking.ticketNumber : null);
    return `<tr>
      <td style="padding:10px 0;border-top:1px solid #E2E6EF;font-size:13px;font-weight:600;color:#151B2E;">${esc(String(t.last_name || '').toUpperCase())}/${esc(String(t.first_name || '').toUpperCase())}</td>
      <td align="right" style="padding:10px 0;border-top:1px solid #E2E6EF;font-size:13px;color:#4E5872;">${ticket ? `E-ticket <strong style="color:#151B2E;">${esc(ticket)}</strong>` : 'E-ticket pending'}</td>
    </tr>`;
  }).join('');

  const total = it?.price?.total ?? booking.totalPrice;
  const cur = it?.price?.currency || booking.currency;

  return `
    <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#C93C14;">You're all set</p>
    <h1 style="margin:0 0 8px;font-size:28px;line-height:1.2;font-weight:800;color:#151B2E;letter-spacing:-0.6px;">You're flying to <span style="font-family:Georgia,serif;font-style:italic;font-weight:400;color:#1F5EFF;">${esc(destination)}</span></h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#4E5872;">Your e-ticket is attached as a PDF. Show it with a valid photo ID at check-in.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF3FF;border-radius:14px;margin-bottom:20px;">
      <tr>
        <td style="padding:16px 18px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#1F5EFF;">Booking reference</div>
          <div style="font-size:18px;font-weight:800;color:#151B2E;margin-top:2px;">${esc(booking.bookingReference)}</div>
        </td>
        ${pnrs.length ? `<td align="right" style="padding:16px 18px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#1F5EFF;">Airline PNR</div>
          <div style="font-size:18px;font-weight:800;color:#151B2E;margin-top:2px;letter-spacing:2px;">${esc(pnrs.join(' / '))}</div>
        </td>` : ''}
      </tr>
    </table>

    ${segRows || '<p style="font-size:14px;color:#4E5872;">Flight details are in the attached e-ticket.</p>'}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
      <tr><td colspan="2" style="padding-bottom:6px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#6B7590;">Passengers</td></tr>
      ${paxRows}
      <tr>
        <td style="padding:14px 0 0;border-top:1px solid #E2E6EF;font-size:15px;font-weight:700;color:#151B2E;">Total paid</td>
        <td align="right" style="padding:14px 0 0;border-top:1px solid #E2E6EF;font-size:18px;font-weight:800;color:#151B2E;">${inr(total, cur)}</td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>
      <td style="border-radius:999px;background:#1F5EFF;">
        <a href="${FRONTEND_URL()}/my-bookings" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Manage in My trips</a>
      </td>
    </tr></table>

    <p style="margin:0;font-size:12px;line-height:1.6;color:#6B7590;">
      Web check-in usually opens 24-48 hours before departure on the airline's website. Times shown are local to each airport.
      ${it?.supplierName ? `Fare supplied by ${esc(it.supplierName)}${it.supplierRef ? ` (order ${esc(it.supplierRef)})` : ''}.` : ''}
    </p>`;
}

/**
 * E-ticket email: itinerary summary + PDF attachment. Marks bookings.email_sent_at.
 * @param {Object} booking - camelCase booking from booking.service (with travelers, payments)
 * @returns {{ success: boolean, messageId?: string, error?: string }}
 */
const sendFlightTicketEmail = async (booking) => {
  const transport = getTransporter();
  if (!transport) {
    logger.warn(`[Email] Not configured - e-ticket email for ${booking.bookingReference} not sent`);
    return { success: false, error: 'not_configured' };
  }

  try {
    const itineraryService = require('./itinerary.service');
    const ticketService = require('./ticket.service');
    const { toTicketBooking } = require('../controllers/booking.controller');

    const itinerary = await itineraryService.getTicketItinerary(booking);
    const pdf = await ticketService.generateTicketPDF(toTicketBooking(booking), itinerary);
    const segs = (itinerary?.slices || []).flatMap(s => s.segments);
    const route = segs.length ? `${segs[0].departure.code} to ${segs[segs.length - 1].arrival.code}` : 'your flight';

    const info = await transport.sendMail({
      from: `"SkyWings" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER}>`,
      to: booking.contactEmail,
      subject: `Your e-ticket: ${route} · ${booking.bookingReference}`,
      html: generateEmailTemplate(flightTicketContent(booking, itinerary), 'success'),
      attachments: [{ filename: `SkyWings-E-Ticket-${booking.bookingReference}.pdf`, content: pdf, contentType: 'application/pdf' }]
    });

    if (booking.id) {
      const { getPool } = require('../config/database');
      await getPool().query('UPDATE bookings SET email_sent_at = CURRENT_TIMESTAMP WHERE id = $1', [booking.id]);
    }
    logger.info(`[Email] E-ticket sent to ${booking.contactEmail} for ${booking.bookingReference}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`[Email] E-ticket email failed for ${booking.bookingReference}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendFlightTicketEmail,
  flightTicketContent,
  sendBookingConfirmation,
  sendPaymentFailed,
  generateEmailTemplate,
  generateBookingConfirmationContent,
  generatePaymentFailedContent
};
