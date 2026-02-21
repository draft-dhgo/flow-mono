import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SRC_ROOT = path.resolve(__dirname, '../../src');

const FEATURES = ['workflow', 'workflow-runtime', 'git', 'mcp', 'agent', 'workspace'] as const;
const FEATURE_ALIASES = FEATURES.map((f) => `@${f}/`);

// ── helpers ──────────────────────────────────────────────────────────

function collectFiles(dir: string, ext = '.ts'): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, ext));
    } else if (entry.name.endsWith(ext) && !entry.name.endsWith('.d.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

/** 주어진 파일에서 import/export 구문의 모듈 경로를 추출한다. */
function extractImportPaths(filePath: string): { path: string; line: number }[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const imports: { path: string; line: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // import ... from 'xxx' / export ... from 'xxx'
    const match = line.match(/(?:import|export)\s+.*from\s+['"]([^'"]+)['"]/);
    if (match) {
      imports.push({ path: match[1], line: i + 1 });
    }
    // dynamic import('xxx')
    const dynamicMatch = line.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (dynamicMatch) {
      imports.push({ path: dynamicMatch[1], line: i + 1 });
    }
  }
  return imports;
}

/** 파일이 속한 feature를 반환한다. */
function featureOf(filePath: string): string | null {
  const rel = path.relative(SRC_ROOT, filePath);
  for (const f of FEATURES) {
    if (rel.startsWith(`${f}/`) || rel.startsWith(`${f}\\`)) return f;
  }
  return null;
}

/** 파일이 속한 레이어를 반환한다. */
function layerOf(filePath: string): string | null {
  const rel = path.relative(SRC_ROOT, filePath);
  const parts = rel.split(path.sep);
  if (parts.length >= 2) return parts[1]; // domain | application | infra | presentation
  return null;
}

function relPath(filePath: string): string {
  return path.relative(path.resolve(SRC_ROOT, '..'), filePath);
}

// ── tests ────────────────────────────────────────────────────────────

describe('Architecture Rules', () => {
  const allSrcFiles = collectFiles(SRC_ROOT);

  const domainFiles = allSrcFiles.filter((f) => layerOf(f) === 'domain');
  const applicationFiles = allSrcFiles.filter((f) => layerOf(f) === 'application');
  const featureFiles = allSrcFiles.filter((f) => featureOf(f) !== null);

  // ────────────────────────────────────────────────────────────────────
  // 규칙 1: 도메인 간 직접 import 금지
  // presentation(*.module.ts)에서만 다른 feature를 import할 수 있다.
  // ────────────────────────────────────────────────────────────────────
  describe('도메인 간 직접 import 금지', () => {
    it('domain 레이어는 다른 feature를 직접 import하지 않는다 (@common만 허용)', () => {
      const violations: string[] = [];

      for (const file of domainFiles) {
        const feature = featureOf(file);
        const imports = extractImportPaths(file);

        for (const imp of imports) {
          for (const alias of FEATURE_ALIASES) {
            const aliasFeature = alias.slice(1, -1); // '@git/' → 'git'
            if (imp.path.startsWith(alias) && aliasFeature !== feature) {
              violations.push(
                `${relPath(file)}:${imp.line} → ${imp.path} (${feature} domain이 ${aliasFeature}를 직접 참조)`,
              );
            }
          }
        }
      }

      expect(violations, `도메인 간 직접 import 위반:\n${violations.join('\n')}`).toHaveLength(0);
    });

    it('application 레이어는 다른 feature를 직접 import하지 않는다 (@common만 허용)', () => {
      const violations: string[] = [];

      for (const file of applicationFiles) {
        const feature = featureOf(file);
        const imports = extractImportPaths(file);

        for (const imp of imports) {
          for (const alias of FEATURE_ALIASES) {
            const aliasFeature = alias.slice(1, -1);
            if (imp.path.startsWith(alias) && aliasFeature !== feature) {
              violations.push(
                `${relPath(file)}:${imp.line} → ${imp.path} (${feature} application이 ${aliasFeature}를 직접 참조)`,
              );
            }
          }
        }
      }

      expect(violations, `application 레이어 간 직접 import 위반:\n${violations.join('\n')}`).toHaveLength(0);
    });

    it('infra 레이어에서 다른 feature를 직접 import하지 않는다 (@common만 허용)', () => {
      const violations: string[] = [];
      const infraFiles = allSrcFiles.filter((f) => layerOf(f) === 'infra');

      for (const file of infraFiles) {
        const feature = featureOf(file);
        const imports = extractImportPaths(file);

        for (const imp of imports) {
          for (const alias of FEATURE_ALIASES) {
            const aliasFeature = alias.slice(1, -1);
            if (imp.path.startsWith(alias) && aliasFeature !== feature) {
              violations.push(
                `${relPath(file)}:${imp.line} → ${imp.path} (${feature} infra가 ${aliasFeature}를 직접 참조)`,
              );
            }
          }
        }
      }

      expect(violations, `infra 레이어 간 직접 import 위반:\n${violations.join('\n')}`).toHaveLength(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // 규칙 2: 도메인 레이어 순수성 — NestJS/인프라 라이브러리 사용 금지
  // ────────────────────────────────────────────────────────────────────
  describe('도메인 레이어 순수성', () => {
    const FORBIDDEN_IN_DOMAIN = [
      '@nestjs',
      'typeorm',
      'class-validator',
      'class-transformer',
      'pg',
      'rxjs',
    ];

    it('domain 레이어는 인프라/프레임워크 라이브러리를 import하지 않는다', () => {
      const violations: string[] = [];

      for (const file of domainFiles) {
        const imports = extractImportPaths(file);

        for (const imp of imports) {
          for (const forbidden of FORBIDDEN_IN_DOMAIN) {
            if (imp.path.startsWith(forbidden) || imp.path.includes(`/${forbidden}`)) {
              violations.push(`${relPath(file)}:${imp.line} → ${imp.path}`);
            }
          }
        }
      }

      expect(violations, `도메인 레이어 외부 의존성 위반:\n${violations.join('\n')}`).toHaveLength(0);
    });

    it('domain 레이어에서 NestJS 데코레이터를 사용하지 않는다', () => {
      const violations: string[] = [];
      const decoratorPattern = /@(Injectable|Module|Inject|Controller|Get|Post|Put|Delete|Patch)\b/;

      for (const file of domainFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          if (decoratorPattern.test(lines[i])) {
            violations.push(`${relPath(file)}:${i + 1} → ${lines[i].trim()}`);
          }
        }
      }

      expect(violations, `도메인 NestJS 데코레이터 위반:\n${violations.join('\n')}`).toHaveLength(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // 규칙 3: ESM import에 .js 확장자 필수
  // ────────────────────────────────────────────────────────────────────
  describe('ESM import 규칙', () => {
    it('모든 상대/alias import 경로에 .js 확장자가 있다', () => {
      const violations: string[] = [];

      for (const file of featureFiles) {
        const imports = extractImportPaths(file);

        for (const imp of imports) {
          const isRelative = imp.path.startsWith('.');
          const isAlias = imp.path.startsWith('@') && FEATURE_ALIASES.some((a) => imp.path.startsWith(a));
          const isCommonAlias = imp.path.startsWith('@common/');

          if ((isRelative || isAlias || isCommonAlias) && !imp.path.endsWith('.js')) {
            violations.push(`${relPath(file)}:${imp.line} → ${imp.path} (.js 확장자 누락)`);
          }
        }
      }

      expect(violations, `ESM .js 확장자 누락:\n${violations.join('\n')}`).toHaveLength(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // 규칙 4: any 타입 사용 금지 (도메인 + 애플리케이션 레이어)
  // ────────────────────────────────────────────────────────────────────
  describe('타입 안전성', () => {
    it('domain 레이어에서 any 타입을 사용하지 않는다', () => {
      const violations: string[] = [];
      // : any, as any, <any> 패턴 탐지 (주석/문자열 제외는 간단하게 처리)
      const anyPattern = /(?::\s*any\b|as\s+any\b|<any>)/;

      for (const file of domainFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // 주석 라인 건너뛰기
          if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;
          if (anyPattern.test(line)) {
            violations.push(`${relPath(file)}:${i + 1} → ${line.trim()}`);
          }
        }
      }

      expect(violations, `도메인 레이어 any 타입 사용:\n${violations.join('\n')}`).toHaveLength(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // 규칙 5: 레이어 의존 방향 (domain ← application ← infra/presentation)
  // domain은 application, infra, presentation을 import하지 않는다.
  // application은 infra, presentation을 import하지 않는다.
  // ────────────────────────────────────────────────────────────────────
  describe('레이어 의존 방향', () => {
    it('domain은 application/infra/presentation을 import하지 않는다', () => {
      const violations: string[] = [];
      const forbiddenLayers = ['/application/', '/infra/', '/presentation/'];

      for (const file of domainFiles) {
        const imports = extractImportPaths(file);

        for (const imp of imports) {
          if (imp.path.startsWith('.')) {
            const resolved = path.resolve(path.dirname(file), imp.path);
            const relResolved = path.relative(SRC_ROOT, resolved);

            for (const forbidden of forbiddenLayers) {
              if (relResolved.includes(forbidden.slice(1, -1))) {
                violations.push(`${relPath(file)}:${imp.line} → ${imp.path} (domain이 상위 레이어 참조)`);
              }
            }
          }
        }
      }

      expect(violations, `레이어 의존 방향 위반 (domain → 상위):\n${violations.join('\n')}`).toHaveLength(0);
    });

    it('application은 infra/presentation을 import하지 않는다', () => {
      const violations: string[] = [];

      for (const file of applicationFiles) {
        const imports = extractImportPaths(file);

        for (const imp of imports) {
          if (imp.path.startsWith('.')) {
            const resolved = path.resolve(path.dirname(file), imp.path);
            const relResolved = path.relative(SRC_ROOT, resolved);

            if (relResolved.includes('infra') || relResolved.includes('presentation')) {
              violations.push(
                `${relPath(file)}:${imp.line} → ${imp.path} (application이 infra/presentation 참조)`,
              );
            }
          }
        }
      }

      expect(violations, `레이어 의존 방향 위반 (application → infra/presentation):\n${violations.join('\n')}`).toHaveLength(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // 규칙 6: 모듈 의존 방향 (CLAUDE.md에 명시된 의존 관계)
  // workflow-runtime → workflow, mcp, git, agent (OK)
  // workflow → git, mcp (OK)
  // git, mcp → 없음 (다른 feature module을 import하면 위반)
  // ────────────────────────────────────────────────────────────────────
  describe('모듈 의존 방향', () => {
    // workflow ↔ workflow-runtime 는 forwardRef 순환 의존 (WorkflowRunActiveChecker)
    const ALLOWED_MODULE_DEPS: Record<string, string[]> = {
      'workflow': ['git', 'mcp', 'workflow-runtime'],
      'workflow-runtime': ['workflow', 'mcp', 'git', 'agent'],
      'git': [],
      'mcp': [],
      'agent': [],
      'workspace': ['workflow-runtime', 'workflow', 'git', 'mcp', 'agent'],
    };

    it('presentation/*.module.ts의 feature import가 허용된 의존 관계를 따른다', () => {
      const violations: string[] = [];
      const moduleFiles = allSrcFiles.filter(
        (f) => layerOf(f) === 'presentation' && f.endsWith('.module.ts'),
      );

      for (const file of moduleFiles) {
        const feature = featureOf(file);
        if (!feature) continue;
        const allowed = ALLOWED_MODULE_DEPS[feature] ?? [];
        const imports = extractImportPaths(file);

        for (const imp of imports) {
          for (const alias of FEATURE_ALIASES) {
            const aliasFeature = alias.slice(1, -1);
            if (imp.path.startsWith(alias) && aliasFeature !== feature && !allowed.includes(aliasFeature)) {
              violations.push(
                `${relPath(file)}:${imp.line} → ${imp.path} (${feature}가 ${aliasFeature}를 import — 허용: [${allowed.join(', ')}])`,
              );
            }
          }
        }
      }

      expect(violations, `모듈 의존 방향 위반:\n${violations.join('\n')}`).toHaveLength(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // 규칙 7: 공유 포트는 @common/ports에만 정의
  // ────────────────────────────────────────────────────────────────────
  describe('공유 포트 정의 위치', () => {
    it('feature의 domain/ports에 정의된 포트는 다른 feature에서 직접 import되지 않는다', () => {
      const violations: string[] = [];

      for (const file of allSrcFiles) {
        const feature = featureOf(file);
        const imports = extractImportPaths(file);

        for (const imp of imports) {
          // @feature/domain/ports/... 패턴을 다른 feature에서 가져오는지
          const portMatch = imp.path.match(/^@([\w-]+)\/domain\/ports\//);
          if (portMatch) {
            const portFeature = portMatch[1];
            if (feature && portFeature !== feature) {
              violations.push(
                `${relPath(file)}:${imp.line} → ${imp.path} (${feature}가 ${portFeature}의 domain port를 직접 참조)`,
              );
            }
          }
        }
      }

      expect(
        violations,
        `Feature domain port 직접 참조 위반 (공유 포트는 @common/ports에 정의해야 함):\n${violations.join('\n')}`,
      ).toHaveLength(0);
    });
  });
});
