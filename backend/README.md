# ChatUp Backend

Backend service for ChatUp, built with NestJS and following Clean Architecture.

## Architecture

```text
src/
├── core/                   # Domain Layer (Business Logic)
│   ├── entities/
│   ├── interfaces/
│   └── use-cases/
├── infra/                  # Infrastructure Layer (DB, External Services)
│   ├── database/
│   ├── security/
│   └── websockets/
├── presentation/           # Presentation Layer (HTTP, WebSockets)
│   ├── controllers/
│   └── gateways/
└── main.ts
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the application:
   ```bash
   # development
   npm run start

   # watch mode
   npm run start:dev
   ```

## Next Steps
- Configure PostgreSQL connection in `src/app.module.ts` or `src/infra/database`.
- Implement authentication using the existing crypto logic concepts.
