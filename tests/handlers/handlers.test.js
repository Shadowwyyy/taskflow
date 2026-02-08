const { processJob } = require('../../src/handlers');

describe('Job Handlers', () => {
  describe('Test Handler', () => {
    it('should complete a test job successfully', async () => {
      const job = {
        id: 'test-job-1',
        type: 'test',
        data: { message: 'Test message' },
      };

      const result = await processJob(job);

      expect(result).toEqual({
        success: true,
        message: 'Test job completed',
      });
    });
  });

  describe('Email Handler', () => {
    it('should process email job with valid data', async () => {
      const job = {
        id: 'email-job-1',
        type: 'email',
        data: {
          to: 'test@example.com',
          subject: 'Test Subject',
          body: 'Test Body',
        },
      };

      const result = await processJob(job);

      expect(result.success).toBe(true);
      expect(result.recipient).toBe('test@example.com');
      expect(result.subject).toBe('Test Subject');
      expect(result.sentAt).toBeDefined();
    });
  });

  describe('Image Resize Handler', () => {
    it('should process image resize job', async () => {
      const job = {
        id: 'image-job-1',
        type: 'image-resize',
        data: {
          imageUrl: 'https://example.com/image.jpg',
          width: 800,
          height: 600,
        },
      };

      const result = await processJob(job);

      expect(result.success).toBe(true);
      expect(result.originalUrl).toBe('https://example.com/image.jpg');
      expect(result.dimensions).toEqual({ width: 800, height: 600 });
      expect(result.resizedUrl).toContain('s3.amazonaws.com');
    });
  });

  describe('CSV Export Handler', () => {
    it('should process CSV export job', async () => {
      const job = {
        id: 'csv-job-1',
        type: 'csv-export',
        data: {
          filename: 'test.csv',
          data: [
            { name: 'Item 1', value: 100 },
            { name: 'Item 2', value: 200 },
          ],
        },
      };

      const result = await processJob(job);

      expect(result.success).toBe(true);
      expect(result.filename).toBe('test.csv');
      expect(result.recordCount).toBe(2);
      expect(result.downloadUrl).toContain('test.csv');
    });
  });

  describe('Unknown Handler', () => {
    it('should throw error for unknown job type', async () => {
      const job = {
        id: 'unknown-job-1',
        type: 'unknown-type',
        data: {},
      };

      await expect(processJob(job)).rejects.toThrow('Unknown job type: unknown-type');
    });
  });

  describe('Failing Job Handler', () => {
    it('should fail twice then succeed on third attempt', async () => {
      const job = {
        id: 'failing-job-unique',
        type: 'failing-job',
        data: { test: 'data' },
      };

      // First attempt should fail
      await expect(processJob(job)).rejects.toThrow('Simulated failure on attempt 1');

      // Second attempt should fail
      await expect(processJob(job)).rejects.toThrow('Simulated failure on attempt 2');

      // Third attempt should succeed
      const result = await processJob(job);
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
    });
  });
});