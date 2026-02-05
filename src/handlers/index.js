const { processImageResize } = require('./imageHandler');
const { processEmail } = require('./emailHandler');
const { processCSVExport } = require('./csvHandler');

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
};

async function processJob(job) {
  const handler = handlers[job.type];
  
  if (!handler) {
    throw new Error(`Unknown job type: ${job.type}`);
  }
  
  return await handler(job);
}

module.exports = { processJob };