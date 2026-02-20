---
name: "evaluate"
description: "프로젝트를 종합 평가하여 evaluates/ 디렉토리에 리포트를 생성한다. 백엔드 또는 프론트엔드 프로젝트를 지정할 수 있다."
---

# Evaluate Project

지정된 프로젝트(backend 또는 frontend)를 종합 평가하여 `evaluates/{project}/` 디렉토리에 리포트를 생성한다.

## 사용법

사용자가 "백엔드 평가", "프론트엔드 평가", 또는 "전체 평가"를 요청하면 이 스킬을 실행한다.
프로젝트를 지정하지 않으면 사용자에게 물어본다.

## 실행 절차

### 1단계: 번호 결정

`evaluates/{project}/` 디렉토리에서 가장 높은 숫자의 파일명을 찾고, +1한 3자리 숫자로 새 파일명을 정한다 (예: 002.md → 003.md).

### 2단계: 데이터 수집 (병렬 실행)

**중요: 경로 규칙**

모든 Bash 커맨드는 **프로젝트 디렉토리의 절대 경로**를 사용한다. `cd` 후 상대 경로를 쓰면 이전 명령의 CWD 변경으로 실패할 수 있다.

```bash
# 프로젝트 루트 절대 경로 변수 (개념적)
PROJECT_ROOT=$(git rev-parse --show-toplevel)
BACKEND="${PROJECT_ROOT}/flow-backend"
FRONTEND="${PROJECT_ROOT}/flow-front"
```

**도구 사용 규칙:**
- 파일 수 세기: Glob 도구 또는 `find {절대경로} -name '*.ts' | wc -l`
- 코드 라인 수: `find {절대경로} -name '*.ts' -exec cat {} + | wc -l`
- 패턴 검색: Grep 도구 (path 파라미터에 절대 경로 사용)
- 명령어 실행: Bash 도구 — `cd {절대경로} && npm run ...` 형식 사용

**백엔드 평가 시 — 아래 항목을 최대한 병렬 실행:**

1. 검증 커맨드 (각각 별도 Bash 호출로 병렬 실행):
   - `cd ${BACKEND} && npm run typecheck` — 타입 체크 결과
   - `cd ${BACKEND} && npm run lint` — ESLint 결과 (에러/경고 수, 구체적 파일과 문제)
   - `cd ${BACKEND} && npm run test` — 테스트 결과 (통과/실패 수, 실패 원인)

2. 코드 통계 (Bash + Grep/Glob 도구 병렬 실행):
   - 소스 파일 수: `find ${BACKEND}/src -name '*.ts' | wc -l`
   - 테스트 파일 수: `find ${BACKEND}/tests -name '*.test.ts' | wc -l`
   - 소스 코드 라인: `find ${BACKEND}/src -name '*.ts' -exec cat {} + | wc -l`
   - 테스트 코드 라인: `find ${BACKEND}/tests -name '*.ts' -exec cat {} + | wc -l`
   - 모듈별 파일 수와 라인 수: `for dir in ${BACKEND}/src/*/; do ...`

3. 품질 검사 (Grep 도구로 병렬 실행):
   - `as any` 사용처: Grep(pattern="as any", path="${BACKEND}/src")
   - 도메인 간 직접 import 위반: Task(Explore) 서브에이전트로 검색

4. 아키텍처 참조 (Read 도구로 병렬 실행):
   - 이전 리포트: `evaluates/backend/{최신번호}.md`
   - 백엔드 CLAUDE.md: `flow-backend/CLAUDE.md`

**프론트엔드 평가 시 — 아래 항목을 최대한 병렬 실행:**

1. 검증 커맨드 (각각 별도 Bash 호출로 병렬 실행):
   - `cd ${FRONTEND} && npx tsc -b` — 타입 체크 결과
   - `cd ${FRONTEND} && npm run lint` — ESLint 결과
   - `cd ${FRONTEND} && npm run build` — 빌드 결과

2. 코드 통계 (Bash/Glob 도구 병렬 실행):
   - 소스 파일 수: `find ${FRONTEND}/src -name '*.ts' -o -name '*.tsx' | wc -l`
   - 컴포넌트 수: Glob(pattern="**/*.tsx", path="${FRONTEND}/src/components")
   - 페이지 수: Glob(pattern="**/*.tsx", path="${FRONTEND}/src/pages")
   - 훅 수: Glob(pattern="**/*.ts", path="${FRONTEND}/src/hooks")
   - API 모듈 수: Glob(pattern="**/*.ts", path="${FRONTEND}/src/api")

3. 품질 검사 (Grep 도구로 병렬 실행):
   - `any` 사용처: Grep(pattern=": any|as any", path="${FRONTEND}/src")
   - 상대 경로 import 위반: Grep(pattern="from '\\.\\./|from '\\./", path="${FRONTEND}/src")

4. 아키텍처 참조 (Read 도구로 병렬 실행):
   - 이전 리포트: `evaluates/frontend/{최신번호}.md`
   - 프론트엔드 CLAUDE.md: `flow-front/CLAUDE.md`

### 3단계: 아키텍처 분석

해당 프로젝트의 CLAUDE.md 규칙을 기준으로 코드를 분석한다.
도메인 간 import 위반, NestJS 데코레이터 검색 등 심층 분석은 **Task(Explore) 서브에이전트**를 활용한다.

**백엔드:**
- Vertical Slice 구조 준수 여부
- DDD 전술 패턴 적용 수준 (Aggregate Root, Value Object, Domain Event, Repository Port 등)
- 헥사고날 아키텍처 준수 (Port/Adapter 분리, infra/presentation 구현 여부)
- 도메인 간 결합도 (직접 import 위반)
- 타입 안전성 (`as any`, Branded Type 우회)
- 코드 컨벤션 일관성

**프론트엔드:**
- 디렉토리 구조 규칙 준수 여부
- API 레이어 격리 (직접 Axios 호출 여부)
- React Query 커스텀 훅 패턴
- 컴포넌트 패턴 (function + named export)
- 상수 중앙 관리 (`lib/constants.ts`)
- 스타일링 패턴 (Tailwind + `cn()`)

### 4단계: 리포트 작성

아래 형식으로 마크다운 리포트를 작성하여 `evaluates/{project}/{번호}.md`에 저장한다.

## 리포트 형식

```markdown
# 프로젝트 평가 리포트 — {YYYY.MM.DD}

## 1. 프로젝트 개요
| 항목 | 내용 |
|------|------|
| 프로젝트명 | {프로젝트명} |
| 언어/런타임 | TypeScript {version} / {런타임} |
| 소스 파일 수 | {N}개 |
| 테스트 파일 수 | {N}개 |
| 총 코드 라인 | ~{N}줄 |
| 아키텍처 | {아키텍처 요약} |

**요약**: {프로젝트 현재 상태를 1-2문장으로 요약}

## 2. 아키텍처 평가
{프로젝트 유형에 따라 적절한 아키텍처 평가 항목 작성}

## 3. 코드 품질 검증
### 3.1 TypeScript 타입 체크
{실제 실행 결과}

### 3.2 ESLint 검사
{실제 실행 결과 + 구체적 이슈 테이블}

### 3.3 테스트 실행 (백엔드) / 빌드 검증 (프론트엔드)
{실제 실행 결과}

## 4. 상세 문제 분석
{발견된 문제들을 심각도별로 분류}
- 🔴 Critical — {즉시 수정 필요}
- 🟡 Warning — {단기 개선 필요}
- 🟢 Info — {참고 사항}

## 5. 강점
{코드베이스의 긍정적 측면을 구체적으로 서술}

## 6. 종합 평가
| 영역 | 점수 | 비고 |
|------|:----:|------|
{각 영역별 A+~F 등급}

### 종합 등급: **{등급}**

## 7. 이전 리포트와 비교
{직전 리포트와 주요 지표 비교 테이블 — 개선/악화 표시}

## 8. 우선순위별 개선 사항
### 🔴 즉시 수정 (P0)
### 🟡 단기 개선 (P1)
### 🟢 중기 개선 (P2)
```

## 평가 등급 기준

- **A+/A/A-**: 모범적, 거의 문제 없음
- **B+/B/B-**: 양호하나 개선 여지 있음
- **C+/C/C-**: 기본은 갖추었으나 문제 다수
- **D+/D/D-**: 심각한 문제 존재
- **F**: 기능하지 않음

## 주의사항

- 실제 명령어 실행 결과에 기반하여 평가하라 (추측 금지)
- 이전 리포트가 있으면 반드시 비교 섹션을 포함하라
- 등급은 객관적 근거와 함께 제시하라
- 한국어로 작성하라
