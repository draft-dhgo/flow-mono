# 🚀 FlowFlow Workspace Initialization Report

**Date:** 2026-02-22
**Status:** ✅ Workspace Ready

## Project Overview

**FlowFlow** is an AI-powered workflow automation platform built with:
- **Backend:** NestJS (DDD + Hexagonal Architecture)
- **Frontend:** React 19 + Vite + TanStack Query
- **Database:** PostgreSQL (TypeORM) - optional via `USE_DB=true`

## ✅ Verification Status

### Dependencies
- ✅ **Backend** (`flow-backend/`): npm packages installed
- ✅ **Frontend** (`flow-front/`): npm packages installed

### TypeScript Compilation
- ✅ **Backend TypeScript**: Passed (`tsc --noEmit`)
- ✅ **Frontend TypeScript**: Ready to build

### Project Structure
```
flowflow/
├── flow-backend/          # NestJS backend (DDD + Hexagonal)
├── flow-front/            # React frontend (Vite)
├── .claude/               # Custom commands & skills
├── docs/                  # Design documentation
├── evaluates/             # Project evaluation reports
├── loop-save/             # Prompt archives
└── manual-test-sc/        # Manual test scenarios & screenshots
```

## 🔧 Key Commands

### Backend
```bash
cd flow-backend

# Type checking
npm run typecheck

# Testing
npm run test              # Run once
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage

# Linting
npm run lint             # Check
npm run lint:fix         # Auto-fix

# Building & Running
npm run build            # Build with tsc (REQUIRED)
npm run start            # Run compiled JS
npm run start:dev        # Run with tsx (NODE.JS only, not recommended)

# Full verification (one-liner for agents)
npm run typecheck && npm run test && npm run lint
```

### Frontend
```bash
cd flow-front

# Type checking
npx tsc -b               # Build TypeScript

# Linting
npm run lint             # ESLint check

# Building
npm run build            # Production build
npm run dev              # Dev server (port 5173, proxies to http://localhost:3000)

# Full verification (one-liner for agents)
npx tsc -b && npm run lint && npm run build
```

### Full-Stack Verification
```bash
cd flow-backend && npm run typecheck && npm run test && npm run lint && \
cd ../flow-front && npx tsc -b && npm run lint && npm run build
```

## 🚨 Known Issues

### Backend (from memory)
- **3 test failures** in `SendQueryUseCase.test.ts`
  - Root cause: `agentService.findSessionByWorkExecutionId` mock issue
  - Status: Known, not blocking development

### Frontend (from memory)
- **2 lint warnings** in MCP form
  - `react-hooks/incompatible-library` warnings
  - Status: Known, minor

## ⚙️ Environment Configuration

### Database
- **Default:** In-memory repositories (no DB required)
- **PostgreSQL:** Enable with `USE_DB=true`
  - Requires PostgreSQL running on standard port
  - Uses TypeORM for ORM

### API Server
- **Backend Port:** `3000` (default)
- **Frontend Dev:** `5173` (Vite, with `/api` proxy to backend)

### Authentication
- **Agent Sessions:** Use `claude` CLI with OAuth
- **API Keys:** Environment variable based (no hardcoding)

## 📋 Current Git Status

### Uncommitted Changes
```
modified:
  - flow-backend/src/agent/infra/agent-service-impl.ts
  - flow-backend/src/workspace/application/commands/create-workspace-use-case.ts
  - flow-front/src/api/workspaces.ts
  - flow-front/src/pages/WorkflowFlowEditorPage.tsx
  - manual-test-sc/checklist.md
  - reserve.bat
  - reserve.sh

untracked:
  - flowflow-repos/
  - loop-save/tcc-pattern-migration-prompt.txt
  - workflow-spaces/
```

Branch: `main` (up to date with origin)

## 📖 Important Rules

### Code Quality
- ✅ TypeScript strict mode enabled - no `any` types
- ✅ Use `unknown` + type guards instead
- ✅ ESLint/Prettier configured for both projects

### Architecture
- **Backend:** Vertical Slice + DDD patterns
- **Frontend:** Component-based with React Query for state management
- **API Sync:** Update `flow-front/src/api/types.ts` when backend responses change

### Testing & Validation
- Run full verification before committing
- Backend unit tests are mandatory for domain/usecase changes
- No mocking for UI-backend integration tests (use real agents)

### Forbidden
- ❌ No hardcoded API keys/secrets
- ❌ No OAuth via API key (use `claude` CLI)
- ❌ Frontend should NOT reimplement backend domain logic

## 🎯 Next Steps

1. **For Backend Development:**
   ```bash
   cd flow-backend
   npm run build && npm run start  # Recommended: Use compiled JS
   npm run test:watch             # Start test watcher
   ```

2. **For Frontend Development:**
   ```bash
   cd flow-front
   npm run dev                     # Start dev server
   npm run lint                    # Check for issues
   ```

3. **For Full-Stack Integration:**
   ```bash
   # Terminal 1: Backend
   cd flow-backend && npm run build && npm run start
   
   # Terminal 2: Frontend
   cd flow-front && npm run dev
   ```

## ✨ Project Resources

- **Project Root:** `/Users/godaehyeon/Desktop/flowflow`
- **CLAUDE.md:** Monorepo integration rules (this directory)
- **flow-backend/CLAUDE.md:** Backend-specific rules
- **flow-front/CLAUDE.md:** Frontend-specific rules
- **README.md:** Developer guide
- **docs/:** Design documentation (human-managed)

---

**Workspace initialized and ready for development! 🎉**
