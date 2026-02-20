# CLAUDE.md — FlowFlow 모노레포 통합 규칙

## 프로젝트 개요

워크플로우 기반 AI 에이전트 실행 관리 플랫폼. 프론트엔드(React)와 백엔드(NestJS)로 구성된 멀티 프로젝트 구조.

```
flowflow/
├── flow-backend/   # NestJS 백엔드 (DDD + Hexagonal Architecture)
├── flow-front/     # React 프론트엔드 (Vite + TanStack Query)
└── CLAUDE.md       # 이 파일 (통합 규칙)
```

## 서브 프로젝트 규칙

각 프로젝트에는 자체 CLAUDE.md가 있다. 프로젝트별 상세 규칙은 해당 파일을 참조한다:

- **백엔드:** `flow-backend/CLAUDE.md` — DDD, Hexagonal Architecture, Vertical Slice, 도메인 이벤트 등
- **프론트엔드:** `flow-front/CLAUDE.md` — 컴포넌트 구조, React Query, API 레이어 등

## 프로젝트 인프라 구조

```
flowflow/
├── .claude/
│   ├── commands/                        # Claude 커스텀 명령어
│   │   ├── manual-test.md                   # 수동 UI 테스트 루프
│   │   ├── backend-verify.md                # 백엔드 검증
│   │   ├── frontend-verify.md               # 프론트엔드 검증
│   │   ├── fullstack-verify.md              # 풀스택 검증
│   │   └── runtime-test.md                  # 런타임 통합 테스트
│   └── skills/
│       ├── generate-loop-prompt/            # 루프 프롬프트 생성 스킬
│       └── evaluate/                        # 프로젝트 평가 스킬
├── docs/                                # 사람이 관리하는 설계 문서 (에이전트 수정 금지)
├── manual-test-sc/                      # 수동 테스트 시나리오 + 스크린샷
│   ├── *.md                                 # 테스트 시나리오 파일
│   └── screenshots/                         # 테스트 증거 스크린샷
├── loop-save/                           # Ralph Loop 프롬프트 아카이브
├── evaluates/                           # 프로젝트 평가 리포트
│   ├── backend/                             # 백엔드 평가 이력
│   └── frontend/                            # 프론트엔드 평가 이력
├── reserve.sh / reserve.bat             # 예약 실행 스크립트
├── CLAUDE.md                            # 모노레포 통합 규칙 (이 파일)
└── README.md                            # 개발자 가이드
```

## 공통 기술 스택

| 항목 | 백엔드 (`flow-backend`) | 프론트엔드 (`flow-front`) |
|---|---|---|
| 언어 | TypeScript 5.9 (strict) | TypeScript 5.9 (strict) |
| 런타임 | Node.js (ES2022, ESM) | Browser (ES2022, Vite 번들) |
| 패키지 매니저 | npm | npm |
| 린터 | ESLint | ESLint |
| 포매터 | Prettier | — |
| 테스트 | Vitest | — |

## 공통 규칙

### 1. 언어 및 타입

- TypeScript strict mode 필수. `any` 타입 사용 금지 — `unknown` + 타입 가드 사용
- 두 프로젝트 모두 ES2022 타겟, ESM 모듈 사용

### 2. 코드 변경 후 검증 (서브 에이전트 실행 기준)

작업 완료 후 반드시 아래 검증 커맨드를 실행한다. 서브 에이전트가 수행할 때는 **한 줄 원라이너**로 실행한다:

```bash
# 백엔드 전체 검증 (원라이너 — 서브 에이전트용)
cd flow-backend && npm run typecheck && npm run test && npm run lint

# 프론트엔드 전체 검증 (원라이너 — 서브 에이전트용)
cd flow-front && npx tsc -b && npm run lint && npm run build

# 풀스택 전체 검증 (원라이너 — 서브 에이전트용)
cd flow-backend && npm run typecheck && npm run test && npm run lint && cd ../flow-front && npx tsc -b && npm run lint && npm run build
```

개별 실행이 필요한 경우:

| 프로젝트 | 커맨드 | 용도 | 필수 여부 |
|---|---|---|---|
| 백엔드 | `cd flow-backend && npm run typecheck` | 타입 체크 | 필수 |
| 백엔드 | `cd flow-backend && npm run test` | 단위 테스트 | 도메인/유스케이스 변경 시 |
| 백엔드 | `cd flow-backend && npm run lint` | 코드 스타일 | 필수 |
| 프론트엔드 | `cd flow-front && npx tsc -b` | 타입 체크 | 필수 |
| 프론트엔드 | `cd flow-front && npm run lint` | 코드 스타일 | 필수 |
| 프론트엔드 | `cd flow-front && npm run build` | 빌드 검증 | 필수 |

### 3. 프론트-백엔드 연동

- 백엔드 API 응답 타입이 변경되면 프론트엔드 `src/api/types.ts`도 동기화해야 한다
- API 엔드포인트 경로가 변경되면 프론트엔드 `src/api/` 모듈도 함께 수정한다
- 프론트엔드 dev 서버는 `/api` 프록시를 통해 `http://localhost:3000`으로 연결된다

### 4. 커밋 & PR 규칙

- 프론트/백엔드 변경이 함께 필요한 경우 하나의 PR로 묶는다
- 커밋 메시지에 변경 범위를 명시한다: `feat(backend):`, `fix(frontend):`, `feat(full-stack):` 등

### 5. 금지 사항 (전역)

- `any` 타입 사용 금지
- 비밀값(API 키, 토큰 등)을 코드에 하드코딩 금지 — 환경 변수 사용
- 에이전트 인프라에서 ANTHROPIC_API_KEY 등 API 키 인증 사용 금지 — OAuth(`claude` CLI 로그인) 전용
- 프론트엔드에서 백엔드 내부 도메인 로직을 재구현하지 않는다 — API를 통해서만 상호작용
- ui-백엔드 통합 테스트에서 모킹 금지. 실제 에이전트 사용

### 6. 문서 관리 규칙

- `docs/` — 사람이 직접 관리하는 설계 문서를 보관한다. 에이전트가 임의로 수정하지 않는다.
- `README.md` — 사람이 관리하는 개발자 가이드. 에이전트가 임의로 수정하지 않는다.
- `manual-test-sc/screenshots/` — 수동 테스트 스크린샷 저장 경로. 루트에 직접 저장하지 않는다.
- `evaluates/{project}/` — 프로젝트 평가 리포트를 순번으로 저장한다.
- `loop-save/` — Ralph Loop 프롬프트를 `{주제}-prompt.txt` 형식으로 저장한다.
