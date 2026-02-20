# FlowFlow

워크플로우 기반 AI 에이전트 실행 관리 플랫폼.

## 프로젝트 구조

| 디렉토리 | 설명 |
|----------|------|
| `flow-backend/` | NestJS 백엔드 — DDD + Hexagonal Architecture + Vertical Slice |
| `flow-front/` | React 프론트엔드 — Vite + TanStack Query + shadcn/ui |

## 시작하기

### 백엔드

```bash
cd flow-backend
npm install
npm run build && npm run start
```

> `npm run start:dev` (tsx)는 사용 불가 — tsx/esbuild가 `emitDecoratorMetadata`를 지원하지 않아 NestJS DI가 동작하지 않는다.

> 기본적으로 인메모리 리포지토리를 사용한다. PostgreSQL 연결이 필요하면 `USE_DB=true`를 설정한다.

### 프론트엔드

```bash
cd flow-front
npm install
npm run dev    # http://localhost:5173 → /api 프록시 → http://localhost:3000
```

---

## Claude 명령어 (Commands)

| 명령어 | 용도 |
|--------|------|
| `/backend-verify` | 백엔드 typecheck + test + lint |
| `/frontend-verify` | 프론트엔드 typecheck + lint + build |
| `/fullstack-verify` | 백엔드 + 프론트엔드 전체 검증 |
| `/runtime-test` | 백엔드 런타임 통합 테스트 (API 호출 기반) |
| `/manual-test` | 수동 UI 테스트 루프 — 6개 도메인 시나리오를 Playwright로 검증 |

## Claude 스킬 (Skills)

| 스킬 | 용도 |
|------|------|
| `generate-loop-prompt` | 구현 요구사항을 Ralph Loop 프롬프트로 변환하여 `loop-save/`에 저장. `reserve.sh`의 `PROMPT_FILE`을 자동 설정 |
| `evaluate` | 프로젝트(백엔드/프론트엔드) 종합 평가 리포트를 `evaluates/`에 생성 |

## 예약 실행 (reserve.sh / reserve.bat)

`generate-loop-prompt` 스킬이 프롬프트를 생성하면 `reserve.sh`의 `PROMPT_FILE` 변수가 자동으로 설정된다.

```bash
# macOS / Linux
./reserve.sh [시간] [분]
./reserve.sh 2 30     # 2시간 30분 후 실행
./reserve.sh 0 10     # 10분 후 실행
./reserve.sh          # 기본값: 10분 후 실행

# Windows
reserve.bat [시간] [분]
```

---

## 검증 커맨드

```bash
# 백엔드
cd flow-backend && npm run typecheck && npm run test && npm run lint

# 프론트엔드
cd flow-front && npx tsc -b && npm run lint && npm run build

# 풀스택 (한 줄)
cd flow-backend && npm run typecheck && npm run test && npm run lint && cd ../flow-front && npx tsc -b && npm run lint && npm run build
```

---

## 디렉토리 가이드

| 경로 | 관리 주체 | 설명 |
|------|----------|------|
| `CLAUDE.md` | 사람 + 에이전트 | 모노레포 규칙 — 에이전트가 참조하고 따름 |
| `docs/` | 사람 | 설계 결정 문서 — 에이전트 수정 금지 |
| `README.md` | 사람 | 이 파일 — 개발자 가이드 |
| `manual-test-sc/` | 에이전트 | 수동 테스트 시나리오 및 결과 |
| `manual-test-sc/screenshots/` | 에이전트 | 테스트 증거 스크린샷 |
| `loop-save/` | 에이전트 | Ralph Loop 프롬프트 아카이브 |
| `evaluates/` | 에이전트 | 프로젝트 평가 리포트 이력 |

---

## 아키텍처 개요

### 백엔드

**DDD + Hexagonal Architecture + Vertical Slice + CQRS**

Bounded Contexts: `workflow`, `workflow-runtime`, `git`, `mcp`, `agent`

각 도메인은 `domain/`, `application/`, `infra/`, `presentation/` 레이어로 구성되며, 도메인 간 직접 import은 금지된다. 상세 규칙은 `flow-backend/CLAUDE.md` 참조.

### 프론트엔드

**React 19 + Vite + TanStack Query + React Hook Form + Zod + shadcn/ui**

API 호출은 `api/` 레이어에 격리, 서버 상태는 React Query 커스텀 훅으로 관리. 상세 규칙은 `flow-front/CLAUDE.md` 참조.
