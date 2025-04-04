# Mentat Template JS

A full-stack JavaScript template project with React frontend and Express backend, both using TypeScript.

## Commands

This project uses npm workspaces to manage both client and server packages. The following commands are available at the root level:

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies for both client and server |
| `npm run dev` | Run both client and server in development mode concurrently |
| `npm run build` | Build both client and server for production |
| `npm start` | Start the server in production mode (after building) |
| `npm run lint` | Run ESLint to check code quality |
| `npm run format` | Run Prettier to format code |
| `npm run test` | Run tests for both client and server |

## Client

The client is a React application built with modern tooling:

### Key Technologies

- **React 19**: Latest version of the React library
- **TypeScript**: For type safety and better developer experience
- **Vite**: Fast and efficient build tool and development server
- **Vitest**: Testing framework compatible with Vite

### Client Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reloading |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |

### Testing

The client uses a modern testing stack:
- **Vitest**: Test runner compatible with Jest API
- **React Testing Library**: For component testing
- **JSDOM**: Browser-like environment for tests

## Server

The server is an Express.js application written in TypeScript.

### Key Technologies

- **Express**: Web framework for Node.js
- **TypeScript**: For type safety and better developer experience
- **ts-node-dev**: For development with hot reloading
- **Jest**: For testing

### Server Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reloading |
| `npm run build` | Build for production |
| `npm start` | Start server in production mode |
| `npm test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |

### Testing

The server uses:
- **Jest**: Test runner
- **Supertest**: For HTTP assertions and API testing
