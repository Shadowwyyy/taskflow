import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [stats, setStats] = useState(null);
  const [jobType, setJobType] = useState('test');
  const [jobData, setJobData] = useState('{"message": "Hello from dashboard!"}');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 2000);
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
      setMessage(`✅ Job ${result.jobId} enqueued!`);
      fetchStats();
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
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

  return (
    <div className="App">
      <h1>TaskFlow Dashboard</h1>
      
      {stats && (
        <div className="stats-container">
          <div className="stat-card waiting">
            <div className="stat-number">{stats.queue.waiting}</div>
            <div className="stat-label">Waiting</div>
          </div>
          
          <div className="stat-card processing">
            <div className="stat-number">{stats.queue.processing}</div>
            <div className="stat-label">Processing</div>
          </div>
          
          <div className="stat-card failed">
            <div className="stat-number">{stats.deadLetterQueue.failed}</div>
            <div className="stat-label">Failed (DLQ)</div>
          </div>
        </div>
      )}

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