#!/bin/bash
# 예약 실행 스크립트 — generate-loop-prompt 스킬이 PROMPT_FILE을 자동 설정한다.
# 사용법: ./reserve.sh [hours] [minutes]
# 예시:   ./reserve.sh 2 30     (2시간 30분 후 실행)
#         ./reserve.sh 0 10     (10분 후 실행)
#         ./reserve.sh           (기본값: 10분 후 실행)

PROMPT_FILE="loop-save/backend-evaluation-improvements-prompt.txt"

HOURS=${1:-0}
MINUTES=${2:-10}

if [ ! -f "$PROMPT_FILE" ]; then
  echo "오류: 프롬프트 파일을 찾을 수 없습니다: $PROMPT_FILE"
  echo ""
  echo "사용 가능한 프롬프트 파일:"
  ls loop-save/*.txt 2>/dev/null
  exit 1
fi

echo "프롬프트: $PROMPT_FILE"
TOTAL_SECONDS=$(( HOURS * 3600 + MINUTES * 60 ))

if [ $TOTAL_SECONDS -gt 0 ]; then
  echo "실행 예정: ${HOURS}시간 ${MINUTES}분 후"
  while [ $TOTAL_SECONDS -gt 0 ]; do
    H=$(( TOTAL_SECONDS / 3600 ))
    M=$(( (TOTAL_SECONDS % 3600) / 60 ))
    S=$(( TOTAL_SECONDS % 60 ))
    printf "\r남은 시간: %02d:%02d:%02d " $H $M $S
    sleep 1
    TOTAL_SECONDS=$(( TOTAL_SECONDS - 1 ))
  done
  printf "\r남은 시간: 00:00:00 \n"
fi

echo "실행 시작!"

{ echo "/ralph-loop:ralph-loop"; echo "\""; cat "$PROMPT_FILE"; echo "\""; } | claude --dangerously-skip-permissions
