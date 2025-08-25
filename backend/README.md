# Repario Backend API

A minimal Express TypeScript server with JWT authentication and Supabase integration for the Repario invoice management system.

## Features

- **Authentication**: JWT-based auth with access/refresh tokens
- **Security**: bcrypt password hashing, CORS protection
- **Database**: Supabase integration with proxy routes
- **TypeScript**: Full type safety with modern ES2020 support
- **Development**: Hot reloading with nodemon

## Quick Start

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Configure environment**:

   ```bash
   cp .env.example .env
   ```

   Update `.env` with your Supabase credentials:

   ```
   SUPABASE_URL=your-supabase-project-url
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```

3. **Start development server**:

   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

### Authentication

- `POST /auth/register` - Create new user account
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token

### Protected Routes

- `GET /api/layouts` - Get user layouts
- `POST /api/layouts` - Create new layout
- `GET /api/invoices` - Get user invoices
- `POST /api/invoices` - Create new invoice
- `GET /api/customers` - Get user customers
- `POST /api/customers` - Create new customer

### Health Check

- `GET /health` - Server health status

## JWT Token Configuration

- **Access Token**: Expires in 15 minutes
- **Refresh Token**: Expires in 30 days
- **Automatic Rotation**: New refresh token issued on each refresh

## Security Features

- Password hashing with bcrypt (12 salt rounds)
- JWT token validation middleware
- CORS protection with configurable origins
- Service role authentication for Supabase

## Development

```bash
# Install dependencies
npm install

# Start development server (auto-reload)
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start
```

## Environment Variables

| Variable                    | Description          | Default                 |
| --------------------------- | -------------------- | ----------------------- |
| `PORT`                      | Server port          | `3001`                  |
| `NODE_ENV`                  | Environment          | `development`           |
| `FRONTEND_URL`              | CORS origin          | `http://localhost:5173` |
| `JWT_SECRET`                | Access token secret  | Required                |
| `JWT_REFRESH_SECRET`        | Refresh token secret | Required                |
| `SUPABASE_URL`              | Supabase project URL | Required                |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key | Required                |

## Project Structure

```
backend/
├── src/
│   └── index.ts          # Main server file
├── dist/                 # Compiled JavaScript
├── .env                  # Environment variables
├── .env.example         # Environment template
├── package.json         # Dependencies & scripts
├── tsconfig.json        # TypeScript config
└── README.md            # This file
```

## Integration with Frontend

The server is configured to work with the React frontend running on `http://localhost:5173`. Update `FRONTEND_URL` in `.env` for different environments.

## Supabase Setup

Make sure your Supabase database has the required tables:

- `profiles` (users)
- `customers`
- `layouts`
- `layout_sections`
- `layout_fields`
- `layout_field_options`
- `invoices`
- `invoice_items`

Row Level Security (RLS) policies should be configured to ensure users can only access their own data.
