require('dotenv').config();
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, ChangeMessageVisibilityCommand } = require('@aws-sdk/client-sqs');
const { processJob } = require('../handlers');
const { markJobRunning, markJobCompleted, markJobFailed } = require('../db');

// Initialize SQS client
const sqsClient = new SQSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const QUEUE_URL = process.env.QUEUE_URL;
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES) || 3;
const RETRY_DELAY_MS = parseInt(process.env.RETRY_DELAY_MS) || 1000;

// Calculate exponential backoff delay
function getBackoffDelay(attemptNumber) {
  // 1s, 2s, 4s, 8s...
  return RETRY_DELAY_MS * Math.pow(2, attemptNumber);
}

// Poll SQS for messages
async function pollQueue() {
  console.log('Polling queue for messages...');
  
  try {
    const command = new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 20,
      MessageAttributeNames: ['All'],
      AttributeNames: ['ApproximateReceiveCount'],
    });

    const response = await sqsClient.send(command);

    if (response.Messages && response.Messages.length > 0) {
      for (const message of response.Messages) {
        console.log('\nReceived message from queue');
        
        const receiveCount = parseInt(message.Attributes?.ApproximateReceiveCount || '1');
        const attemptNumber = receiveCount;
        
        try {
          const job = JSON.parse(message.Body);
          
          console.log(`Processing job: ${job.id} (Attempt ${receiveCount}/${MAX_RETRIES})`);
          console.log(`Type: ${job.type}`);
          console.log('Data:', job.data);
          
          await markJobRunning(job.id, attemptNumber);
          
          const result = await processJob(job);
          
          console.log('Job completed:', job.id);
          console.log('Result:', result);
          
          await markJobCompleted(job.id, result);
          
          await sqsClient.send(new DeleteMessageCommand({
            QueueUrl: QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle,
          }));
          
          console.log('Message deleted from queue\n');
          
        } catch (error) {
          console.error(`Error processing job (Attempt ${receiveCount}/${MAX_RETRIES}):`, error.message);
          
          let jobId;
          try {
            const job = JSON.parse(message.Body);
            jobId = job.id;
          } catch (e) {
            console.error('Failed to parse job ID from message');
          }
          
          if (receiveCount < MAX_RETRIES) {
            const backoffDelay = getBackoffDelay(attemptNumber - 1);
            const backoffSeconds = Math.floor(backoffDelay / 1000);
            
            console.log(`Retrying in ${backoffSeconds}s (exponential backoff)...`);
            
            if (jobId) {
              await markJobFailed(jobId, error.message, attemptNumber);
            }
            
            await sqsClient.send(new ChangeMessageVisibilityCommand({
              QueueUrl: QUEUE_URL,
              ReceiptHandle: message.ReceiptHandle,
              VisibilityTimeout: backoffSeconds,
            }));
            
            console.log(`Message will become visible again in ${backoffSeconds}s\n`);
          } else {
            console.error('Max retries reached. Message will move to DLQ\n');
            
            if (jobId) {
              await markJobFailed(jobId, error.message, attemptNumber);
            }
          }
        }
      }
    } else {
      console.log('No messages in queue');
    }
  } catch (error) {
    console.error('Error polling queue:', error.message);
  }

  setTimeout(pollQueue, 1000);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down worker gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down worker gracefully...');
  process.exit(0);
});

// Start the worker
console.log('TaskFlow Worker started');
console.log('Queue:', QUEUE_URL);
console.log('Handlers: image-resize, email, csv-export, test');
console.log('Max retries:', MAX_RETRIES);
console.log('Base retry delay:', RETRY_DELAY_MS + 'ms');
console.log('---');

pollQueue();