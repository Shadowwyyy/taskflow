# TaskFlow

A distributed job queue system built with AWS SQS, Node.js, and Express. Demonstrates asynchronous job processing with automatic failure handling.

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│             │     │              │     │             │
│  Client     │────▶│  REST API    │────▶│   AWS SQS   │
│             │     │  (Express)   │     │   Queue     │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                 │
                                                 │ polls
                                                 ▼
                                          ┌─────────────┐
                                          │   Worker    │
                                          │   Process   │
                                          └──────┬──────┘
                                                 │
                                                 │ on failure (3x)
                                                 ▼
                                          ┌─────────────┐
                                          │ Dead Letter │
                                          │    Queue    │
                                          └─────────────┘
```

## Features

- REST API for job submission with instant response
- Background worker with long polling (20s)
- Multiple job type handlers:
  - **test**: Basic 2s processing simulation
  - **email**: Email notification handler
  - **image-resize**: Image processing with Sharp
  - **csv-export**: Data export to CSV
  - **failing-job**: Retry logic demonstration
- Exponential backoff retry (1s, 2s, 4s intervals)
- Dead letter queue for failed jobs after 3 attempts
- Real-time monitoring dashboard with live stats
- Graceful shutdown handling

## Dashboard

React-based monitoring interface at `http://localhost:5173`:

- Real-time queue statistics (updates every 2s)
- Quick job submission templates
- Visual status indicators for waiting, processing, and failed jobs

To run dashboard:

```bash
cd dashboard
npm install
npm run dev
```

**What it does:**

1. API receives job requests via HTTP
2. Jobs are queued to AWS SQS
3. Worker polls queue and processes jobs
4. Failed jobs retry 3x, then move to dead letter queue

## Tech Stack

- Node.js + Express
- AWS SQS (message queue)
- AWS SDK v3

## Setup

1. **Clone and install**

```bash
git clone https://github.com/Shadowwyyy/taskflow.git
cd taskflow
npm install
```

2. **Configure AWS**

- Create IAM user with `AmazonSQSFullAccess`
- Create two SQS queues: `taskflow-main` and `taskflow-dlq`
- Set `taskflow-main` to use `taskflow-dlq` as dead letter queue (max receives: 3)

3. **Set environment variables**

```bash
cp .env.example .env
# Edit .env with your AWS credentials and queue URLs
```

4. **Run**

```bash
# Terminal 1: Start worker
npm run worker

# Terminal 2: Start API
npm run api
```

## Usage

**Send a job:**

```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test",
    "data": {"message": "Hello!"}
  }'
```

**Response:**

```json
{
  "success": true,
  "jobId": "job-1738792345678-abc123",
  "message": "Job enqueued successfully"
}
```

The worker will pick it up and process it automatically.

## API Endpoints

- `GET /health` - Health check
- `POST /jobs` - Enqueue a job (body: `{type, data}`)
- `GET /job-types` - List available job types

## How It Works

**API (`src/api/index.js`):**

- Accepts HTTP requests
- Generates unique job IDs
- Sends jobs to SQS queue
- Returns immediately (non-blocking)

**Worker (`src/worker/index.js`):**

- Polls SQS for messages (long polling, 20s)
- Processes jobs (currently simulates 2s of work)
- Deletes message on success
- Failed jobs retry automatically (up to 3x)

**Failure Handling:**

- Jobs that fail 3x move to dead letter queue
- Visibility timeout prevents duplicate processing
- Long polling reduces AWS costs

## Key Concepts

- **Asynchronous processing**: Jobs don't block the API
- **Decoupling**: API and worker run independently
- **Fault tolerance**: Automatic retries + dead letter queue
- **Scalability**: Can run multiple workers in parallel

## Next Steps

- [x] Add job-specific handlers (email, image resize, CSV export)
- [x] Add real-time monitoring dashboard
- [ ] Add PostgreSQL for job status tracking
- [ ] Deploy to AWS ECS with Docker
- [ ] Add CloudWatch monitoring

## License

MIT

---

Built by [Jeet Sharma](https://jeetsharma.dev)
