const { processImageResize } = require('./imageHandler');
const { processEmail } = require('./emailHandler');
const { processCSVExport } = require('./csvHandler');

// Track attempts for failing-job type
const failingJobAttempts = {};

// Map job types to their handlers
const handlers = {
  'image-resize': processImageResize,
  'email': processEmail,
  'csv-export': processCSVExport,
  'test': async (job) => {
    console.log('🧪 Running test job');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Test completed');
    return { success: true, message: 'Test job completed' };
  },
'failing-job': async (job) => {
    // Track attempts
    failingJobAttempts[job.id] = (failingJobAttempts[job.id] || 0) + 1;
    const attempt = failingJobAttempts[job.id];
    
    console.log(`💣 Failing job (will fail on attempts 1 and 2, succeed on 3)`);
    
    if (attempt < 3) {
      throw new Error(`Simulated failure on attempt ${attempt}`);
    }
    
    console.log('✅ Finally succeeded on attempt 3!');
    delete failingJobAttempts[job.id]; // Clean up
    return { success: true, attempts: attempt };
  },
};

async function processJob(job) {
  const handler = handlers[job.type];
  
  if (!handler) {
    throw new Error(`Unknown job type: ${job.type}`);
  }
  
  return await handler(job);
}

module.exports = { processJob };