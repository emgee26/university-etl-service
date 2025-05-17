const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const config = require('../config');

class LoadService {
  constructor() {
    this.dataDir = config.storage.dataDir;
    this.jsonPath = path.join(this.dataDir, config.storage.jsonFile);
    this.csvPath = path.join(this.dataDir, config.storage.csvFile);
    this.backupDir = config.storage.backupDir;
  }

  async ensureDirectories() {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(this.backupDir, { recursive: true });
  }

  async saveData(data) {
    logger.info('Saving data to storage');
    
    await this.ensureDirectories();
    await this.backupExisting();
    
    // Save JSON
    await fs.writeFile(this.jsonPath, JSON.stringify(data, null, 2));
    
    // Generate CSV
    await this.generateCsv(data.data);
    
    logger.info(`Saved ${data.data.length} records`);
    
    return {
      recordsLoaded: data.data.length,
      jsonPath: this.jsonPath,
      csvPath: this.csvPath
    };
  }

  async backupExisting() {
    try {
      await fs.access(this.jsonPath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `universities-${timestamp}.json`);
      await fs.copyFile(this.jsonPath, backupPath);
      logger.info('Created backup');
    } catch (error) {
      // File does not exist, no backup needed
    }
  }

  async generateCsv(data) {
    if (!data || data.length === 0) return;

    const headers = ['id', 'name', 'country', 'alphaCode', 'state', 'domains', 'webPages', 'updatedAt'];
    const csvLines = [headers.join(',')];
    
    for (const record of data) {
      const row = headers.map(header => {
        let value = record[header];
        
        if (Array.isArray(value)) {
          value = value.join(';');
        }
        
        if (value === null || value === undefined) {
          value = '';
        }
        
        value = String(value);
        if (value.includes(',') || value.includes('"')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
      });
      
      csvLines.push(row.join(','));
    }

    await fs.writeFile(this.csvPath, csvLines.join('\n'));
    logger.info(`Generated CSV with ${data.length} records`);
  }

  async readData() {
    try {
      const content = await fs.readFile(this.jsonPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
}

module.exports = LoadService;
