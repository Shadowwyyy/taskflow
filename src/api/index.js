require('dotenv').config();
const express = require('express');
const { SQSClient, SendMessageCommand, GetQueueAttributesCommand } = require('@aws-sdk/client-sqs');

const app = express();
app.use(express.json());

// Enable CORS for dashboard
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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
      { type: 'csv-export', description: 'Export data to CSV' },
      { type: 'failing-job', description: 'Test retry logic' },
    ],
  });
});

// Get queue statistics
app.get('/stats', async (req, res) => {
  try {
    // Get main queue stats
    const mainQueueStats = await sqsClient.send(new GetQueueAttributesCommand({
      QueueUrl: QUEUE_URL,
      AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible'],
    }));

    // Get DLQ stats
    const dlqStats = await sqsClient.send(new GetQueueAttributesCommand({
      QueueUrl: process.env.DLQ_URL,
      AttributeNames: ['ApproximateNumberOfMessages'],
    }));

    res.json({
      queue: {
        waiting: parseInt(mainQueueStats.Attributes.ApproximateNumberOfMessages),
        processing: parseInt(mainQueueStats.Attributes.ApproximateNumberOfMessagesNotVisible),
      },
      deadLetterQueue: {
        failed: parseInt(dlqStats.Attributes.ApproximateNumberOfMessages),
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TaskFlow API started`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`📍 Queue: ${QUEUE_URL}`);
  console.log('---');
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Enqueue job: POST http://localhost:${PORT}/jobs`);
  console.log(`Queue stats: GET http://localhost:${PORT}/stats`);
});