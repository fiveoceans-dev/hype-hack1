# Project Restructuring Plan

## Recommended Professional Monorepo Structure

```
hype-hack1/
├── packages/                     # All packages in monorepo
│   ├── web/                     # Frontend React + Vite app
│   │   ├── src/
│   │   │   ├── components/      # React components
│   │   │   ├── hooks/           # Custom React hooks
│   │   │   ├── pages/           # Page components
│   │   │   ├── services/        # API client services
│   │   │   ├── types/           # TypeScript types
│   │   │   ├── lib/             # Utilities
│   │   │   └── main.tsx         # Entry point
│   │   ├── public/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   ├── backend/                  # Main backend service
│   │   ├── src/
│   │   │   ├── server.ts         # Express server
│   │   │   ├── routes/           # API routes
│   │   │   ├── middleware/       # Express middleware
│   │   │   └── types/            # Shared types
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── integrations/             # External service integrations
│   │   ├── hyperliquid/          # Hyperliquid SDK integration
│   │   │   ├── src/
│   │   │   │   ├── client.ts
│   │   │   │   ├── deploy.ts
│   │   │   │   ├── operations.ts
│   │   │   │   └── types.ts
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   │
│   │   ├── pyth/                 # Pyth Network integration
│   │   │   ├── src/
│   │   │   │   ├── client.ts
│   │   │   │   ├── operations.ts
│   │   │   │   └── types.ts
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   │
│   │   └── debridge/             # deBridge integration
│   │       ├── src/
│   │       │   ├── client.ts
│   │       │   ├── operations.ts
│   │       │   └── types.ts
│   │       ├── package.json
│   │       └── tsconfig.json
│   │
│   ├── shared/                   # Shared utilities and types
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── utils/
│   │   │   └── constants/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── cli/                      # CLI tools
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── .env.example                  # Environment variables template
├── .env                          # Local environment variables
├── .gitignore                    # Git ignore rules
├── package.json                  # Root package.json for workspaces
├── tsconfig.json                 # Base TypeScript config
├── README.md                     # Project documentation
├── docker-compose.yml            # Docker setup (optional)
└── turbo.json                    # Turborepo config (optional)
```

## Migration Steps

### Step 1: Set up Yarn Workspaces
Create root package.json with workspace configuration

### Step 2: Create Package Structure
- Create packages directory
- Create subdirectories for each package

### Step 3: Move Frontend Files
- Move aesthetic-template-kit contents to packages/web
- Update import paths
- Configure Vite proxy for API

### Step 4: Move Backend Files
- Move current backend code to packages/backend
- Split integrations into separate packages

### Step 5: Create Shared Package
- Extract common types and utilities
- Set up as internal dependency

### Step 6: Configure Build System
- Set up concurrent dev scripts
- Configure build pipeline
- Add cross-package dependencies

## Benefits of This Structure

1. **Separation of Concerns**: Each integration is isolated
2. **Independent Versioning**: Each package can have its own version
3. **Better Testing**: Test each package independently
4. **Scalability**: Easy to add new integrations
5. **Type Safety**: Share types across packages
6. **Developer Experience**: Better IDE support and faster builds
7. **Deployment Flexibility**: Deploy packages independently

## Workspace Configuration

### Root package.json
```json
{
  "name": "hype-hack1",
  "private": true,
  "workspaces": [
    "packages/*",
    "packages/integrations/*"
  ],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "clean": "turbo clean && rm -rf node_modules"
  }
}
```

### Development Workflow
- `yarn dev` - Start all services in development
- `yarn build` - Build all packages
- `yarn workspace @hype/web dev` - Start only frontend
- `yarn workspace @hype/backend dev` - Start only backend

## Next Steps
1. Backup current project
2. Initialize new structure
3. Migrate code incrementally
4. Update dependencies
5. Test everything works
6. Update documentation