import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** flow-backend/ 프로젝트 루트 (common/utils/paths.ts 기준 3단계 상위) */
const PROJECT_ROOT = join(__dirname, '..', '..', '..');

/**
 * 프로젝트 루트(flow-backend/) 기반의 기본 경로를 반환한다.
 * 환경변수가 설정되어 있으면 우선 사용하고,
 * 없으면 `flow-backend/` 하위에 `subDir`을 붙여 반환한다.
 *
 * @example
 * tempBasePath('WORKFLOW_SPACES_PATH', 'workflow-spaces')
 * // -> '/path/to/flow-backend/workflow-spaces'
 */
export function tempBasePath(envKey: string, subDir: string): string {
  return process.env[envKey] ?? join(PROJECT_ROOT, subDir);
}

/**
 * `path.join` 래퍼. 플랫폼에 맞는 경로 구분자를 사용한다.
 */
export function buildPath(...segments: string[]): string {
  return join(...segments);
}
