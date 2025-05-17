/**
 * Tests for ExtractService
 */

const ExtractService = require('../../src/services/extractService');
const axios = require('axios');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('ExtractService', () => {
  let extractService;

  beforeEach(() => {
    extractService = new ExtractService();
    jest.clearAllMocks();
  });

  describe('extractData', () => {
    it('should successfully extract data from API', async () => {
      const mockData = [
        {
          name: 'Test University',
          country: 'United States',
          'alpha_two_code': 'US',
          'state-province': 'California',
          domains: ['test.edu'],
          web_pages: ['https://test.edu']
        }
      ];

      mockedAxios.mockResolvedValueOnce({
        data: mockData,
        status: 200
      });

      const result = await extractService.extractData();

      expect(result).toEqual(mockData);
      expect(mockedAxios).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockData = [{ name: 'Test University', country: 'United States' }];

      // First call fails, second succeeds
      mockedAxios
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: mockData,
          status: 200
        });

      const result = await extractService.extractData();

      expect(result).toEqual(mockData);
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it('should fail after maximum retry attempts', async () => {
      mockedAxios.mockRejectedValue(new Error('Persistent network error'));

      await expect(extractService.extractData()).rejects.toThrow(
        'Failed to extract data after 3 attempts'
      );

      expect(mockedAxios).toHaveBeenCalledTimes(3);
    });

    it('should validate response format', async () => {
      mockedAxios.mockResolvedValueOnce({
        data: 'invalid response',
        status: 200
      });

      await expect(extractService.extractData()).rejects.toThrow(
        'Invalid response format: expected array of universities'
      );
    });
  });

  describe('validateExtractedData', () => {
    it('should validate correct data structure', () => {
      const validData = [
        { name: 'Test University', country: 'United States' }
      ];

      const result = extractService.validateExtractedData(validData);
      expect(result).toBe(true);
    });

    it('should reject non-array data', () => {
      const invalidData = { name: 'Test University' };

      const result = extractService.validateExtractedData(invalidData);
      expect(result).toBe(false);
    });

    it('should reject data missing required fields', () => {
      const invalidData = [{ name: 'Test University' }]; // Missing country

      const result = extractService.validateExtractedData(invalidData);
      expect(result).toBe(false);
    });

    it('should accept empty array', () => {
      const emptyData = [];

      const result = extractService.validateExtractedData(emptyData);
      expect(result).toBe(true);
    });
  });

  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff with jitter', () => {
      const delay1 = extractService.calculateRetryDelay(1);
      const delay2 = extractService.calculateRetryDelay(2);
      const delay3 = extractService.calculateRetryDelay(3);

      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThanOrEqual(3000);
      
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThanOrEqual(5000);
      
      expect(delay3).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeLessThanOrEqual(9000);
    });

    it('should respect maximum delay', () => {
      const delay = extractService.calculateRetryDelay(10);
      expect(delay).toBeLessThanOrEqual(extractService.maxRetryDelay);
    });
  });
});
