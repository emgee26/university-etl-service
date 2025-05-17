# University ETL Service

ETL service that fetches university data from the Hipolabs API, processes it, and provides CSV/JSON downloads.

## Features

- Fetches data from universities API with retry logic
- Transforms and validates university data
- Stores data in JSON format with backups
- Generates CSV files for download
- Scheduled daily refresh at midnight UTC
- REST API for data access
- Basic monitoring and logging

## Setup

### Prerequisites

- Node.js 16+
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/emgee26/university-etl-service
cd university-etl-service
```

2. Install dependencies:
```bash
npm install
```

3. Create required directories:
```bash
mkdir data logs
```

4. Start the service:
```bash
npm start
```

5. Access at `http://localhost:3000`

### Development

For development with auto-restart:
```bash
npm run dev
```

## Configuration

Create a `.env` file or set environment variables:

```bash
PORT=3000
LOG_LEVEL=info
NODE_ENV=development
```

## API Documentation

### Health & Status

#### GET /api/health
Returns service health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-05-16T10:30:00.000Z",
  "uptime": 3600
}
```

#### GET /api/status
Returns ETL and scheduler status.

**Response:**
```json
{
  "etl": {
    "hasData": true,
    "recordCount": 4500,
    "lastUpdate": "2025-05-16T00:00:00.000Z"
  },
  "scheduler": {
    "isRunning": true,
    "isExecuting": false,
    "history": [...]
  }
}
```

### ETL Operations

#### POST /api/etl/run
Manually execute the ETL process.

**Response:**
```json
{
  "timestamp": "2025-05-16T10:30:00.000Z",
  "success": true,
  "duration": 45000,
  "records": 4500,
  "type": "manual"
}
```

#### GET /api/etl/history
Get recent ETL execution history.

**Response:**
```json
[
  {
    "timestamp": "2025-05-16T00:00:00.000Z",
    "success": true,
    "duration": 42000,
    "records": 4500
  }
]
```

### Data Access

#### GET /api/data
Search and retrieve university data.

**Query Parameters:**
- `search` - Search term (searches name and domains)
- `limit` - Maximum results (default: 10)

**Example:**
```
GET /api/data?search=stanford&limit=5
```

**Response:**
```json
{
  "total": 1,
  "data": [
    {
      "id": "united-states-california-stanford-university",
      "name": "Stanford University",
      "country": "United States",
      "alphaCode": "US",
      "state": "California",
      "domains": ["stanford.edu"],
      "webPages": ["https://www.stanford.edu"],
      "updatedAt": "2025-05-16T00:00:00.000Z"
    }
  ]
}
```

#### GET /api/download/csv
Download university data as CSV file.

**Response:** CSV file download with filename `universities-YYYY-MM-DD.csv`

#### GET /api/download/json
Download university data as JSON file.

**Response:** JSON file download with filename `universities-YYYY-MM-DD.json`

### Scheduler Control

#### POST /api/scheduler/start
Start the scheduled ETL execution.

**Response:**
```json
{
  "message": "Scheduler started"
}
```

#### POST /api/scheduler/stop
Stop the scheduled ETL execution.

**Response:**
```json
{
  "message": "Scheduler stopped"
}
```

## Data Flow

1. **Extract**: Fetch data from `http://universities.hipolabs.com/search?country=United+States`
2. **Transform**: Clean and validate records, generate unique IDs
3. **Load**: Save to `data/universities.json` and generate `data/universities.csv`
4. **Schedule**: Automatically runs daily at midnight UTC

## Testing

```bash
npm test
```

## Docker

### Using Docker Compose (Recommended)

```bash
# Build and start the service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

### Using Docker Only

```bash
# Build the image
docker build -t university-etl-service .

# Run the container
docker run -d \
  --name university-etl \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  university-etl-service

# View logs
docker logs -f university-etl
```

## Error Handling

- API requests include retry logic with exponential backoff
- All errors are logged with Winston
- Failed ETL runs are recorded in execution history
- Service continues running even if individual ETL runs fail

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Change port in .env or kill the process
```

**Permission Errors**
```bash
# Ensure directories are writable
chmod 755 data logs

# Or run with appropriate permissions
sudo npm start
```

**API Connection Issues**
```bash
# Test API connectivity
curl http://universities.hipolabs.com/search?country=United+States

# Check firewall settings and network connectivity
```

### Logs and Debugging

```bash
# View application logs
tail -f logs/app.log

# View error logs
tail -f logs/error.log

# Enable debug logging
export LOG_LEVEL=debug
npm start
```

## Production Deployment

### Process Management with PM2

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start src/index.js --name university-etl

# Save PM2 configuration
pm2 save
pm2 startup
```
