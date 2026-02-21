import { execFileSync } from 'child_process';

export function isWindows(): boolean {
  return process.platform === 'win32';
}

/**
 * OS에 맞는 실행 파일 탐색 명령(`where` / `which`)을 실행하여
 * 실행 파일의 절대 경로를 반환한다.
 *
 * Windows에서는 `.cmd` / `.exe` 확장자를 우선 선택한다.
 *
 * 보안: execFileSync를 사용하여 shell injection을 방지한다.
 */
export function resolveExecutablePath(name: string): string {
  const command = isWindows() ? 'where' : 'which';
  const lines = execFileSync(command, [name], { encoding: 'utf-8' }).trim().split(/\r?\n/);

  if (isWindows()) {
    return lines.find((l) => /\.(cmd|exe)$/i.test(l)) ?? lines[0];
  }
  return lines[0];
}
