# CareerForge Backend

## Development
To start the development server with live reload:
```bash
npm run dev
```

## Production
To start the production server:
```bash
npm start
```

## Test API
You can test the core routes using the following endpoints:

**Health Check:**
```http
GET http://localhost:5000/
```
**Response:**
```json
{ "status": "CareerForge API Running" }
```

**Extract Keywords:**
```http
POST http://localhost:5000/api/ai/extract-keywords
Content-Type: application/json

{
  "jobDescription": "Looking for React developer..."
}
```
**Response:**
```json
{
  "success": true,
  "keywords": { ... }
}
```
