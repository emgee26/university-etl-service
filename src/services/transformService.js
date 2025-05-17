/**
 * Transform Service - Handles data transformation and validation
 */

const logger = require('../utils/logger');

class TransformService {
  constructor() {
    this.requiredFields = ['name', 'country'];
    this.optionalFields = ['alpha_two_code', 'state-province', 'domains', 'web_pages'];
  }

  /**
   * Transform raw university data
   * @param {Array} rawData - Raw data from API
   * @returns {Promise<Array>} Transformed data array
   */
  async transformData(rawData) {
    logger.info(`Starting data transformation for ${rawData.length} records`);
    
    if (!Array.isArray(rawData)) {
      throw new Error('Input data must be an array');
    }

    const transformedData = [];
    const errors = [];

    for (let i = 0; i < rawData.length; i++) {
      try {
        const transformedRecord = this.transformRecord(rawData[i], i);
        if (transformedRecord) {
          transformedData.push(transformedRecord);
        }
      } catch (error) {
        errors.push({
          index: i,
          record: rawData[i],
          error: error.message
        });
        logger.warn(`Failed to transform record at index ${i}: ${error.message}`);
      }
    }

    // Log transformation summary
    logger.info(`Transformation completed. Success: ${transformedData.length}, Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      logger.warn(`Transformation errors encountered:`, { errors: errors.slice(0, 5) }); // Log first 5 errors
    }

    // Add metadata to transformed data
    const result = {
      data: transformedData,
      metadata: {
        totalRecords: rawData.length,
        successfulTransformations: transformedData.length,
        failedTransformations: errors.length,
        transformationDate: new Date().toISOString(),
        errors: errors
      }
    };

    return result;
  }

  /**
   * Transform a single university record
   * @param {Object} record - Raw university record
   * @param {number} index - Record index for error reporting
   * @returns {Object|null} Transformed record or null if invalid
   */
  transformRecord(record, index) {
    if (!record || typeof record !== 'object') {
      throw new Error(`Invalid record type at index ${index}: expected object`);
    }

    // Validate required fields
    for (const field of this.requiredFields) {
      if (!record[field] || typeof record[field] !== 'string' || record[field].trim() === '') {
        throw new Error(`Missing or invalid required field '${field}'`);
      }
    }

    // Create transformed record with standardized structure
    const transformed = {
      id: this.generateId(record),
      name: this.sanitizeString(record.name),
      country: this.sanitizeString(record.country),
      alphaCode: record['alpha_two_code'] ? this.sanitizeString(record['alpha_two_code']) : null,
      stateProvince: record['state-province'] ? this.sanitizeString(record['state-province']) : null,
      domains: this.transformDomains(record.domains),
      webPages: this.transformWebPages(record.web_pages),
      lastUpdated: new Date().toISOString()
    };

    // Validate transformed record
    if (!this.validateTransformedRecord(transformed)) {
      throw new Error('Transformed record failed validation');
    }

    return transformed;
  }

  /**
   * Generate a unique ID for a university record
   * @param {Object} record - University record
   * @returns {string} Generated ID
   */
  generateId(record) {
    const name = record.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const country = record.country.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const state = record['state-province'] ? 
      record['state-province'].toLowerCase().replace(/[^a-z0-9]/g, '-') : '';
    
    return `${country}-${state ? state + '-' : ''}${name}`.replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  /**
   * Sanitize string fields
   * @param {string} str - Input string
   * @returns {string} Sanitized string
   */
  sanitizeString(str) {
    if (typeof str !== 'string') {
      return String(str);
    }
    return str.trim().replace(/\s+/g, ' ');
  }

  /**
   * Transform domains array
   * @param {Array} domains - Raw domains array
   * @returns {Array} Transformed domains array
   */
  transformDomains(domains) {
    if (!Array.isArray(domains)) {
      return [];
    }

    return domains
      .filter(domain => typeof domain === 'string' && domain.trim() !== '')
      .map(domain => domain.trim().toLowerCase())
      .filter((domain, index, arr) => arr.indexOf(domain) === index); // Remove duplicates
  }

  /**
   * Transform web pages array
   * @param {Array} webPages - Raw web pages array
   * @returns {Array} Transformed web pages array
   */
  transformWebPages(webPages) {
    if (!Array.isArray(webPages)) {
      return [];
    }

    return webPages
      .filter(url => typeof url === 'string' && url.trim() !== '')
      .map(url => {
        const trimmed = url.trim();
        // Ensure URL has protocol
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          return `https://${trimmed}`;
        }
        return trimmed;
      })
      .filter((url, index, arr) => arr.indexOf(url) === index); // Remove duplicates
  }

  /**
   * Validate transformed record
   * @param {Object} record - Transformed record
   * @returns {boolean} True if valid
   */
  validateTransformedRecord(record) {
    // Check required fields
    if (!record.id || !record.name || !record.country) {
      return false;
    }

    // Check data types
    if (typeof record.name !== 'string' || typeof record.country !== 'string') {
      return false;
    }

    // Check arrays
    if (!Array.isArray(record.domains) || !Array.isArray(record.webPages)) {
      return false;
    }

    return true;
  }

  /**
   * Get transformation statistics
   * @param {Object} transformResult - Result from transformData
   * @returns {Object} Statistics object
   */
  getTransformationStats(transformResult) {
    const { data, metadata } = transformResult;
    
    const stats = {
      totalRecords: metadata.totalRecords,
      successfulTransformations: metadata.successfulTransformations,
      failedTransformations: metadata.failedTransformations,
      successRate: metadata.totalRecords > 0 ? 
        (metadata.successfulTransformations / metadata.totalRecords * 100).toFixed(2) + '%' : '0%',
      transformationDate: metadata.transformationDate,
      uniqueCountries: [...new Set(data.map(record => record.country))].length,
      recordsWithDomains: data.filter(record => record.domains.length > 0).length,
      recordsWithWebPages: data.filter(record => record.webPages.length > 0).length
    };

    return stats;
  }
}

module.exports = TransformService;
