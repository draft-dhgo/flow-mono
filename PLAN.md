# 리포트 파일 심링크 참조 기능 구현 계획

## 개요
Work 노드가 이전 Work 노드의 Task 리포트 파일을 심링크로 받을 수 있도록, **데이터 모델 → API → 런타임 실행 → 프론트엔드 UI** 전체를 구현한다.

- **참조 단위**: Work 단위 (해당 Work의 모든 Task 리포트를 심링크)
- **적용 범위**: 워크플로우 편집기 + 런타임 양쪽 모두
- **참조 제약**: 자신보다 앞선(order가 작은) Work 노드만 참조 가능
- **UI 방식**: 패널의 체크박스 UI + 캔버스에 참조 엣지 시각화

---

## Phase 1: Backend 데이터 모델

### 1-1. Workflow 도메인 (워크플로우 정의 레이어)

**`flow-backend/src/workflow/domain/value-objects/work-definition.ts`**
- `WorkDefinition`에 `reportFileRefs: readonly number[]` 추가 (참조할 이전 Work의 order 배열)
- `create()`, `fromProps()` 시그니처에 `reportFileRefs` 파라미터 추가
- getter 추가: `get reportFileRefs(): readonly number[]`
- 불변성 패턴 유지 (Object.freeze)

### 1-2. Workflow Runtime 도메인 (런타임 레이어)

**`flow-backend/src/workflow-runtime/domain/value-objects/work-node-config.ts`**
- `WorkNodeConfig`에 `reportFileRefs: readonly number[]` 추가 (참조할 이전 Work의 sequence 배열)
- `WorkNodeConfigProps`, `CreateWorkNodeConfigProps` 인터페이스에 `reportFileRefs` 추가
- `create()`, `fromProps()` 에서 `reportFileRefs` 처리
- `withReportFileRefs(refs: number[]): WorkNodeConfig` 빌더 메서드 추가
- `toProps()`에 `reportFileRefs` 포함

---

## Phase 2: Backend API 레이어

### 2-1. Workflow API DTO

**`flow-backend/src/workflow/presentation/dto/create-workflow.dto.ts`**
- `WorkDefinitionDto`에 `reportFileRefs?: number[]` 추가

**`flow-backend/src/workflow/presentation/workflow.controller.ts`**
- `toWorkDefinition()`에서 `reportFileRefs` 전달

### 2-2. Workflow Runtime API DTO

**`flow-backend/src/workflow-runtime/presentation/dto/edit-work-node-config.dto.ts`**
- `EditWorkNodeConfigDto`에 `reportFileRefs?: number[]` 추가

**`flow-backend/src/workflow-runtime/presentation/dto/add-work-node.dto.ts`**
- `AddWorkNodeDto`에 `reportFileRefs?: number[]` 추가

### 2-3. API 응답

**Workflow 응답 (GetWorkflowQuery)**
- `workDefinitions[].reportFileRefs` 포함

**WorkflowRun 응답 (WorkNodeConfigSummary)**
- `workNodeConfigs[].reportFileRefs` 포함

---

## Phase 3: Backend 런타임 실행 로직

### 3-1. WorkflowRunFactory

**`flow-backend/src/workflow-runtime/application/factories/workflow-run-factory.ts`**
- `WorkNodeConfig.create()` 호출 시 `reportFileRefs` 전달 (WorkDefinition에서 복사)

### 3-2. EditWorkNodeConfigUseCase

**`flow-backend/src/workflow-runtime/application/commands/edit-work-node-config-use-case.ts`**
- `command.reportFileRefs` 가 있으면 `config.withReportFileRefs()` 호출

### 3-3. StartNextWorkExecutionUseCase - 리포트 심링크 생성

**`flow-backend/src/workflow-runtime/application/commands/start-next-work-execution-use-case.ts`**

WorkTree symlink 생성 로직 아래에 리포트 파일 심링크 로직 추가:

```
// Report file symlink 생성
const reportFileRefs = currentConfig.reportFileRefs;
if (reportFileRefs.length > 0) {
  const reportsDir = buildPath(workSpacePath, 'reports');
  await fileSystem.createDirectory(reportsDir);

  for (const sourceSequence of reportFileRefs) {
    const sourceWorkExecutionId = run.workExecutionIds[sourceSequence];
    if (!sourceWorkExecutionId) continue;

    const reports = await reportRepository.findByWorkExecutionId(sourceWorkExecutionId);
    for (const report of reports) {
      if (report.status !== 'COMPLETED' || !report.filePath) continue;

      const linkPath = buildPath(reportsDir, `work-${sourceSequence}`, basename(report.filePath));
      await fileSystem.createDirectory(dirname(linkPath));
      await fileSystem.createSymlink(report.filePath, linkPath);

      const symLink = SymLink.create(LinkType.SHARED_RESOURCE, sourceWorkExecutionId, report.filePath, linkPath);
      workSpace.addLink(symLink);
    }
  }
}
```

### 3-4. ReportRepository 확장

- `findByWorkExecutionId(workExecutionId: string): Promise<Report[]>` 메서드 추가 (이미 있다면 확인)

---

## Phase 4: Frontend 데이터 타입

### 4-1. API 타입

**`flow-front/src/api/types.ts`**

```typescript
// WorkDefinitionInput에 추가
export interface WorkDefinitionInput {
  ...
  reportFileRefs?: number[];
}

// WorkflowResponse의 workDefinitions에 추가
workDefinitions: {
  ...
  reportFileRefs: number[];
}[];

// WorkNodeConfigSummary에 추가
export interface WorkNodeConfigSummary {
  ...
  reportFileRefs: number[];
}

// EditWorkNodeConfigRequest에 추가
export interface EditWorkNodeConfigRequest {
  ...
  reportFileRefs?: number[];
}

// AddWorkNodeRequest에 추가
export interface AddWorkNodeRequest {
  ...
  reportFileRefs?: number[];
}
```

---

## Phase 5: Frontend - 워크플로우 편집기 UI

### 5-1. Zod 스키마 & 폼 기본값 업데이트

**`flow-front/src/pages/WorkflowFlowEditorPage.tsx`**

- `workflowFormSchema`의 `workDefinitions` 아이템에 `reportFileRefs: z.array(z.number()).optional()` 추가
- `defaultValues`와 `form.reset()` 로직에 `reportFileRefs` 포함
- `handleAddWork()`에서 새 Work 추가 시 `reportFileRefs: []` 초기값 설정

### 5-2. ReportRefLinkPanel 컴포넌트 (새 파일)

**`flow-front/src/components/flow/panels/ReportRefLinkPanel.tsx`**

GitRefLinkPanel과 동일한 패턴으로 구현:
- Props: `form`, `workIndex`, `workDefinitions` (모든 work 목록)
- 자기보다 order가 작은 Work 중, task에 reportOutline이 있는 것만 목록에 표시
- 체크박스로 토글 → `form.setValue(`workDefinitions.${workIndex}.reportFileRefs`, [...])`

### 5-3. WorkNodePanel에 ReportRefLinkPanel 추가

**`flow-front/src/components/flow/panels/WorkNodePanel.tsx`**

- Props에 `workDefinitions` 추가
- GitRefLinkPanel과 McpRefLinkPanel 사이에 ReportRefLinkPanel 배치

### 5-4. WorkflowFlowEditorPage에서 workDefinitions 전달

- `<WorkNodePanel>`에 `workDefinitions={form.watch('workDefinitions')}` prop 추가

---

## Phase 6: Frontend - 런타임 편집 UI

### 6-1. RuntimeWorkNodePanel에 리포트 참조 추가

**`flow-front/src/components/flow/panels/RuntimeWorkNodePanel.tsx`**

- Props에 `allWorkNodeConfigs` 추가 (전체 WorkNodeConfig 배열)
- 폼 defaultValues에 `reportFileRefs` 추가
- 이전 Work 노드 목록을 표시하는 체크박스 UI 추가 (sequence < 현재 sequence)
- `handleSubmit`에서 `reportFileRefs` 포함하여 전송

### 6-2. WorkflowRunFlowPage에서 전달

- `<RuntimeWorkNodePanel>`에 `allWorkNodeConfigs={runDetail.workNodeConfigs}` 전달

---

## Phase 7: Frontend - 리포트 참조 엣지 시각화

### 7-1. ReportRefEdge 컴포넌트 (새 파일)

**`flow-front/src/components/flow/edges/ReportRefEdge.tsx`**

- 점선 + 보라색 (#a78bfa) 스타일
- 화살표 마커 포함
- `getBezierPath` 사용 (smooth step이 아닌 곡선으로 시각적 구분)

### 7-2. 엣지 타입 등록

**`flow-front/src/components/flow/FlowCanvas.tsx`**
```typescript
const edgeTypes = {
  sequence: SequenceEdge,
  reportRef: ReportRefEdge,  // 추가
};
```

### 7-3. 엣지 색상 상수 추가

**`flow-front/src/components/flow/constants.ts`**
- `REPORT_REF_EDGE_COLOR = '#a78bfa'` 추가

### 7-4. useWorkflowToFlow 수정

**`flow-front/src/components/flow/hooks/useWorkflowToFlow.ts`**

기존 로직 끝에 reportFileRef 엣지 생성 추가:
```typescript
// Report reference edges
for (const work of workDefs) {
  const refs = work.reportFileRefs ?? [];
  for (const sourceOrder of refs) {
    edges.push({
      id: `reportRef-${sourceOrder}->${work.order}`,
      source: `work-${sourceOrder}`,
      target: `work-${work.order}`,
      sourceHandle: 'spine',
      type: 'reportRef',
    });
  }
}
```

### 7-5. useWorkflowRunToFlow 수정

**`flow-front/src/components/flow/hooks/useWorkflowRunToFlow.ts`**

동일하게 workNodeConfigs에서 reportRef 엣지 생성.

### 7-6. WorkNodeData에 reportFileRefCount 추가

**`flow-front/src/components/flow/types.ts`**
- `WorkNodeData`에 `reportFileRefCount?: number` 추가

### 7-7. WorkNode 노드에 리포트 참조 아이콘 표시

**`flow-front/src/components/flow/nodes/WorkNode.tsx`**
- `FileText` 아이콘 + count 표시 (gitRefCount, mcpServerRefCount와 동일 패턴)

---

## Phase 8: 검증

### 8-1. Backend 검증
```bash
cd flow-backend && npm run typecheck && npm run test && npm run lint
```

### 8-2. Frontend 검증
```bash
cd flow-front && npx tsc -b && npm run lint && npm run build
```

---

## 파일 변경 목록 (총 ~20개)

### Backend (수정)
1. `flow-backend/src/workflow/domain/value-objects/work-definition.ts` - reportFileRefs 추가
2. `flow-backend/src/workflow/presentation/dto/create-workflow.dto.ts` - DTO 확장
3. `flow-backend/src/workflow/presentation/workflow.controller.ts` - 매핑 로직
4. `flow-backend/src/workflow/application/queries/get-workflow-query.ts` - 응답에 포함
5. `flow-backend/src/workflow-runtime/domain/value-objects/work-node-config.ts` - reportFileRefs 추가
6. `flow-backend/src/workflow-runtime/presentation/dto/edit-work-node-config.dto.ts` - DTO 확장
7. `flow-backend/src/workflow-runtime/presentation/dto/add-work-node.dto.ts` - DTO 확장
8. `flow-backend/src/workflow-runtime/presentation/workflow-runtime.controller.ts` - 응답 매핑
9. `flow-backend/src/workflow-runtime/application/factories/workflow-run-factory.ts` - 팩토리 매핑
10. `flow-backend/src/workflow-runtime/application/commands/edit-work-node-config-use-case.ts` - 빌더 호출
11. `flow-backend/src/workflow-runtime/application/commands/start-next-work-execution-use-case.ts` - 심링크 생성

### Frontend (수정)
12. `flow-front/src/api/types.ts` - 타입 확장
13. `flow-front/src/pages/WorkflowFlowEditorPage.tsx` - 스키마 + prop 전달
14. `flow-front/src/components/flow/panels/WorkNodePanel.tsx` - ReportRefLinkPanel 배치
15. `flow-front/src/components/flow/panels/RuntimeWorkNodePanel.tsx` - 리포트 참조 UI
16. `flow-front/src/components/flow/hooks/useWorkflowToFlow.ts` - 엣지 생성
17. `flow-front/src/components/flow/hooks/useWorkflowRunToFlow.ts` - 엣지 생성
18. `flow-front/src/components/flow/FlowCanvas.tsx` - 엣지 타입 등록
19. `flow-front/src/components/flow/constants.ts` - 색상 상수
20. `flow-front/src/components/flow/types.ts` - 노드 데이터 타입
21. `flow-front/src/components/flow/nodes/WorkNode.tsx` - 아이콘 표시

### Frontend (새 파일)
22. `flow-front/src/components/flow/panels/ReportRefLinkPanel.tsx` - 참조 설정 패널
23. `flow-front/src/components/flow/edges/ReportRefEdge.tsx` - 참조 엣지 컴포넌트
