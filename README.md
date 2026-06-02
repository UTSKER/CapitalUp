# CapitalUp

CapitalUp is a premium, institutional-grade Wealth Management and Portfolio Analytics platform. It is designed to provide high-net-worth investors and portfolio managers with sophisticated financial analytics, trading utilities, and real-time investment insights.

The repository is structured with a modular, clean-architecture backend powered by Node.js and Express, alongside a pre-compiled high-performance frontend utility equipped with Shadcn design system styling.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Codebase Architecture & Modules](#codebase-architecture--modules)
   - [Backend Architecture (`capitalup-backend`)](#backend-architecture-capitalup-backend)
   - [Frontend Architecture (`frontend`)](#frontend-architecture-frontend)
3. [Technology Stack](#technology-stack)
4. [Getting Started & Setup](#getting-started--setup)
   - [Prerequisites](#prerequisites)
   - [Backend Installation & Running](#backend-installation--running)
   - [Frontend Setup & Environment Configuration](#frontend-setup--environment-configuration)
5. [Future Scope & Development Roadmap](#future-scope--roadmap)
6. [Contributing](#contributing)

---

## Project Overview

CapitalUp provides a robust framework for wealth tracking and portfolio management. The backend leverages domain-driven structure to cleanly separate concerns between HTTP transport layers, business services, database records, and third-party integrations (such as email servers and cache engines). The frontend contains static builds ready for high-speed deployment, supported by rich CSS design variables for immediate customization.

---

## Codebase Architecture & Modules

The repository follows a clean, modular structure split into two main root folders:

```
CapitalUp/
├── capitalup-backend/      # Express API backend with domain modules
└── frontend/               # React-based Vite frontend distribution
```

### Backend Architecture (`capitalup-backend`)

The backend codebase resides in the [capitalup-backend](file:///c:/Users/Admin/Downloads/MAIN_CAPITAL-HUB/CapitalUp/capitalup-backend) directory and follows clean architecture principles. It is structured inside the `src` folder as follows:

- **Server Entrypoint**:
  - [server.js](file:///c:/Users/Admin/Downloads/MAIN_CAPITAL-HUB/CapitalUp/capitalup-backend/src/server.js): Starts the HTTP server, handles port bindings, and connects to external database/cache adapters.
  - [app.js](file:///c:/Users/Admin/Downloads/MAIN_CAPITAL-HUB/CapitalUp/capitalup-backend/src/app.js): Initializes the Express application, configures global middlewares, and aggregates routes.
- **Service Configurations (`src/config/`)**:
  - [postgre.js](file:///c:/Users/Admin/Downloads/MAIN_CAPITAL-HUB/CapitalUp/capitalup-backend/src/config/postgre.js): Configures the PostgreSQL database connection pool.
  - [redis.js](file:///c:/Users/Admin/Downloads/MAIN_CAPITAL-HUB/CapitalUp/capitalup-backend/src/config/redis.js): Configures the Redis client connection for query caching and session store.
  - [mail.js](file:///c:/Users/Admin/Downloads/MAIN_CAPITAL-HUB/CapitalUp/capitalup-backend/src/config/mail.js): Configures SMTP parameters for transaction mail notifications.
- **Global Middlewares (`src/middlewares/`)**:
  - [auth.middleware.js](file:///c:/Users/Admin/Downloads/MAIN_CAPITAL-HUB/CapitalUp/capitalup-backend/src/middlewares/auth.middleware.js): Validates JSON Web Tokens (JWT) and secures private endpoints.
  - [error.middleware.js](file:///c:/Users/Admin/Downloads/MAIN_CAPITAL-HUB/CapitalUp/capitalup-backend/src/middlewares/error.middleware.js): Global catch-all handler that intercepts errors and sends standardized JSON responses.
  - [validate.middleware.js](file:///c:/Users/Admin/Downloads/MAIN_CAPITAL-HUB/CapitalUp/capitalup-backend/src/middlewares/validate.middleware.js): Validates incoming payload requests against specific schemas.
- **Domain Modules (`src/modules/`)**:
  Business capabilities are organized modularly. The `auth` module provides an outline of how additional business domains (e.g., portfolios, trades, analytics) should be styled:
  - **Controllers**: Handle HTTP requests/responses and coordinate services.
  - **Services**: Execute domain business rules.
  - **Repositories**: Execute database queries and interact with raw storage (decoupling services from ORM/SQL drivers).
  - **Routes**: Map endpoints (e.g., `/api/v1/auth/login`) to the appropriate controllers.
  - **Validators**: Schema definitions (such as Joi or Zod) to restrict endpoint parameters.
  - **Utils**: Isolated helper utilities for the domain.
- **Shared Layer (`src/shared/`)**:
  Contains shared utilities and cross-cutting services (like logs, string formats, etc.) consumed by multiple modules.

### Frontend Architecture (`frontend`)

The frontend codebase is located in the [frontend](file:///c:/Users/Admin/Downloads/MAIN_CAPITAL-HUB/CapitalUp/frontend) folder and represents a modern Single Page Application (SPA) architecture built with Vite:

- [index.html](file:///c:/Users/Admin/Downloads/MAIN_CAPITAL-HUB/CapitalUp/frontend/index.html): SPA template entrypoint.
- [default_shadcn_theme.css](file:///c:/Users/Admin/Downloads/MAIN_CAPITAL-HUB/CapitalUp/frontend/default_shadcn_theme.css): Contains the core global CSS design variables (colors, borders, rings, accent states) mapped to standard Shadcn theme values (supporting Tailwind v4 inline definitions).
- [.env.example](file:///c:/Users/Admin/Downloads/MAIN_CAPITAL-HUB/CapitalUp/frontend/.env.example): Environment template containing configuration keys for the backend API connection.
- `dist/`: Pre-compiled production-ready static assets (HTML, CSS, JS) optimized for low latency.

---

## Technology Stack

| Component | Technology | Version / Spec | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend Core** | Node.js | v18+ | JavaScript Runtime Environment |
| **API Framework** | Express | ^5.2.1 | Minimalist web framework for routing and middleware |
| **Development Utility** | Nodemon | ^3.1.14 | Auto-restarts node processes on file changes |
| **Database Integration** | PostgreSQL | (Client boilerplate) | Relational storage for user accounts and assets |
| **Caching & Session** | Redis | (Client boilerplate) | In-memory key-value caching layer |
| **Frontend Compiler** | Vite | (Pre-built assets) | Next-generation frontend tooling |
| **Styling & Theme** | CSS Variables | Shadcn / Tailwind v4 | UI primitives and theme palette control |

---

## Getting Started & Setup

### Prerequisites

Make sure you have the following installed on your machine:
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **Git** (for code collaboration)

---

### Backend Installation & Running

1. Navigate to the backend directory:
   ```bash
   cd capitalup-backend
   ```

2. Install the package dependencies:
   ```bash
   npm install
   ```

3. Configure environmental requirements (if applicable) and populate configuration settings.

4. Start the server in development mode:
   ```bash
   npm run dev
   ```
   *(Ensure that a `"dev"` script is defined in package.json or run `npx nodemon src/server.js` directly to enable watch-mode)*

---

### Frontend Setup & Environment Configuration

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Copy the environment template file:
   ```bash
   cp .env.example .env
   ```

3. Open `.env` and adjust variables to point to your local backend server:
   ```env
   VITE_API_URL=http://localhost:3000
   ```

4. Serve the static assets:
   - For simple production testing, serve the `dist/` folder using a static file server (such as `npx serve dist`).
   - If developing new components, restore source assets and run the development compiler using `npm run dev`.

---

## Future Scope & Development Roadmap

CapitalUp is architected to facilitate incremental updates. Key expansion paths include:

1. **Authentication Flow Completion**:
   - Write cryptographic hashing utilities in `src/modules/auth/utils/`.
   - Setup session tables and query mechanisms in `auth.repository.js`.
   - Implement login/registration validation schemas and JWT token issuance inside `auth.service.js`.

2. **Persistent Database Connector**:
   - Establish connection pooling in `src/config/postgre.js` using `pg` or an ORM like Prisma/Sequelize.
   - Design table migrations for User Accounts, Investment Portfolios, Assets, and Historical transactions.

3. **In-Memory Caching (Redis)**:
   - Wire up `src/config/redis.js` to instantiate a Redis connection client.
   - Introduce caching decorators/middlewares in `shared/` to cache frequent read operations (like market data, asset listings).

4. **Email Dispatch Integration**:
   - Configure `src/config/mail.js` using Nodemailer or a transactional provider client (SendGrid, Mailgun).
   - Add verification triggers and password recovery handlers.

5. **Dynamic Frontend Expansion**:
   - Reconstruct the source folders to allow rapid development of dashboards, stock graphs, and transaction history screens.
   - Utilize [default_shadcn_theme.css](file:///c:/Users/Admin/Downloads/MAIN_CAPITAL-HUB/CapitalUp/frontend/default_shadcn_theme.css) to build responsive, dark-mode compatible components that align with Shadcn style primitives.

---

## Contributing

1. Create a descriptive feature branch (`git checkout -b feature/amazing-feature`).
2. Commit your code modifications (`git commit -m 'feat: add amazing feature'`).
3. Push changes to the branch (`git push origin feature/amazing-feature`).
4. Submit a Pull Request.