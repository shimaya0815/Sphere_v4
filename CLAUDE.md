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