# Sphere Application Guide

## Development Environment

### Docker Commands

- Start the development environment:
  ```bash
  docker compose up -d
  ```

- Stop the development environment:
  ```bash
  docker compose down
  ```

- View logs from a specific service:
  ```bash
  docker compose logs backend --tail 50
  docker compose logs frontend --tail 50
  docker compose logs websocket --tail 50
  ```

- Restart a specific service:
  ```bash
  docker compose restart frontend
  ```

### Database

- PostgreSQL database is available at `localhost:5432`
- Credentials:
  - Username: postgres
  - Password: postgres
  - Database: sphere

## Architecture Overview

### Backend (Django)

- Django 4.2 with Django REST Framework
- Multi-app architecture:
  - `users`: User authentication and management 
  - `business`: Business organization and workspace management
  - `tasks`: Task management with status workflow
  - `clients`: Client and fiscal year management
  - `chat`: Real-time messaging
  - `wiki`: Knowledge management
  - `time_management`: Time tracking and reporting

### Frontend (React)

- React with React Router for navigation
- TailwindCSS for styling with DaisyUI components
- Context API for state management
- Axios for API communication

### Websocket (FastAPI)

- FastAPI application for real-time features
- WebSocket connections for chat and notifications

## Key Features

- Multi-tenancy via business separation
- Task workflow management with worker/reviewer roles
- Client management with fiscal year tracking
- Time tracking and productivity metrics
- Team communication with chat and wiki

## Development Guidelines

- Add new features within the appropriate app
- Follow the existing code style for consistency
- Use the business separation middleware for data isolation
- Test features thoroughly before committing

## Key Concepts

### Multi-tenancy Architecture

The application uses a multi-tenant architecture where each business is completely isolated. This is implemented through:

1. A `business_id` field in the Business model
2. A BusinessSeparationMiddleware that enforces data isolation
3. Business-based filtering in all API views
4. Assignment of users to businesses

### Task Workflow

The task system has a sophisticated workflow with worker and reviewer roles:

1. Tasks have statuses that define the current phase of work
2. Each status is associated with an assignee type (worker/reviewer/none)
3. When status changes, the assignee is automatically updated
4. Full task history tracking

### Authorization Model

1. Token-based authentication using Djoser
2. Business-specific authorization via middleware
3. Fine-grained permissions based on user roles

## Common Development Tasks

### Adding a New API Endpoint

1. Define the model in the appropriate app's `models.py`
2. Create serializers in `serializers.py`
3. Implement views in `views.py`
4. Add URL patterns in `urls.py`
5. Test with the Swagger UI at `/swagger/`

### Adding Frontend Components

1. Create React components in the appropriate directory
2. Add API client functions in `src/api/`
3. Update routes in `App.js` if needed
4. Implement proper authentication handling
5. Follow the existing UI patterns for consistency