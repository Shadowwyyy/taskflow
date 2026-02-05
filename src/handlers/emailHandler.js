const nodemailer = require('nodemailer');

// Create a test account for demo purposes
// In production, use real SMTP credentials
async function processEmail(job) {
  const { to, subject, body } = job.data;
  
  console.log(`📧 Sending email to: ${to}`);
  console.log(`   Subject: ${subject}`);

  // Simulate email sending
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log(`✅ Email sent successfully`);
  
  return {
    success: true,
    recipient: to,
    subject,
    sentAt: new Date().toISOString(),
  };
}

module.exports = { processEmail };