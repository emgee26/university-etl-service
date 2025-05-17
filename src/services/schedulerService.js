const cron = require('node-cron');
const ETLService = require('./etlService');
const logger = require('../utils/logger');
const config = require('../config');

class SchedulerService {
  constructor() {
    this.etl = new ETLService();
    this.job = null;
    this.running = false;
    this.history = [];
  }

  start() {
    if (this.job) {
      logger.warn('Scheduler already running');
      return;
    }

    this.job = cron.schedule(config.scheduler.cron, () => this.runETL(), {
      scheduled: true,
      timezone: config.scheduler.timezone
    });

    logger.info('Scheduler started');
  }

  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logger.info('Scheduler stopped');
    }
  }

  async runETL() {
    if (this.running) {
      logger.warn('ETL already running, skipping');
      return;
    }

    this.running = true;
    const start = Date.now();

    try {
      const result = await this.etl.run();
      const duration = Date.now() - start;

      this.history.unshift({
        timestamp: new Date().toISOString(),
        success: true,
        duration,
        records: result.loaded
      });

      // Keep only last 10 executions
      this.history = this.history.slice(0, 10);

      logger.info(`Scheduled ETL completed: ${result.loaded} records`);
    } catch (error) {
      const duration = Date.now() - start;

      this.history.unshift({
        timestamp: new Date().toISOString(),
        success: false,
        duration,
        error: error.message
      });

      this.history = this.history.slice(0, 10);
      logger.error(`Scheduled ETL failed: ${error.message}`);
    } finally {
      this.running = false;
    }
  }

  async runManual() {
    if (this.running) {
      throw new Error('ETL already running');
    }

    this.running = true;
    const start = Date.now();

    try {
      const result = await this.etl.run();
      const duration = Date.now() - start;

      const record = {
        timestamp: new Date().toISOString(),
        success: true,
        duration,
        records: result.loaded,
        type: 'manual'
      };

      this.history.unshift(record);
      this.history = this.history.slice(0, 10);

      logger.info(`Manual ETL completed: ${result.loaded} records`);
      return record;
    } catch (error) {
      const duration = Date.now() - start;

      const record = {
        timestamp: new Date().toISOString(),
        success: false,
        duration,
        error: error.message,
        type: 'manual'
      };

      this.history.unshift(record);
      this.history = this.history.slice(0, 10);

      logger.error(`Manual ETL failed: ${error.message}`);
      throw record;
    } finally {
      this.running = false;
    }
  }

  getStatus() {
    return {
      isRunning: !!this.job,
      isExecuting: this.running,
      history: this.history.slice(0, 5)
    };
  }

  getNextExecution() {
    const now = new Date();
    const nextRun = new Date(now);

    // Set to next midnight UTC
    nextRun.setUTCDate(nextRun.getUTCDate() + 1);
    nextRun.setUTCHours(0, 0, 0, 0);

    return nextRun.toISOString();
  }
}

module.exports = SchedulerService;
