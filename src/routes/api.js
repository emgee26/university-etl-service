const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const ETLService = require('../services/etlService');
const SchedulerService = require('../services/schedulerService');
const logger = require('../utils/logger');
const config = require('../config');

const router = express.Router();
const etl = new ETLService();
const scheduler = new SchedulerService();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

router.get('/status', async (req, res) => {
  try {
    const etlStatus = await etl.getStatus();
    const schedulerStatus = scheduler.getStatus();
    
    res.json({
      etl: etlStatus,
      scheduler: schedulerStatus
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/etl/run', async (req, res) => {
  try {
    const result = await scheduler.runManual();
    res.json(result);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.get('/etl/history', (req, res) => {
  res.json(scheduler.getStatus().history);
});

router.get('/download/csv', async (req, res) => {
  try {
    const csvPath = path.join(config.storage.dataDir, config.storage.csvFile);
    
    try {
      await fs.access(csvPath);
    } catch (error) {
      // Generate CSV if it does not exist
      const data = await etl.load.readData();
      if (!data) {
        return res.status(404).json({ error: 'No data available' });
      }
      await etl.load.generateCsv(data.data);
    }

    const filename = `universities-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileStream = require('fs').createReadStream(csvPath);
    fileStream.pipe(res);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/download/json', async (req, res) => {
  try {
    const data = await etl.load.readData();
    if (!data) {
      return res.status(404).json({ error: 'No data available' });
    }

    const filename = `universities-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/data', async (req, res) => {
  try {
    const data = await etl.load.readData();
    if (!data) {
      return res.status(404).json({ error: 'No data available' });
    }

    const { limit = 10, search } = req.query;
    let results = data.data;

    if (search) {
      const term = search.toLowerCase();
      results = results.filter(uni => 
        uni.name.toLowerCase().includes(term) ||
        uni.domains.some(domain => domain.includes(term))
      );
    }

    res.json({
      total: results.length,
      data: results.slice(0, parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/scheduler/start', (req, res) => {
  scheduler.start();
  res.json({ message: 'Scheduler started' });
});

router.post('/scheduler/stop', (req, res) => {
  scheduler.stop();
  res.json({ message: 'Scheduler stopped' });
});

module.exports = router;
