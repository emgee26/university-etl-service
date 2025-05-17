/**
 * Configuration settings for the University ETL Service
 */

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    environment: process.env.NODE_ENV || 'development'
  },

  // API configuration
  api: {
    universitiesUrl: 'http://universities.hipolabs.com/search?country=United+States',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second initial delay
    maxRetryDelay: 10000 // 10 seconds max delay
  },

  // Data storage configuration
  storage: {
    dataDir: './data',
    jsonFile: 'universities.json',
    csvFile: 'universities.csv',
    backupDir: './data/backups'
  },

  scheduler: {
    cron: '0 0 * * *', // midnight UTC
    timezone: 'UTC'
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: './logs/app.log',
    maxSize: '20m',
    maxFiles: '14d'
  }
};

module.exports = config;
