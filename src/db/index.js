const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'taskflow',
  user: process.env.DB_USER || process.env.USER,
  password: process.env.DB_PASSWORD || '',
});

// Create a new job
async function createJob(job) {
  const query = `
    INSERT INTO jobs (id, type, data, status, max_attempts, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING *
  `;
  const values = [job.id, job.type, JSON.stringify(job.data), 'pending', 3];
  const result = await pool.query(query, values);
  return result.rows[0];
}

// Get job by ID
async function getJob(jobId) {
  const query = 'SELECT * FROM jobs WHERE id = $1';
  const result = await pool.query(query, [jobId]);
  return result.rows[0];
}

// Update job status to running
async function markJobRunning(jobId, attemptNumber) {
  const query = `
    UPDATE jobs 
    SET status = 'running', 
        attempts = $2,
        started_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [jobId, attemptNumber]);
  return result.rows[0];
}

// Mark job as completed
async function markJobCompleted(jobId, result) {
  const query = `
    UPDATE jobs 
    SET status = 'completed',
        result = $2,
        completed_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
  const values = [jobId, JSON.stringify(result)];
  const dbResult = await pool.query(query, values);
  return dbResult.rows[0];
}

// Mark job as failed
async function markJobFailed(jobId, error, attemptNumber) {
  const status = attemptNumber >= 3 ? 'failed' : 'pending';
  const query = `
    UPDATE jobs 
    SET status = $2,
        error = $3,
        attempts = $4,
        failed_at = CASE WHEN $2 = 'failed' THEN NOW() ELSE NULL END
    WHERE id = $1
    RETURNING *
  `;
  const values = [jobId, status, error.toString(), attemptNumber];
  const result = await pool.query(query, values);
  return result.rows[0];
}

// Get job statistics
async function getJobStats() {
  const query = `
    SELECT 
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'running') as running,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'failed') as failed
    FROM jobs
  `;
  const result = await pool.query(query);
  return result.rows[0];
}

// Get recent jobs
async function getRecentJobs(limit = 50) {
  const query = `
    SELECT id, type, status, attempts, created_at, completed_at, error
    FROM jobs
    ORDER BY created_at DESC
    LIMIT $1
  `;
  const result = await pool.query(query, [limit]);
  return result.rows;
}

module.exports = {
  pool,
  createJob,
  getJob,
  markJobRunning,
  markJobCompleted,
  markJobFailed,
  getJobStats,
  getRecentJobs,
};