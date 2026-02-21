/**
 * Keep Alive Controller
 * Prevents Supabase DB from pausing (1 month inactivity)
 * Prevents Render service from stopping (15 min inactivity on free tier)
 * 
 * Hit this endpoint every 2 hours via external cron service
 */
const { getPool } = require('../config/database');
const { sendEmail } = require('../utils/emailService');

// Email recipients for keep-alive notifications
const NOTIFY_EMAILS = [
  'contact@hrishikeshatole.com',
  'f11799107121119810511699h@gmail.com',
  'yogarudhajina@gmail.com',
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
      const pool = getPool();
      
      // Query multiple tables to ensure DB stays active
      const checks = await Promise.all([
        // 1. Simple health check query
        pool.query('SELECT NOW() as current_time'),
        
        // 2. Check airports table (usually has most data)
        pool.query('SELECT COUNT(*) as airport_count FROM airports'),
        
        // 3. Check users table
        pool.query('SELECT COUNT(*) as user_count FROM users'),
        
        // 4. Check bookings table
        pool.query('SELECT COUNT(*) as booking_count FROM bookings')
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
      await sendKeepAliveEmail(result);
      
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
      const pool = getPool();
      const result = await pool.query('SELECT 1 as alive');
      
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
}

/**
 * Send email notification on successful keep-alive ping
 */
async function sendKeepAliveEmail(result) {
  try {
    const timestamp = new Date().toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'long'
    });

    const performanceBadgeColor = result.performance.status === 'FAST' ? '#10b981' : 
                                   result.performance.status === 'NORMAL' ? '#f59e0b' : '#ef4444';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SkyWings - Service Status</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center">
                          <!-- Logo with SVG + Text like frontend -->
                          <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                            <tr>
                              <td align="center" valign="middle">
                                <svg width="36" height="36" viewBox="0 0 32 32" fill="none" style="vertical-align: middle;">
                                  <path d="M16 2L3 9L16 16L29 9L16 2Z" fill="#ffffff"/>
                                  <path d="M3 23L16 30L29 23V9L16 16L3 9V23Z" fill="#ffffff" opacity="0.6"/>
                                </svg>
                              </td>
                              <td style="padding-left: 10px;" valign="middle">
                                <span style="color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">SkyWings</span>
                              </td>
                            </tr>
                          </table>
                          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">System Health Report</h1>
                          <p style="margin: 10px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Automated monitoring notification</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Status Banner -->
                <tr>
                  <td style="background-color: #ffffff; padding: 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background-color: #ecfdf5; padding: 20px 30px; border-bottom: 1px solid #d1fae5;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td>
                                <span style="display: inline-block; width: 12px; height: 12px; background-color: #10b981; border-radius: 50%; margin-right: 10px; animation: pulse 2s infinite;"></span>
                                <span style="color: #065f46; font-size: 18px; font-weight: 600;">All Systems Operational</span>
                              </td>
                              <td align="right">
                                <span style="background-color: #10b981; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">Online</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="background-color: #ffffff; padding: 30px;">
                    
                    <!-- Database Stats Card -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                      <tr>
                        <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                          <h3 style="margin: 0 0 16px; color: #1e293b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            <span style="margin-right: 8px;">📊</span>Database Statistics
                          </h3>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td width="33%" style="text-align: center; padding: 16px 10px; background-color: #ffffff; border-radius: 8px; margin-right: 8px;">
                                <div style="color: #3b82f6; font-size: 28px; font-weight: 700;">${result.database.stats.airports.toLocaleString()}</div>
                                <div style="color: #64748b; font-size: 12px; margin-top: 4px; text-transform: uppercase;">Airports</div>
                              </td>
                              <td width="33%" style="text-align: center; padding: 16px 10px; background-color: #ffffff; border-radius: 8px; margin: 0 8px;">
                                <div style="color: #3b82f6; font-size: 28px; font-weight: 700;">${result.database.stats.users}</div>
                                <div style="color: #64748b; font-size: 12px; margin-top: 4px; text-transform: uppercase;">Users</div>
                              </td>
                              <td width="33%" style="text-align: center; padding: 16px 10px; background-color: #ffffff; border-radius: 8px; margin-left: 8px;">
                                <div style="color: #3b82f6; font-size: 28px; font-weight: 700;">${result.database.stats.bookings}</div>
                                <div style="color: #64748b; font-size: 12px; margin-top: 4px; text-transform: uppercase;">Bookings</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Services Status -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                      <tr>
                        <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                          <h3 style="margin: 0 0 16px; color: #1e293b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            <span style="margin-right: 8px;">🔌</span>Service Status
                          </h3>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td>
                                      <span style="color: #334155; font-weight: 500;">Supabase Database</span>
                                    </td>
                                    <td align="right">
                                      <span style="background-color: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">● Connected</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td>
                                      <span style="color: #334155; font-weight: 500;">Render Server</span>
                                    </td>
                                    <td align="right">
                                      <span style="background-color: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">● Running</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 0;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td>
                                      <span style="color: #334155; font-weight: 500;">API Gateway</span>
                                    </td>
                                    <td align="right">
                                      <span style="background-color: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">● Healthy</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Performance -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                          <h3 style="margin: 0 0 16px; color: #1e293b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            <span style="margin-right: 8px;">⚡</span>Performance Metrics
                          </h3>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td width="50%" style="padding-right: 10px;">
                                <div style="background-color: #ffffff; border-radius: 8px; padding: 16px; text-align: center;">
                                  <div style="color: ${performanceBadgeColor}; font-size: 32px; font-weight: 700;">${result.performance.responseTimeMs}<span style="font-size: 14px; color: #94a3b8;">ms</span></div>
                                  <div style="color: #64748b; font-size: 12px; margin-top: 4px;">Response Time</div>
                                </div>
                              </td>
                              <td width="50%" style="padding-left: 10px;">
                                <div style="background-color: #ffffff; border-radius: 8px; padding: 16px; text-align: center;">
                                  <div style="color: ${performanceBadgeColor}; font-size: 24px; font-weight: 700;">${result.performance.status}</div>
                                  <div style="color: #64748b; font-size: 12px; margin-top: 4px;">Status</div>
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Timestamp -->
                <tr>
                  <td style="background-color: #ffffff; padding: 20px 30px; border-top: 1px solid #e2e8f0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center">
                          <p style="margin: 0; color: #64748b; font-size: 13px;">
                            <strong style="color: #334155;">Report Generated:</strong> ${timestamp}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #1e293b; padding: 30px; border-radius: 0 0 16px 16px; text-align: center;">
                    <p style="margin: 0 0 10px; color: #94a3b8; font-size: 12px;">
                      This is an automated system health notification from SkyWings
                    </p>
                    <p style="margin: 0; color: #64748b; font-size: 11px;">
                      Monitoring interval: Every 10 minutes | Powered by cron-job.org
                    </p>
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 20px auto 0;">
                      <tr>
                        <td style="padding: 0 8px;">
                          <a href="https://travel-chi-rust.vercel.app" style="color: #3b82f6; text-decoration: none; font-size: 12px;">Website</a>
                        </td>
                        <td style="color: #475569;">|</td>
                        <td style="padding: 0 8px;">
                          <a href="https://travel-booking-api-j4op.onrender.com/api/health" style="color: #3b82f6; text-decoration: none; font-size: 12px;">API Status</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const text = `
═══════════════════════════════════════════════════
  SKYWINGS - SYSTEM HEALTH REPORT
═══════════════════════════════════════════════════

STATUS: ✅ ALL SYSTEMS OPERATIONAL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 DATABASE STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Airports  : ${result.database.stats.airports.toLocaleString()}
  Users     : ${result.database.stats.users}
  Bookings  : ${result.database.stats.bookings}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔌 SERVICE STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Supabase  : ● Connected
  Render    : ● Running
  API       : ● Healthy

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ PERFORMANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Response  : ${result.performance.responseTimeMs}ms
  Status    : ${result.performance.status}

═══════════════════════════════════════════════════
Report Generated: ${timestamp}
═══════════════════════════════════════════════════
    `;

    // Send to all recipients
    for (const email of NOTIFY_EMAILS) {
      await sendEmail({
        to: email,
        subject: `SkyWings Health Report - All Systems Operational`,
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

module.exports = new KeepAliveController();
