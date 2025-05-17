/**
 * Extract Service - Handles data extraction from the universities API
 */

const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');

class ExtractService {
  constructor() {
    this.apiUrl = config.api.universitiesUrl;
    this.timeout = config.api.timeout;
    this.retryAttempts = config.api.retryAttempts;
    this.retryDelay = config.api.retryDelay;
    this.maxRetryDelay = config.api.maxRetryDelay;
  }

  /**
   * Fetch university data from the API with retry logic
   * @returns {Promise<Array>} Array of university objects
   */
  async extractData() {
    logger.info('Starting data extraction from universities API');
    
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        logger.info(`Extraction attempt ${attempt}/${this.retryAttempts}`);
        
        const response = await this.makeApiRequest();
        
        if (!response.data || !Array.isArray(response.data)) {
          throw new Error('Invalid response format: expected array of universities');
        }
        
        logger.info(`Successfully extracted ${response.data.length} universities`);
        return response.data;
        
      } catch (error) {
        lastError = error;
        logger.warn(`Extraction attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < this.retryAttempts) {
          const delay = this.calculateRetryDelay(attempt);
          logger.info(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    logger.error(`All extraction attempts failed. Last error: ${lastError.message}`);
    throw new Error(`Failed to extract data after ${this.retryAttempts} attempts: ${lastError.message}`);
  }

  /**
   * Make HTTP request to the universities API
   * @returns {Promise<Object>} Axios response object
   */
  async makeApiRequest() {
    const requestConfig = {
      method: 'GET',
      url: this.apiUrl,
      timeout: this.timeout,
      headers: {
        'User-Agent': 'University-ETL-Service/1.0.0',
        'Accept': 'application/json'
      },
      validateStatus: (status) => status >= 200 && status < 300
    };

    logger.debug(`Making API request to: ${this.apiUrl}`);
    
    try {
      const response = await axios(requestConfig);
      logger.debug(`API request successful. Status: ${response.status}, Data length: ${response.data?.length || 0}`);
      return response;
    } catch (error) {
      if (error.response) {
        // Server responded with error status
        throw new Error(`API request failed with status ${error.response.status}: ${error.response.statusText}`);
      } else if (error.request) {
        // Request was made but no response received
        throw new Error(`No response received from API: ${error.message}`);
      } else {
        // An error occurred while setting up the request
        throw new Error(`Request setup failed: ${error.message}`);
      }
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   * @param {number} attempt - Current attempt number
   * @returns {number} Delay in milliseconds
   */
  calculateRetryDelay(attempt) {
    const exponentialDelay = this.retryDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
    return Math.min(exponentialDelay + jitter, this.maxRetryDelay);
  }

  /**
   * Sleep for specified duration
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate extracted data structure
   * @param {Array} data - Extracted data array
   * @returns {boolean} True if data is valid
   */
  validateExtractedData(data) {
    if (!Array.isArray(data)) {
      logger.error('Extracted data is not an array');
      return false;
    }

    if (data.length === 0) {
      logger.warn('Extracted data array is empty');
      return true; // Empty array is still valid
    }

    // Check if first item has expected structure
    const sample = data[0];
    const requiredFields = ['name', 'country'];
    
    for (const field of requiredFields) {
      if (!(field in sample)) {
        logger.error(`Missing required field '${field}' in extracted data`);
        return false;
      }
    }

    logger.info('Extracted data validation passed');
    return true;
  }
}

module.exports = ExtractService;
