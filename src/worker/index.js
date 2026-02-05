require('dotenv').config();
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');

// Initialize SQS client
const sqsClient = new SQSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const QUEUE_URL = process.env.QUEUE_URL;

// Process a job
async function processJob(job) {
  console.log('📦 Processing job:', job);
  
  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('✅ Job completed:', job.id);
}

// Poll SQS for messages
async function pollQueue() {
  console.log('👀 Polling queue for messages...');
  
  try {
    const command = new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 20, // Long polling
      MessageAttributeNames: ['All'],
    });

    const response = await sqsClient.send(command);

    if (response.Messages && response.Messages.length > 0) {
      for (const message of response.Messages) {
        console.log('\n🔔 Received message from queue');
        
        // Parse the job data
        const jobData = JSON.parse(message.Body);
        
        // Process the job
        await processJob(jobData);
        
        // Delete message from queue after successful processing
        await sqsClient.send(new DeleteMessageCommand({
          QueueUrl: QUEUE_URL,
          ReceiptHandle: message.ReceiptHandle,
        }));
        
        console.log('🗑️  Message deleted from queue\n');
      }
    } else {
      console.log('No messages in queue');
    }
  } catch (error) {
    console.error('❌ Error polling queue:', error.message);
  }

  // Continue polling
  setTimeout(pollQueue, 1000);
}

// Start the worker
console.log('🚀 TaskFlow Worker started');
console.log('📍 Queue:', QUEUE_URL);
console.log('---');

pollQueue();