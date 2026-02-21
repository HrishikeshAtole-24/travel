/**
 * Keep Alive Controller
 * Prevents Supabase DB from pausing (1 month inactivity)
 * Prevents Render service from stopping (15 min inactivity on free tier)
 * 
 * Hit this endpoint every 2 hours via external cron service
 */
const db = require('../config/database');
const { sendEmail } = require('../utils/emailService');

// Email recipients for keep-alive notifications
const NOTIFY_EMAILS = [
  'contact@hrishikesh.com',
  'f11799107121119810511699h@gmail.com'
];

class KeepAliveController {
  /**
   * @route   GET /api/keep-active-service
   * @desc    Ping database to keep services active
   * @access  Public
   */
  async ping(req, res) {
    const startTime = Date.now();
    
    try {
      // Query multiple tables to ensure DB stays active
      const checks = await Promise.all([
        // 1. Simple health check query
        db.query('SELECT NOW() as current_time'),
        
        // 2. Check airports table (usually has most data)
        db.query('SELECT COUNT(*) as airport_count FROM airports'),
        
        // 3. Check users table
        db.query('SELECT COUNT(*) as user_count FROM users'),
        
        // 4. Check bookings table
        db.query('SELECT COUNT(*) as booking_count FROM bookings')
      ]);

      const responseTime = Date.now() - startTime;

      const result = {
        status: 'ALIVE',
        message: '🚀 Services are active and running!',
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          serverTime: checks[0].rows[0].current_time,
          stats: {
            airports: parseInt(checks[1].rows[0].airport_count),
            users: parseInt(checks[2].rows[0].user_count),
            bookings: parseInt(checks[3].rows[0].booking_count)
          }
        },
        performance: {
          responseTimeMs: responseTime,
          status: responseTime < 1000 ? 'FAST' : responseTime < 3000 ? 'NORMAL' : 'SLOW'
        },
        services: {
          supabase: 'ACTIVE',
          render: 'ACTIVE'
        }
      };

      console.log(`[KEEP-ALIVE] ✅ Ping successful - DB: ${result.database.stats.airports} airports, Response: ${responseTime}ms`);
      
      // Send email notification on successful ping
      await this.sendKeepAliveEmail(result);
      
      res.status(200).json(result);

    } catch (error) {
      console.error('[KEEP-ALIVE] ❌ Ping failed:', error.message);
      
      res.status(500).json({
        status: 'ERROR',
        message: 'Service health check failed',
        timestamp: new Date().toISOString(),
        error: error.message,
        database: {
          connected: false
        }
      });
    }
  }

  /**
   * @route   GET /api/keep-active-service/status
   * @desc    Quick status check (lighter weight)
   * @access  Public
   */
  async status(req, res) {
    try {
      const result = await db.query('SELECT 1 as alive');
      
      res.status(200).json({
        alive: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        alive: false,
        error: error.message
      });
    }
  }

  /**
   * Send email notification on successful keep-alive ping
   */
  async sendKeepAliveEmail(result) {
    try {
      const timestamp = new Date().toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        dateStyle: 'full',
        timeStyle: 'long'
      });

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .container { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; }
            .header { color: white; text-align: center; margin-bottom: 20px; }
            .card { background: white; padding: 20px; border-radius: 8px; }
            .status { color: #22c55e; font-size: 24px; font-weight: bold; }
            .stats { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .stat-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e5e7eb; }
            .stat-row:last-child { border-bottom: none; }
            .label { color: #6b7280; }
            .value { font-weight: bold; color: #1f2937; }
            .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
            .badge-green { background: #dcfce7; color: #166534; }
            .badge-blue { background: #dbeafe; color: #1e40af; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 Keep-Alive Ping Successful</h1>
              <p>Your Travel Booking API is running smoothly!</p>
            </div>
            <div class="card">
              <p class="status">✅ ALL SERVICES ACTIVE</p>
              
              <div class="stats">
                <h3 style="margin-top: 0;">📊 Database Stats</h3>
                <div class="stat-row">
                  <span class="label">Airports</span>
                  <span class="value">${result.database.stats.airports.toLocaleString()}</span>
                </div>
                <div class="stat-row">
                  <span class="label">Users</span>
                  <span class="value">${result.database.stats.users}</span>
                </div>
                <div class="stat-row">
                  <span class="label">Bookings</span>
                  <span class="value">${result.database.stats.bookings}</span>
                </div>
              </div>

              <div class="stats">
                <h3 style="margin-top: 0;">⚡ Performance</h3>
                <div class="stat-row">
                  <span class="label">Response Time</span>
                  <span class="value">${result.performance.responseTimeMs}ms</span>
                </div>
                <div class="stat-row">
                  <span class="label">Status</span>
                  <span class="badge badge-green">${result.performance.status}</span>
                </div>
              </div>

              <div class="stats">
                <h3 style="margin-top: 0;">🔌 Services</h3>
                <div class="stat-row">
                  <span class="label">Supabase</span>
                  <span class="badge badge-green">ACTIVE</span>
                </div>
                <div class="stat-row">
                  <span class="label">Render</span>
                  <span class="badge badge-green">ACTIVE</span>
                </div>
              </div>

              <p style="text-align: center; color: #6b7280; margin-top: 20px;">
                <strong>Timestamp:</strong> ${timestamp}
              </p>
            </div>
            <p class="footer">
              This is an automated notification from your Travel Booking API<br>
              Cron job running every 10 minutes to keep services active
            </p>
          </div>
        </body>
        </html>
      `;

      const text = `
Keep-Alive Ping Successful!

Status: ALL SERVICES ACTIVE
Timestamp: ${timestamp}

Database Stats:
- Airports: ${result.database.stats.airports}
- Users: ${result.database.stats.users}
- Bookings: ${result.database.stats.bookings}

Performance:
- Response Time: ${result.performance.responseTimeMs}ms
- Status: ${result.performance.status}

Services:
- Supabase: ACTIVE
- Render: ACTIVE
      `;

      // Send to all recipients
      for (const email of NOTIFY_EMAILS) {
        await sendEmail({
          to: email,
          subject: `✅ Keep-Alive Ping Successful - ${timestamp}`,
          html,
          text
        });
      }

      console.log(`[KEEP-ALIVE] 📧 Email notification sent to ${NOTIFY_EMAILS.length} recipients`);
    } catch (error) {
      // Don't fail the ping if email fails - just log it
      console.error('[KEEP-ALIVE] ⚠️ Email notification failed:', error.message);
    }
  }
}

module.exports = new KeepAliveController();
