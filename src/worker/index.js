require('dotenv').config();
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, ChangeMessageVisibilityCommand } = require('@aws-sdk/client-sqs');
const { processJob } = require('../handlers');

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
  console.log('👀 Polling queue for messages...');
  
  try {
    const command = new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 20, // Long polling
      MessageAttributeNames: ['All'],
      AttributeNames: ['ApproximateReceiveCount'], // Track retry count
    });

    const response = await sqsClient.send(command);

    if (response.Messages && response.Messages.length > 0) {
      for (const message of response.Messages) {
        console.log('\n🔔 Received message from queue');
        
        // Get retry count
        const receiveCount = parseInt(message.Attributes?.ApproximateReceiveCount || '1');
        const attemptNumber = receiveCount - 1; // 0-indexed
        
        try {
          // Parse the job data
          const job = JSON.parse(message.Body);
          
          console.log(`📦 Processing job: ${job.id} (Attempt ${receiveCount}/${MAX_RETRIES})`);
          console.log(`   Type: ${job.type}`);
          console.log(`   Data:`, job.data);
          
          // Process the job with appropriate handler
          const result = await processJob(job);
          
          console.log('✅ Job completed:', job.id);
          console.log('   Result:', result);
          
          // Delete message from queue after successful processing
          await sqsClient.send(new DeleteMessageCommand({
            QueueUrl: QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle,
          }));
          
          console.log('🗑️  Message deleted from queue\n');
          
        } catch (error) {
          console.error(`❌ Error processing job (Attempt ${receiveCount}/${MAX_RETRIES}):`, error.message);
          
          if (receiveCount < MAX_RETRIES) {
            // Calculate backoff delay
            const backoffDelay = getBackoffDelay(attemptNumber);
            const backoffSeconds = Math.floor(backoffDelay / 1000);
            
            console.log(`🔄 Retrying in ${backoffSeconds}s (exponential backoff)...`);
            
            // Change visibility timeout to implement backoff
            await sqsClient.send(new ChangeMessageVisibilityCommand({
              QueueUrl: QUEUE_URL,
              ReceiptHandle: message.ReceiptHandle,
              VisibilityTimeout: backoffSeconds,
            }));
            
            console.log(`⏰ Message will become visible again in ${backoffSeconds}s\n`);
          } else {
            console.error('💀 Max retries reached. Message will move to DLQ\n');
            // Don't delete - let it go to DLQ automatically
          }
        }
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
console.log('🚀 TaskFlow Worker started');
console.log('📍 Queue:', QUEUE_URL);
console.log('📍 Handlers: image-resize, email, csv-export, test');
console.log('📍 Max retries:', MAX_RETRIES);
console.log('📍 Base retry delay:', RETRY_DELAY_MS + 'ms');
console.log('---');

pollQueue();