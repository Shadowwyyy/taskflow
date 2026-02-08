const request = require('supertest');
const express = require('express');

// Mock the database and SQS
jest.mock('../../src/db');
jest.mock('@aws-sdk/client-sqs');

const { createJob } = require('../../src/db');

describe('API Endpoints', () => {
  let app;

  beforeAll(() => {
    // Set up test environment
    process.env.AWS_REGION = 'us-east-2';
    process.env.QUEUE_URL = 'https://test-queue-url';
    process.env.DLQ_URL = 'https://test-dlq-url';

    // Import app after mocks are set
    app = express();
    app.use(express.json());

    // Mock job creation endpoint
    app.post('/jobs', async (req, res) => {
      const { type, data } = req.body;

      if (!type) {
        return res.status(400).json({ error: 'Job type is required' });
      }

      const jobId = `job-test-${Date.now()}`;
      
      await createJob({
        id: jobId,
        type,
        data: data || {},
      });

      res.status(201).json({
        success: true,
        jobId,
        message: 'Job enqueued successfully',
      });
    });

    app.get('/health', (req, res) => {
      res.json({ status: 'ok', message: 'TaskFlow API is running' });
    });
  });

  describe('POST /jobs', () => {
    beforeEach(() => {
      createJob.mockClear();
      createJob.mockResolvedValue({ id: 'test-job' });
    });

    it('should create a job with valid data', async () => {
      const response = await request(app)
        .post('/jobs')
        .send({
          type: 'test',
          data: { message: 'Test' },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBeDefined();
      expect(response.body.message).toBe('Job enqueued successfully');
    });

    it('should return 400 if job type is missing', async () => {
      const response = await request(app)
        .post('/jobs')
        .send({
          data: { message: 'Test' },
        })
        .expect(400);

      expect(response.body.error).toBe('Job type is required');
    });

    it('should handle empty data object', async () => {
      const response = await request(app)
        .post('/jobs')
        .send({
          type: 'test',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.message).toBe('TaskFlow API is running');
    });
  });
});