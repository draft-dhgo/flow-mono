# FlowFlow → 개발 온톨로지 플랫폼 진화 구상

## Context

FlowFlow는 현재 **워크플로우 기반 AI 에이전트 실행 관리 플랫폼**이다.
- Workflow → WorkDefinition → TaskDefinition 계층 구조
- Claude 에이전트가 순차적으로 작업 실행, MCP 도구 활용
- 도메인 이벤트, 체크포인트/복원, 리포트 생성, Git 통합

파운드리의 온톨로지는 3개 레이어(시멘틱/키네틱/다이나믹)로 구성되어 조직의 디지털 트윈을 구축한다.

**핵심 질문**: FlowFlow의 개발 프로세스 자체가 온톨로지를 구축하고 자가 발전하게 하려면?

---

## 가설 1: 실행 흔적(Execution Trace)이 곧 온톨로지다

### 전제
> "개발 과정에서 에이전트가 남기는 모든 흔적이 자동으로 온톨로지 오브젝트가 된다"

현재 FlowFlow는 이미 풍부한 실행 데이터를 생성한다:
- AgentLogEntry (tool_use, tool_result, assistant_text)
- Report (구조화된 마크다운)
- Git diff (코드 변경)
- Domain Events (상태 전이 기록)

이 데이터를 **수동으로 모델링하지 않고**, 실행 과정에서 자동 추출하는 것이 핵심이다.

### 온톨로지 매핑

| 파운드리 개념 | FlowFlow 매핑 |
|---|---|
| **Object Type** | CodeEntity (함수/클래스/모듈), Issue, Workflow, AgentSession, Tool |
| **Property** | 코드 메트릭, 변경 빈도, 에이전트 성공률, 실행 시간 |
| **Link** | `modifies(Agent→Code)`, `depends_on(Code→Code)`, `resolves(Workflow→Issue)`, `uses(Task→Tool)` |
| **Dynamic Property** | 실행 중 변화하는 값 — 에이전트 토큰 사용량, 코드 복잡도 변화 |

### 자가 발전 메커니즘

```
에이전트 실행 → AgentLog에 tool_use 기록
  → "어떤 파일을 읽었는가?" → CodeEntity 오브젝트 생성/갱신
  → "어떤 도구를 썼는가?" → Tool 오브젝트와 uses 링크 생성
  → "어떤 코드를 변경했는가?" → modifies 링크 + diff 속성
  → 다음 실행 시 이 온톨로지를 참조하여 컨텍스트 제공
```

### 구체적 아키텍처 변화

1. **OntologyExtractor 서비스**: `AgentLogEmitter`의 버퍼를 가로채서 tool_use/tool_result에서 엔티티와 링크를 추출
2. **OntologyStore**: 그래프 DB 또는 인메모리 그래프로 오브젝트/링크 저장
3. **QueryAugmenter**: 태스크 쿼리 전송 전에 온톨로지에서 관련 컨텍스트를 자동 주입

### 위험과 한계
- 에이전트 로그 파싱의 정확도 — 비정형 데이터에서 엔티티 추출이 noisy
- 온톨로지가 급격히 커지면 검색 성능 문제
- 잘못된 링크가 누적되면 오히려 에이전트 성능 저하

---

## 가설 2: 워크플로우가 온톨로지의 키네틱 레이어다

### 전제
> "워크플로우 정의 자체가 '어떻게 개발하는가'의 시멘틱 모델이고, 실행이 키네틱 레이어다"

파운드리에서 키네틱 레이어는 "AI-driven action & function, process of mining & automation"이다.
FlowFlow의 워크플로우는 이미 이 구조를 갖고 있다:
- WorkDefinition = 하나의 AI-driven action
- TaskDefinition = 구체적 function/query
- MCP Server = 외부 도구와의 인터페이스 (OPI에 해당)

### 부족한 것: 시멘틱 레이어와 다이나믹 레이어

**시멘틱 레이어 구축 방향:**
```
현재: Workflow는 "이름 + 설명 + 작업 순서"만 가짐
미래: Workflow가 온톨로지 오브젝트 타입을 정의

예시:
  Workflow "버그 수정" 는 다음을 정의:
    - Input Object: Issue (속성: severity, component, reporter)
    - Process Object: Investigation → Fix → Verification
    - Output Object: PullRequest (속성: files_changed, test_coverage)
    - Link: Issue --resolved_by--> PullRequest
```

**다이나믹 레이어 구축 방향:**
```
현재: 체크포인트에서 복원하여 재실행만 가능
미래: "이 워크플로우에 Work를 하나 더 추가하면 품질이 어떻게 변할까?"를 시뮬레이션

시뮬레이션 = 과거 실행 데이터 기반으로 예상 결과 추정:
  - 비슷한 이슈에서 이 워크플로우 변형의 성공률은?
  - 토큰 비용 vs 품질 트레이드오프는?
  - 특정 MCP 도구 추가 시 예상 효과는?
```

### 자가 발전 메커니즘

```
워크플로우 A를 10번 실행 → 결과 패턴 축적
  → "3번째 Work에서 항상 실패하고 재시도함" 패턴 발견
  → 시스템이 "Work 2.5를 삽입하면 성공률 80%→95%"를 제안
  → 사용자 승인 → 워크플로우 자동 업데이트
  → 이 개선이 다시 온톨로지에 기록됨
```

### 구체적 아키텍처 변화

1. **WorkflowTemplate 도메인**: 현재 Workflow를 "템플릿"으로 승격, 실행 결과에서 학습
2. **ExecutionPattern 분석기**: 반복 실행에서 성공/실패 패턴 추출
3. **WorkflowAdvisor**: 패턴 기반으로 워크플로우 개선 제안

### 위험과 한계
- 실행 횟수가 적으면 통계적 의미 없음
- 워크플로우 변형의 효과를 정확히 예측하기 어려움
- 자동 제안이 도메인 컨텍스트를 모르면 위험

---

## 가설 3: 코드베이스가 시멘틱 레이어, 에이전트가 하이드레이터

### 전제
> "코드베이스 자체가 온톨로지의 시멘틱 레이어이고, 에이전트가 이를 탐색/변경하면서 온톨로지를 활성화(hydrate)한다"

파운드리에서 온톨로지 하이드레이션은 "다양한 데이터 소스를 통합하여 온톨로지에 생명을 불어넣는 것"이다.

소프트웨어 개발에서:
- **데이터 소스** = 소스 코드, Git 히스토리, 이슈 트래커, CI/CD 로그, 테스트 결과, 문서
- **하이드레이션** = 에이전트가 이 소스들을 읽고 관계를 파악하여 온톨로지를 구축

### 온톨로지 구조

```
시멘틱 레이어 (코드베이스의 구조적 이해):
  ┌─ Module("workflow-runtime")
  │   ├─ has_class → WorkflowRun
  │   │   ├─ has_method → start(), pause(), resume()
  │   │   ├─ depends_on → WorkExecution
  │   │   └─ emits → WorkflowRunStarted, WorkflowRunCompleted
  │   └─ has_class → WorkflowPipelineService
  │       ├─ orchestrates → WorkExecution
  │       └─ uses_tool → AgentService
  │
  ├─ Issue("FLOW-123: 체크포인트 복원 버그")
  │   ├─ affects → WorkflowRun.restoreToCheckpoint()
  │   ├─ severity → HIGH
  │   └─ resolved_by → PR#45
  │
  └─ Pattern("실패한 태스크 재시도 패턴")
      ├─ observed_in → [Run#1, Run#5, Run#12]
      ├─ success_rate → 0.73
      └─ recommended_fix → "쿼리에 이전 실패 로그 포함"
```

### 자가 발전: 에이전트가 온톨로지를 쓰고, 온톨로지가 에이전트를 안내

```
Phase 1 — 초기 하이드레이션:
  에이전트가 코드를 처음 탐색할 때:
    Read(file) → CodeEntity 오브젝트 생성
    AST 분석 → depends_on 링크 생성
    Git blame → authored_by, modified_at 속성

Phase 2 — 실행 중 강화:
  에이전트가 버그를 수정할 때:
    "이 함수는 항상 이 테스트와 함께 변경됨" → co_changes 링크
    "이 모듈 변경 시 저 모듈도 영향받음" → impacts 링크

Phase 3 — 온톨로지 기반 안내:
  새 태스크 실행 시:
    온톨로지 조회 → "이 이슈와 관련된 코드, 과거 유사 이슈의 해결 방법"
    → 에이전트 쿼리에 자동 주입
    → 더 정확한 결과 → 온톨로지 강화 (선순환)
```

### 구체적 아키텍처 변화

1. **CodeGraph 도메인**: 코드 엔티티와 관계를 저장하는 새로운 Bounded Context
2. **HydrationPipeline**: 에이전트 실행 결과에서 코드 그래프를 업데이트하는 파이프라인
3. **OntologyQueryService**: 태스크 실행 전 관련 온톨로지 정보를 조회하는 서비스
4. **MCP Tool**: 에이전트가 직접 온톨로지를 읽고 쓸 수 있는 MCP 서버

### 위험과 한계
- 코드베이스 크기에 따른 초기 하이드레이션 비용
- AST 분석의 언어별 복잡도
- 온톨로지와 실제 코드의 동기화 (stale data 위험)

---

## 가설 4: 이벤트 소싱이 데이터 리니지, 프로세스 메모리가 온톨로지

### 전제
> "모든 도메인 이벤트를 영구 저장하면 그 자체가 데이터 리니지이고, 이벤트 스트림에서 패턴을 추출하면 그것이 온톨로지다"

현재 FlowFlow는 이미 도메인 이벤트를 발행하고, PersistentEventPublisher가 DomainEvent 테이블에 저장한다. 이것을 확장하면:

### 이벤트 → 리니지 → 온톨로지

```
이벤트 스트림 (시간순):
  t1: WorkflowCreated(wf-1, "버그수정 플로우")
  t2: WorkflowRunStarted(run-1, wf-1, issue="FLOW-99")
  t3: WorkExecutionStarted(we-1, run-1, seq=0)
  t4: QueryResponded(we-1, task=0, tokens=5000)
  t5: AgentLog(we-1, tool_use="Read", target="workflow-run.ts")
  t6: AgentLog(we-1, tool_use="Edit", target="workflow-run.ts:L45")
  t7: WorkExecutionCompleted(we-1)
  t8: CheckpointCreated(cp-1, we-1)
  ...

리니지 추출:
  "FLOW-99를 해결하기 위해 wf-1 플로우가 사용됨"
  "workflow-run.ts:L45가 수정됨 (we-1에서)"
  "이 수정은 cp-1으로 체크포인트됨"

온톨로지 패턴 추출:
  "workflow-run.ts는 최근 5번의 run에서 3번 수정됨" → hot_file
  "FLOW-99 타입의 이슈는 평균 2개 Work로 해결됨" → issue_complexity
  "Read → Edit → Test 패턴이 성공률 90%임" → best_practice
```

### 파운드리 매핑

| 파운드리 기능 | FlowFlow 매핑 |
|---|---|
| **데이터 리니지** | 이벤트 스트림의 시간순 추적 + correlationId 기반 인과 관계 |
| **오래된 데이터 vs 최신 데이터** | 이벤트 타임스탬프 기반 데이터 신선도 |
| **접근 규칙** | 이벤트 기반 권한 추적 (누가 어떤 워크플로우를 실행했는가) |
| **write-back** | 온톨로지 분석 결과가 다시 워크플로우 정의에 반영 |

### 자가 발전 메커니즘

```
이벤트 축적 → 패턴 마이닝 (주기적 배치 또는 실시간)
  → "특정 유형의 이슈에서 특정 워크플로우 변형이 더 효과적"
  → WorkflowAdvisor가 제안
  → 사용자 승인 → 새 워크플로우 생성
  → 새 실행 → 새 이벤트 → 패턴 갱신 (피드백 루프)
```

### 구체적 아키텍처 변화

1. **EventStore 강화**: 현재 DomainEvent 테이블에 correlationId, causationId 체계적 부여
2. **EventProjection**: 이벤트 스트림에서 읽기 모델(온톨로지 뷰) 생성
3. **PatternMiner**: 이벤트 시퀀스에서 반복 패턴 추출
4. **LineageViewer**: 프론트엔드에서 데이터/실행 리니지를 시각화

### 위험과 한계
- 이벤트 볼륨이 커지면 저장/쿼리 비용
- 패턴 마이닝의 통계적 유의미성을 확보하려면 충분한 실행 데이터 필요
- 인과 관계 추론의 정확도

---

## 가설 5: MCP가 OPI, FlowFlow가 온톨로지 플랫폼

### 전제
> "MCP 프로토콜이 파운드리의 OPI(Ontology Programming Interface)에 해당하고, FlowFlow는 MCP 생태계의 중앙 온톨로지 허브가 된다"

파운드리에서 외부 리소스는 OPI를 통해 온톨로지와 상호작용한다.
FlowFlow에서 MCP 서버는 이미 에이전트에 도구를 제공하는 인터페이스다.

### 확장 구상

```
현재:
  MCP Server = 에이전트에 도구를 제공하는 외부 서비스
  에이전트 → MCP tool_use → 결과

미래:
  MCP Server = 온톨로지의 읽기/쓰기 인터페이스

  ontology-mcp-server:
    tools:
      - query_ontology(type, filter) → 관련 오브젝트 반환
      - create_object(type, properties) → 새 오브젝트 생성
      - create_link(from, to, type) → 링크 생성
      - get_lineage(objectId) → 리니지 추적
      - get_patterns(context) → 관련 패턴 반환
      - simulate(workflow_change) → 변경 영향 예측
```

### 에이전트가 온톨로지를 직접 구축

```
에이전트 실행 중:
  1. query_ontology("CodeEntity", {path: "workflow-run.ts"})
     → 이 파일의 변경 이력, 관련 이슈, 의존 관계 반환

  2. 에이전트가 코드를 분석하면서:
     create_object("Pattern", {name: "retry-with-backoff", code: "..."})
     create_link("workflow-run.ts", "Pattern:retry-with-backoff", "implements")

  3. 다른 에이전트가 나중에:
     get_patterns({context: "error-handling"})
     → "retry-with-backoff" 패턴 발견 → 재사용
```

### 파운드리 매핑

| 파운드리 기능 | FlowFlow 매핑 |
|---|---|
| **OPI** | MCP Protocol (ontology-mcp-server) |
| **Application SDK** | MCP 기반 로우코드 앱 빌더 |
| **Quiver App** | 온톨로지 탐색 프론트엔드 (ReactFlow 활용) |
| **Code Workbook** | 현재 WorkDefinition/TaskDefinition 확장 |

### 자가 발전 메커니즘

```
에이전트 A가 패턴을 발견 → MCP로 온톨로지에 기록
  → 에이전트 B가 유사 작업 시 온톨로지 조회 → 패턴 활용
  → 더 나은 결과 → 패턴의 success_rate 증가
  → 시스템이 높은 success_rate 패턴을 자동으로 워크플로우에 반영
```

### 위험과 한계
- MCP 서버가 온톨로지 병목이 될 수 있음
- 에이전트가 생성한 온톨로지의 품질 관리
- MCP 프로토콜의 성숙도

---

## 종합: 추천 진화 경로

### 레이어별 매핑 정리

```
┌─────────────────────────────────────────────────────────┐
│  다이나믹 레이어 (가설 2, 4)                              │
│  시나리오 시뮬레이션, 워크플로우 최적화 제안, What-if 분석    │
│  ← 충분한 실행 데이터 축적 후 가능 (Phase 3)               │
├─────────────────────────────────────────────────────────┤
│  키네틱 레이어 (가설 1, 5)                                │
│  에이전트 실행, MCP 도구, 실시간 모니터링, 자동화            │
│  ← 현재 FlowFlow가 이미 갖고 있는 것 (Phase 1-2 강화)     │
├─────────────────────────────────────────────────────────┤
│  시멘틱 레이어 (가설 3, 4)                                │
│  코드 엔티티, 관계, 패턴, 이슈, 이벤트 리니지               │
│  ← 에이전트 실행 부산물에서 자동 추출 (Phase 1-2)          │
└─────────────────────────────────────────────────────────┘
```

### 3단계 진화 로드맵

**Phase 1 — 관찰 (Observe): 실행 흔적 수집 체계화**
- 현재 이벤트 시스템에 correlationId/causationId 체계 도입
- AgentLogEntry에서 tool_use 대상(파일, 함수)을 구조화하여 저장
- 실행 결과(성공/실패, 토큰 사용량, 소요시간)를 체계적으로 집계
- **변경 범위**: EventPublisher, AgentLogEmitter, 새로운 ExecutionMetrics VO

**Phase 2 — 추출 (Extract): 온톨로지 하이드레이션**
- Phase 1의 데이터에서 엔티티와 링크를 추출하는 파이프라인
- CodeEntity, Pattern, IssueContext 등 오브젝트 타입 정의
- 이벤트 프로젝션으로 온톨로지 뷰 생성
- ontology-mcp-server로 에이전트가 온톨로지 직접 접근
- **변경 범위**: 새 Bounded Context (ontology), MCP 서버, EventProjection

**Phase 3 — 활용 (Leverage): 온톨로지 기반 자가 발전**
- 태스크 쿼리에 온톨로지 컨텍스트 자동 주입
- 실행 패턴 분석 → 워크플로우 최적화 제안
- 시나리오 시뮬레이션 (과거 데이터 기반)
- 온톨로지 탐색 UI (ReactFlow 기반 그래프 뷰)
- **변경 범위**: QueryAugmenter, WorkflowAdvisor, SimulationEngine, 프론트엔드 온톨로지 뷰어

### 핵심 설계 원칙

1. **자동 추출 우선**: 사용자가 수동으로 온톨로지를 구축하는 것이 아니라, 개발 과정의 부산물로 자연스럽게 생성
2. **점진적 정밀도**: 처음에는 거친(coarse) 온톨로지에서 시작, 실행이 쌓이면서 정밀해짐
3. **피드백 루프**: 온톨로지 → 더 나은 에이전트 실행 → 더 풍부한 온톨로지 (선순환)
4. **기존 아키텍처 존중**: DDD + Hexagonal + Vertical Slice 패턴 유지, 온톨로지를 새 Bounded Context로 추가
