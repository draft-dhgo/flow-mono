# Git 저장소 관리 페이지

## 페이지 목적

Git 저장소를 등록/삭제하는 관리 페이지. 등록된 Git 저장소는 워크플로우에서 참조된다. 참조하는 워크플로우가 있으면 삭제가 차단되며, 참조가 없을 때만 삭제가 가능하다.

## 라우트 경로

```
GET /gits
```

## 와이어프레임

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Sidebar]  │  Git 저장소 관리                      [+ 저장소 등록] │
│             │                                                       │
│             │  ┌───────────────────────────────────────────────────┐ │
│             │  │ URL                      │ Local Path    │ 참조 │⋮│ │
│             │  ├──────────────────────────┼───────────────┼──────┼─┤ │
│             │  │ git@github.com:org/repo  │ /home/user/r  │  3   │⋮│ │
│             │  ├──────────────────────────┼───────────────┼──────┼─┤ │
│             │  │ https://github.com/o/r2  │ /home/user/r2 │  1   │⋮│ │
│             │  ├──────────────────────────┼───────────────┼──────┼─┤ │
│             │  │ git@github.com:org/lib   │ /home/user/li │  0   │⋮│ │
│             │  └──────────────────────────┴───────────────┴──────┴─┘ │
│             │                                                       │
│             │  ── 저장소 등록 (인라인 폼, 또는 다이얼로그) ──────── │
│             │  ┌───────────────────────────────────────────────────┐ │
│             │  │  URL *        [git@github.com:org/new-repo.git ] │ │
│             │  │  Local Path * [/home/user/projects/new-repo    ] │ │
│             │  │                                      [등록]     │ │
│             │  └───────────────────────────────────────────────────┘ │
│             │                                                       │
│             │  ── 삭제 다이얼로그 (참조 있음 → 삭제 차단) ────────── │
│             │  ┌───────────────────────────────────────────────────┐ │
│             │  │  🚫 이 저장소를 참조하는 워크플로우가 있어        │ │
│             │  │  삭제할 수 없습니다.                              │ │
│             │  │                                                   │ │
│             │  │  참조 중인 워크플로우:                            │ │
│             │  │  - 프로젝트 A (PROJ-123)                          │ │
│             │  │  - 프로젝트 B (PROJ-456)                          │ │
│             │  │  - 마이그레이션 (MIG-001)                         │ │
│             │  │                                                   │ │
│             │  │  먼저 해당 워크플로우에서 이 Git 참조를           │ │
│             │  │  제거하세요.                                      │ │
│             │  │                                                   │ │
│             │  │                                        [확인]    │ │
│             │  └───────────────────────────────────────────────────┘ │
│             │                                                       │
│             │  ── 삭제 확인 다이얼로그 (참조 없음 → 삭제 가능) ──── │
│             │  ┌───────────────────────────────────────────────────┐ │
│             │  │  ⚠ 이 저장소를 삭제하시겠습니까?                 │ │
│             │  │                                                   │ │
│             │  │  이 작업은 되돌릴 수 없습니다.                    │ │
│             │  │                                                   │ │
│             │  │                          [취소]  [삭제]           │ │
│             │  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## 컴포넌트 트리

```
GitManagementPage
├── PageHeader (title="Git 저장소 관리", action=<RegisterButton>)
├── GitTable
│   ├── DataTable
│   │   └── GitRow (반복)
│   │       ├── UrlCell (url, 말줄임 + 툴팁)
│   │       ├── LocalPathCell (localPath, 말줄임 + 툴팁)
│   │       ├── RefCountCell (참조하는 워크플로우 수)
│   │       └── RowActions
│   │           └── DeleteAction → GitDeleteDialog
│   └── EmptyState (등록된 저장소가 없을 때)
│
├── GitRegisterDialog (모달)
│   ├── TextField (url, required, validation)
│   ├── TextField (localPath, required)
│   ├── ErrorAlert (등록 실패 시)
│   └── FormActions
│       ├── CancelButton
│       └── SubmitButton ("등록")
│
└── GitDeleteDialog (모달)
    ├── [refCount > 0] BlockedState
    │   ├── BlockedMessage ("참조하는 워크플로우가 있어 삭제할 수 없습니다")
    │   ├── AffectedWorkflowList (참조하는 워크플로우 이름 목록)
    │   └── FormActions
    │       └── ConfirmButton ("확인", 다이얼로그 닫기)
    └── [refCount === 0] AllowedState
        ├── WarningMessage ("이 저장소를 삭제하시겠습니까?")
        └── FormActions
            ├── CancelButton
            └── DeleteButton ("삭제", destructive)
```

## 필요 API 호출

| API | 용도 | 호출 시점 |
|-----|------|-----------|
| `GET /gits` | Git 저장소 목록 조회 | 페이지 로드 |
| `POST /gits` | Git 저장소 등록 | 등록 폼 제출 |
| `DELETE /gits/:id` | Git 저장소 삭제 | 삭제 확인 후 |
| `GET /workflows` | 참조하는 워크플로우 조회 (삭제 가능 여부 확인 및 차단 목록 표시용) | 삭제 버튼 클릭 시 |

**추가 필요 API:**
- `GET /gits` — Git 저장소 목록 (id, url, localPath 포함)
- `GET /gits/:id/workflows` (선택적) — 특정 Git을 참조하는 워크플로우 목록. 없으면 클라이언트에서 워크플로우 목록을 필터링.

## 상태 관리

```typescript
// 목록 쿼리
const { data: gits } = useQuery({
  queryKey: queryKeys.gits.all,
  queryFn: () => gitsApi.list(),
});

// 등록 뮤테이션
const createMutation = useMutation({
  mutationFn: gitsApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.gits.all });
    closeDialog();
  },
});

// 삭제 뮤테이션 (참조하는 워크플로우가 없을 때만 호출)
const deleteMutation = useMutation({
  mutationFn: (id: string) => gitsApi.delete(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.gits.all });
  },
  onError: (error) => {
    // 400/409: 참조하는 워크플로우가 있어 삭제 불가 (UI에서 사전 차단하지만 방어 코드)
  },
});

// UI 상태
const [isRegisterOpen, setIsRegisterOpen] = useState(false);
const [deleteTarget, setDeleteTarget] = useState<Git | null>(null);
```

## 폼 유효성 검증

```typescript
const gitFormSchema = z.object({
  url: z.string()
    .min(1, 'URL은 필수입니다')
    .refine(
      (v) => /^(https?:\/\/.+|git:\/\/.+|ssh:\/\/.+|git@.+:.+)$/.test(v),
      'Git URL 형식이 올바르지 않습니다 (https, git, ssh, git@ 형식 지원)',
    ),
  localPath: z.string()
    .min(1, 'Local path는 필수입니다')
    .refine(
      (v) => v.startsWith('/'),
      '절대 경로를 입력하세요 (/로 시작)',
    ),
});
```

## 사용자 인터랙션 흐름

1. **페이지 진입** → Git 저장소 목록 로드
2. **"저장소 등록" 클릭** → 등록 다이얼로그 열림
3. **URL, Local Path 입력** → 실시간 유효성 검증 → "등록" 클릭
4. **등록 성공** → 다이얼로그 닫힘 + 목록 새로고침 + 토스트 알림
5. **등록 실패** → 다이얼로그 내 에러 메시지 표시 (ex: "이미 등록된 URL")
6. **삭제 (⋮ → 삭제)** → 참조하는 워크플로우 목록 조회 → 삭제 다이얼로그
7. **참조 있음 (refCount > 0)** → 삭제 차단 안내 + 참조 워크플로우 목록 표시 → "확인" 클릭으로 다이얼로그 닫기
8. **참조 없음 (refCount === 0)** → 삭제 확인 다이얼로그 → "삭제" 클릭 → `DELETE` 호출 → 목록 새로고침
