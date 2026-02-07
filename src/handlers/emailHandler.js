const nodemailer = require('nodemailer');

async function processEmail(job) {
  const { to, subject, body } = job.data;
  
  console.log(`Sending email to: ${to}`);
  console.log(`Subject: ${subject}`);

  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('Email sent successfully');
  
  return {
    success: true,
    recipient: to,
    subject,
    sentAt: new Date().toISOString(),
  };
}

module.exports = { processEmail };