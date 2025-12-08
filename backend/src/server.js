// Server Entry Point
require('./config/dotenv');
const app = require('./app');
const logger = require('./config/winstonLogger');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');

const PORT = process.env.PORT || 5000;

// Initialize Connections
(async () => {
  try {
    await connectDB();
    await connectRedis();
    
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      console.log(`✅ Server is live at http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
})();
