# Smart Assistant Chatbot 🤖

A production-ready AI chatbot application built with Next.js, Express.js, Gemini AI, and PostgreSQL.

## 🌟 Features

- **AI-Powered Chat** - Powered by Google Gemini AI
- **Conversation History** - Persistent chat storage with PostgreSQL
- **Modern UI** - Built with Next.js 16 and Ant Design
- **Notes System** - Save and organize important information
- **PWA Ready** - Installable as a mobile/desktop app
- **Production Ready** - Docker, CI/CD, and cloud deployment configs included

## 🏗️ Architecture

```
├── client/                 # Next.js 16 Frontend
│   ├── app/               # App router pages
│   ├── public/            # Static assets
│   └── Dockerfile         # Production Docker build
│
├── server/                 # Express.js Backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── db/            # Database connection
│   │   ├── middleware/    # Security & logging
│   │   └── utils/         # Helper functions
│   └── Dockerfile         # Production Docker build
│
├── nginx/                  # Nginx reverse proxy config
├── docker-compose.yml      # Full-stack orchestration
└── .github/workflows/      # CI/CD pipelines
```

## 🚀 Quick Start

### Development

```bash
# Install all dependencies
npm run install:all

# Start development servers
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

### Production (Docker)

```bash
# Copy and configure environment
cp .env.production.example .env
nano .env  # Add your GEMINI_API_KEY

# Build and run
npm run docker:prod

# View logs
npm run docker:logs
```

## ☁️ Cloud Deployment

### Option 1: Railway (Recommended)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

1. Connect your GitHub repository
2. Add PostgreSQL database
3. Set environment variables:
   - `GEMINI_API_KEY`
   - `FRONTEND_URL`

### Option 2: Render
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

Uses `render.yaml` for automatic setup.

### Option 3: Vercel + Railway Split

**Frontend (Vercel):**
```bash
cd client
vercel deploy --prod
```

**Backend (Railway):**
```bash
cd server
railway up
```

### Option 4: VPS (DigitalOcean, AWS, etc.)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | ✅ |
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `NODE_ENV` | `development` or `production` | ✅ |
| `PORT` | Server port (default: 4000) | ❌ |
| `FRONTEND_URL` | Frontend URL for CORS | ✅ (prod) |
| `NEXT_PUBLIC_API_URL` | API URL for frontend | ✅ |

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/chat` | Send message |
| GET | `/api/conversations` | List conversations |
| GET | `/api/conversations/:id` | Get conversation |
| DELETE | `/api/conversations/:id` | Delete conversation |
| GET | `/api/notes` | List notes |
| POST | `/api/notes` | Create note |

## 🔒 Security Features

- ✅ Rate limiting
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Input validation
- ✅ SQL injection protection
- ✅ XSS prevention

## 🛠️ NPM Scripts

```bash
# Development
npm run dev              # Start all services in dev mode

# Production
npm run build            # Build client and server
npm run start            # Start production servers

# Docker
npm run docker:build     # Build Docker images
npm run docker:up        # Start containers
npm run docker:down      # Stop containers
npm run docker:logs      # View logs
npm run docker:prod      # Build and start
npm run docker:clean     # Remove all containers/images
```

## 📁 Project Structure

```
Chatbot_ML/
├── .github/workflows/     # CI/CD pipelines
├── client/                # Next.js frontend
├── server/                # Express.js backend
├── nginx/                 # Nginx configuration
├── docker-compose.yml     # Docker orchestration
├── railway.json           # Railway config
├── render.yaml            # Render config
├── vercel.json            # Vercel config
├── DEPLOYMENT.md          # Deployment guide
└── README.md              # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

ISC License

---

**Built with ❤️ using Next.js, Express, and Gemini AI**
