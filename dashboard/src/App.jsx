import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [stats, setStats] = useState(null);
  const [dbStats, setDbStats] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [jobType, setJobType] = useState('test');
  const [jobData, setJobData] = useState('{"message": "Hello from dashboard!"}');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchStats();
    fetchDbStats();
    fetchRecentJobs();
    const interval = setInterval(() => {
      fetchStats();
      fetchDbStats();
      fetchRecentJobs();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3000/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchDbStats = async () => {
    try {
      const response = await fetch('http://localhost:3000/stats/db');
      const data = await response.json();
      setDbStats(data);
    } catch (error) {
      console.error('Error fetching db stats:', error);
    }
  };

  const fetchRecentJobs = async () => {
    try {
      const response = await fetch('http://localhost:3000/jobs?limit=10');
      const data = await response.json();
      setRecentJobs(data.jobs || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const submitJob = async () => {
    setSubmitting(true);
    setMessage('');
    
    try {
      const data = JSON.parse(jobData);
      const response = await fetch('http://localhost:3000/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: jobType,
          data: data,
        }),
      });
      
      const result = await response.json();
      setMessage(`Job ${result.jobId} enqueued!`);
      fetchStats();
      fetchDbStats();
      fetchRecentJobs();
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const quickJobs = {
    'test': { message: 'Hello from dashboard!' },
    'email': { to: 'user@example.com', subject: 'Test Email', body: 'Hello!' },
    'image-resize': { imageUrl: 'https://example.com/photo.jpg', width: 800, height: 600 },
    'csv-export': { filename: 'test.csv', data: [{ name: 'Item 1', value: 100 }] },
    'failing-job': { test: 'Will fail twice then succeed' },
  };

  const setQuickJob = (type) => {
    setJobType(type);
    setJobData(JSON.stringify(quickJobs[type], null, 2));
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      case 'running': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <div className="App">
      <h1>TaskFlow Dashboard</h1>
      
      {stats && (
        <div className="stats-container">
          <div className="stat-card waiting">
            <div className="stat-number">{stats.queue.waiting}</div>
            <div className="stat-label">Queue</div>
          </div>
          
          <div className="stat-card processing">
            <div className="stat-number">{stats.queue.processing}</div>
            <div className="stat-label">Processing</div>
          </div>
          
          <div className="stat-card failed">
            <div className="stat-number">{stats.deadLetterQueue.failed}</div>
            <div className="stat-label">DLQ</div>
          </div>
        </div>
      )}

      {dbStats && (
        <div className="db-stats">
          <h3>Database Stats</h3>
          <div className="db-stats-grid">
            <div className="db-stat">
              <span className="db-stat-label">Completed:</span>
              <span className="db-stat-value">{dbStats.database.completed}</span>
            </div>
            <div className="db-stat">
              <span className="db-stat-label">Failed:</span>
              <span className="db-stat-value">{dbStats.database.failed}</span>
            </div>
            <div className="db-stat">
              <span className="db-stat-label">Running:</span>
              <span className="db-stat-value">{dbStats.database.running}</span>
            </div>
            <div className="db-stat">
              <span className="db-stat-label">Pending:</span>
              <span className="db-stat-value">{dbStats.database.pending}</span>
            </div>
          </div>
        </div>
      )}

      <div className="recent-jobs">
        <h3>Recent Jobs</h3>
        <div className="jobs-table">
          {recentJobs.length === 0 ? (
            <p className="no-jobs">No jobs yet</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map(job => (
                  <tr key={job.id}>
                    <td className="job-id">{job.id.substring(0, 20)}...</td>
                    <td>{job.type}</td>
                    <td>
                      <span 
                        className="status-badge" 
                        style={{ backgroundColor: getStatusColor(job.status) }}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td>{job.attempts}</td>
                    <td>{new Date(job.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="submit-section">
        <h2>Submit New Job</h2>
        
        <div className="quick-jobs">
          <strong>Quick jobs:</strong>
          {Object.keys(quickJobs).map(type => (
            <button key={type} onClick={() => setQuickJob(type)} className="quick-btn">
              {type}
            </button>
          ))}
        </div>

        <div className="form-group">
          <label>Job Type:</label>
          <input 
            type="text" 
            value={jobType} 
            onChange={(e) => setJobType(e.target.value)}
            placeholder="test, email, image-resize, etc."
          />
        </div>

        <div className="form-group">
          <label>Job Data (JSON):</label>
          <textarea 
            value={jobData}
            onChange={(e) => setJobData(e.target.value)}
            rows={8}
            placeholder='{"key": "value"}'
          />
        </div>

        <button 
          onClick={submitJob} 
          disabled={submitting}
          className="submit-btn"
        >
          {submitting ? 'Submitting...' : 'Submit Job'}
        </button>

        {message && <div className="message">{message}</div>}
      </div>
    </div>
  );
}

export default App;