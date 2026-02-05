# TaskFlow

A scalable, fault-tolerant distributed job queue system built with AWS SQS, ECS, and Node.js.

## 🎯 Features (In Progress)

- ✅ AWS SQS integration with dead letter queue
- 🚧 Automatic retry with exponential backoff
- 🚧 ECS Fargate deployment with auto-scaling
- 🚧 Job state tracking with PostgreSQL
- 🚧 Priority queue support
- 🚧 CloudWatch monitoring and alerts

## 🏗️ Architecture
```
[API] → [SQS Queue] → [Worker Pool] → [RDS Database]
                ↓
         [Dead Letter Queue]
```

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Queue:** AWS SQS
- **Database:** PostgreSQL (RDS)
- **Container:** Docker + ECS Fargate
- **Monitoring:** CloudWatch + X-Ray

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- AWS Account
- Docker (for deployment)

### Local Setup

1. Clone the repository
```bash
git clone https://github.com/Shadowwyyy/taskflow.git
cd taskflow
```

2. Install dependencies
```bash
npm install
```

3. Configure environment
```bash
cp .env.example .env
# Edit .env with your AWS credentials
```

4. Run the worker
```bash
npm run worker
```

## 📋 Project Roadmap

**Week 1:** Core infrastructure
- [x] Project setup
- [ ] SQS queue creation
- [ ] Basic worker implementation
- [ ] Local testing

**Week 2:** Production features
- [ ] ECS deployment
- [ ] Job persistence
- [ ] Retry logic
- [ ] Monitoring

**Week 3:** Polish
- [ ] Documentation
- [ ] Demo use case
- [ ] Performance testing

## 📄 License

MIT

---

Built by [Jeet Sharma](https://jeetsharma.dev)
