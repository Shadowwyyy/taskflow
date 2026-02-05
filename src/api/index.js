require('dotenv').config();
const express = require('express');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const app = express();
app.use(express.json());

// Initialize SQS client
const sqsClient = new SQSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const QUEUE_URL = process.env.QUEUE_URL;
const PORT = process.env.API_PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'TaskFlow API is running' });
});

// Enqueue a job
app.post('/jobs', async (req, res) => {
  try {
    const { type, data } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Job type is required' });
    }

    // Generate job ID
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create job payload
    const job = {
      id: jobId,
      type,
      data: data || {},
      createdAt: new Date().toISOString(),
    };

    // Send to SQS
    const command = new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(job),
    });

    await sqsClient.send(command);

    console.log(`✉️  Job enqueued: ${jobId}`);

    res.status(201).json({
      success: true,
      jobId,
      message: 'Job enqueued successfully',
    });
  } catch (error) {
    console.error('Error enqueuing job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enqueue job',
      message: error.message,
    });
  }
});

// Get job types (for demo)
app.get('/job-types', (req, res) => {
  res.json({
    types: [
      { type: 'test', description: 'Simple test job' },
      { type: 'email', description: 'Send email notification' },
      { type: 'image-resize', description: 'Resize and optimize image' },
      { type: 'data-export', description: 'Export data to CSV' },
    ],
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TaskFlow API started`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`📍 Queue: ${QUEUE_URL}`);
  console.log('---');
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Enqueue job: POST http://localhost:${PORT}/jobs`);
});