const express = require('express');
const logger = require('./utils/logger');
const config = require('./config');
const apiRoutes = require('./routes/api');
const SchedulerService = require('./services/schedulerService');

const app = express();
const scheduler = new SchedulerService();

// Basic middleware
app.use(express.json());
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.json({
    name: 'University ETL Service',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      status: '/api/status',
      runETL: '/api/etl/run',
      downloadCSV: '/api/download/csv',
      downloadJSON: '/api/download/json',
      data: '/api/data'
    }
  });
});

// Start scheduler
scheduler.start();

// Start server
const server = app.listen(config.server.port, () => {
  logger.info(`Server running on port ${config.server.port}`);
});

// Gracefully shutdown
process.on('SIGTERM', () => {
  logger.info('Shutting down...');
  scheduler.stop();
  server.close(() => {
    process.exit(0);
  });
});

module.exports = app;
