const ExtractService = require('./extractService');
const TransformService = require('./transformService');
const LoadService = require('./loadService');
const logger = require('../utils/logger');

class ETLService {
  constructor() {
    this.extract = new ExtractService();
    this.transform = new TransformService();
    this.load = new LoadService();
  }

  async run() {
    const start = Date.now();
    logger.info('Starting ETL process');

    try {
      // Extract
      const rawData = await this.extract.extractData();
      if (!this.extract.validateData(rawData)) {
        throw new Error('Invalid data from API');
      }

      // Transform
      const transformResult = await this.transform.transformData(rawData);
      
      // Load
      const loadResult = await this.load.saveData(transformResult);

      const duration = Date.now() - start;
      logger.info(`ETL completed in ${duration}ms`);
      
      return {
        success: true,
        duration,
        extracted: rawData.length,
        transformed: transformResult.data.length,
        loaded: loadResult.recordsLoaded
      };

    } catch (error) {
      const duration = Date.now() - start;
      logger.error(`ETL failed after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  async getStatus() {
    const data = await this.load.readData();
    return {
      hasData: !!data,
      recordCount: data?.data?.length || 0,
      lastUpdate: data?.metadata?.timestamp || null
    };
  }
}

module.exports = ETLService;
