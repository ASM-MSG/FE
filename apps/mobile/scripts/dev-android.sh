#!/usr/bin/env bash
#
# MSG-449: Android dev client 원커맨드 — 사전 점검 → (필요 시) prebuild → 빌드·설치
#          → Metro 독립 기동(8081 고정) → 패키지 명시 진입.
#
# 절차의 정본과 각 단계가 왜 이렇게 생겼는지는 docs/MOBILE_RUNBOOK.md에 있다.
# 이 스크립트가 원천적으로 피하는 함정 (전부 2026-08-20 실측):
#   - Metro를 `expo run:android`가 물고 있다가 함께 죽는다  → --no-bundler + 별도 프로세스
#   - dev client가 콜드 스타트에서 8081로 복귀한다           → 포트 8081 고정
#   - 구 APK와 `fillmap://` 스킴을 공유해 선택창으로 샌다     → am start에 패키지 명시
#   - `--device`는 adb 시리얼을 안 받는다(물리=모델명/에뮬=AVD명) → 시리얼·모델·expo이름 분리 관리
#   - run:android가 Metro 없는 상태로 앱을 자동 실행해 둔다   → 진입 전 force-stop(콜드 스타트)
#
# 파괴적인 동작(prebuild 재생성 · pm clear · 구 APK 제거)은 기본에 없다. 플래그로만 한다.

set -euo pipefail

readonly PACKAGE="kr.fillmap.app"
readonly LEGACY_PACKAGE="com.anonymous.fillmap"
readonly MAIN_ACTIVITY=".MainActivity"
readonly METRO_PORT=8081

# apps/mobile — 이 스크립트 위치 기준 (어느 디렉토리에서 호출해도 동작한다)
MOBILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly MOBILE_DIR

do_clean=false
do_clear=false
do_purge_legacy=false
skip_build=false
do_launch=true
device_model=""

usage() {
  cat <<'USAGE'
사용법: pnpm --filter mobile android:dev [-- <플래그>...]

기본 동작: 사전 점검 → 빌드·설치 → adb reverse → Metro(8081) → 패키지 명시 진입

플래그
  --clean            expo prebuild -p android 를 먼저 실행해 네이티브 프로젝트를 재생성한다.
                     (prebuild 는 재생성이 기본이다 — 기존 android/ 는 지워진다)
                     새 네이티브 의존성·Expo 플러그인·네이티브 주입 env 키가 바뀌었을 때.
                     android/ 가 없으면 이 플래그 없이도 자동으로 prebuild 한다.
  --clear            adb shell pm clear 로 앱 데이터를 지운다.
                     임베디드 번들 상태가 남아 Metro에 안 붙을 때.
                     ※ SecureStore 토큰까지 지워져 재로그인이 필요하다.
  --purge-legacy     구 APK(com.anonymous.fillmap)를 제거한다.
                     딥링크가 앱 선택창으로 샐 때.
  --device <이름|시리얼>  대상 기기. 기기가 2대 이상이면 필수. 셋 다 받는다:
                       물리 기기  → 모델명 (`adb devices -l` 의 model: 값, 예: SM_S931N)
                       에뮬레이터 → AVD 이름 (`emulator -list-avds`, 예: Pixel_8)
                       공통       → adb 시리얼 (예: emulator-5554, R3CT10ABCDE)
                     같은 모델이 여러 대면 이름으로는 구분이 안 되므로 시리얼을 요구한다.
                     (expo 에는 스크립트가 시리얼을 이름으로 바꿔 넘긴다 — expo 는 시리얼을 안 받는다)
                     지정 없이 2대 이상이면 스크립트가 후보를 출력하고 멈춘다.
  --skip-build       빌드·설치를 건너뛰고 Metro + 진입만 한다 (JS만 고쳤을 때).
  --no-launch        앱 진입을 생략한다 (Metro만 띄운다).
  -h, --help         이 도움말.

자세한 절차와 함정 대응: docs/MOBILE_RUNBOOK.md
USAGE
}

log()  { printf '\033[36m▸\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --clean)        do_clean=true; shift ;;
    --clear)        do_clear=true; shift ;;
    --purge-legacy) do_purge_legacy=true; shift ;;
    --skip-build)   skip_build=true; shift ;;
    --no-launch)    do_launch=false; shift ;;
    --device)       device_model="${2:-}"; [[ -n "$device_model" ]] || die "--device 에 모델명이 필요하다 (adb devices -l 의 model: 값)"; shift 2 ;;
    -h|--help)      usage; exit 0 ;;
    *)              usage >&2; die "알 수 없는 플래그: $1" ;;
  esac
done

# ─────────────────────────────────────────────────────────────
# 1. 사전 점검
# ─────────────────────────────────────────────────────────────

log "사전 점검"

if ! command -v adb >/dev/null 2>&1; then
  die "adb 를 찾을 수 없다. PATH에 추가한다:
       export PATH=\"\$HOME/Library/Android/sdk/platform-tools:\$PATH\""
fi

if [[ ! -f "$MOBILE_DIR/.env" ]]; then
  die ".env 가 없다. 먼저 준비한다:
       cp apps/mobile/.env.example apps/mobile/.env
     네이버 키는 웹 값을 그대로 재사용한다 (변수명만 다르다):
       apps/web/.env.local 의 VITE_NAVER_MAP_NCP_KEY_ID
         → apps/mobile/.env 의 EXPO_PUBLIC_NAVER_MAP_CLIENT_ID
     자세히는 docs/MOBILE_RUNBOOK.md 0-2."
fi

if ! grep -qE '^EXPO_PUBLIC_NAVER_MAP_CLIENT_ID=.+' "$MOBILE_DIR/.env"; then
  warn "EXPO_PUBLIC_NAVER_MAP_CLIENT_ID 가 비어 있다 — 빌드는 되지만 지도 타일 인증이 실패한다 (docs/MOBILE_RUNBOOK.md 0-2)."
fi

# 연결 기기 목록: 시리얼 · adb 모델명 · **expo 이름**.
#
# `expo run:android --device` 는 adb 시리얼을 받지 않는다. 그리고 무엇을 받는지가
# 기기 종류에 따라 다르다 (2026-08-21 실측):
#   - 물리 기기  → `adb devices -l` 의 model: 값     (예: SM_S931N)
#   - 에뮬레이터 → **AVD 이름**                        (예: Pixel_8_2)
# 에뮬레이터에 모델명(sdk_gphone16k_arm64)을 넘기면 expo 가
# "Could not find device with name" 으로 죽는다. 그래서 둘을 따로 관리한다.
list_devices() {
  local serial model expo_name
  while read -r serial model; do
    [[ -z "$serial" ]] && continue
    if [[ "$serial" == emulator-* ]]; then
      expo_name="$(adb -s "$serial" emu avd name 2>/dev/null | head -1 | tr -d '\r')"
    else
      expo_name="$model"
    fi
    printf '%s\t%s\t%s\n' "$serial" "$model" "${expo_name:-$model}"
  done < <(adb devices -l | awk '$2 == "device" { serial = $1; model = "?"; for (i = 3; i <= NF; i++) if ($i ~ /^model:/) { model = substr($i, 7) } print serial, model }')
}

device_lines="$(list_devices)"

if [[ -z "$device_lines" ]]; then
  die "연결된 기기가 없다. 에뮬레이터를 켜거나 USB/무선 디버깅으로 연결한다 (docs/MOBILE_RUNBOOK.md 1)."
fi

device_count="$(printf '%s\n' "$device_lines" | wc -l | tr -d ' ')"
list_hint() { printf '%s\n' "$device_lines" | awk -F'\t' '{ printf "       --device %-24s (serial: %s, model: %s)\n", $3, $1, $2 }'; }

if [[ -n "$device_model" ]]; then
  # 받는 값: adb 시리얼 · expo 이름(에뮬레이터 AVD명/물리 모델명) · adb 모델명 셋 다.
  # 같은 모델을 두 대 꽂아 두면(디바이스 랩에서 흔하다) 이름만으로는 구분이 안 되므로
  # 첫 매치를 조용히 고르지 않고 거부한다 — 시리얼은 항상 유일하다.
  matches="$(printf '%s\n' "$device_lines" | awk -F'\t' -v m="$device_model" '$1 == m || $3 == m || $2 == m { print }')"
  [[ -n "$matches" ]] || die "'$device_model' 에 해당하는 기기가 없다. 연결된 기기:
$(list_hint)"

  match_count="$(printf '%s\n' "$matches" | wc -l | tr -d ' ')"
  if [[ "$match_count" -gt 1 ]]; then
    die "'$device_model' 에 ${match_count}대가 해당한다 (같은 모델을 여러 대 연결한 경우).
     시리얼로 지정한다 — 시리얼은 유일하다:
$(printf '%s\n' "$matches" | awk -F'\t' '{ printf "       --device %s   (model: %s)\n", $1, $2 }')"
  fi
  selected="$matches"
elif [[ "$device_count" -gt 1 ]]; then
  die "기기가 ${device_count}대 연결돼 있다. --device 로 지정한다:
$(list_hint)"
else
  selected="$device_lines"
fi

adb_serial="$(printf '%s' "$selected" | cut -f1)"
device_model="$(printf '%s' "$selected" | cut -f2)"
expo_device="$(printf '%s' "$selected" | cut -f3)"

log "대상 기기: $adb_serial (model: $device_model, expo: $expo_device)"

adb_dev() { adb -s "$adb_serial" "$@"; }

# ─────────────────────────────────────────────────────────────
# 2. 정리 작업 (플래그로만)
# ─────────────────────────────────────────────────────────────

if [[ "$do_purge_legacy" == true ]]; then
  log "구 APK 제거: $LEGACY_PACKAGE"
  adb_dev uninstall "$LEGACY_PACKAGE" >/dev/null 2>&1 \
    && log "  제거됨" \
    || log "  설치돼 있지 않다 (건너뜀)"
elif adb_dev shell pm list packages 2>/dev/null | grep -q "^package:${LEGACY_PACKAGE}$"; then
  warn "구 APK($LEGACY_PACKAGE)가 남아 있다 — fillmap:// 스킴을 공유한다."
  warn "  이 스크립트는 패키지를 명시해 진입하므로 지금은 문제되지 않지만, 아이콘/외부 딥링크로는 선택창이 뜬다."
  warn "  정리하려면: --purge-legacy"
fi

# ─────────────────────────────────────────────────────────────
# 3. prebuild + 빌드 · 설치
# ─────────────────────────────────────────────────────────────

cd "$MOBILE_DIR"

if [[ "$skip_build" == true ]]; then
  log "빌드·설치 건너뜀 (--skip-build)"
else
  # `expo prebuild` 는 SDK 57 기준 **재생성이 기본**이다 (기존 android/ 를 지우고 새로 만든다).
  # opt-out 이 `--no-clean` 이고, `--clean` 이라는 플래그는 없다 — 넘겨도 조용히 무시될 뿐이라
  # 붙이지 않는다. 아래 두 분기가 같은 명령인 이유가 이것이고, 차이는 "언제 도느냐"뿐이다.
  if [[ "$do_clean" == true ]]; then
    log "prebuild (네이티브 프로젝트 재생성 — 기존 android/ 는 지워진다)"
    npx expo prebuild -p android
  elif [[ ! -d "$MOBILE_DIR/android" ]]; then
    log "android/ 가 없다 — prebuild 를 먼저 실행한다"
    npx expo prebuild -p android
  fi

  # --no-bundler: Metro를 물고 있지 않게 한다. 아래 4단계에서 별도로 띄운다.
  log "빌드 · 설치 (expo run:android --no-bundler --device $expo_device)"
  npx expo run:android --no-bundler --device "$expo_device"
fi

# ─────────────────────────────────────────────────────────────
# 4. 앱 데이터 초기화 (플래그로만) + 포트 포워딩
# ─────────────────────────────────────────────────────────────

if [[ "$do_clear" == true ]]; then
  log "앱 데이터 초기화: pm clear $PACKAGE  (로그인 세션도 지워진다)"
  adb_dev shell pm clear "$PACKAGE" >/dev/null
fi

# 기기가 재연결되면 풀린다 — 매번 다시 건다.
log "포트 포워딩: adb reverse tcp:${METRO_PORT} tcp:${METRO_PORT}"
adb_dev reverse "tcp:${METRO_PORT}" "tcp:${METRO_PORT}" >/dev/null

# ─────────────────────────────────────────────────────────────
# 5. Metro 독립 기동 (8081 고정)
# ─────────────────────────────────────────────────────────────

# -sTCP:LISTEN 이 필수다. 이게 없으면 에뮬레이터(qemu·netsimd)가 Metro로 맺은 **연결**까지
# 매치돼 포트가 비어 있는데도 점유로 오판한다 (2026-08-21 실측).
if lsof -ti "tcp:${METRO_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  die "포트 ${METRO_PORT} 을 이미 다른 프로세스가 듣고 있다. dev client 는 콜드 스타트에서 ${METRO_PORT} 로
     되돌아가므로 다른 포트로 우회할 수 없다. 점유 프로세스를 정리한다:
       lsof -ti tcp:${METRO_PORT} -sTCP:LISTEN | xargs kill"
fi

log "Metro 기동 (expo start --dev-client --port ${METRO_PORT})"
npx expo start --dev-client --port "$METRO_PORT" &
metro_pid=$!

# pid 가 metro_pid 의 자손인지 ppid 사슬을 타고 확인한다. 포트를 듣고 있다는 이유만으로
# 죽이면, 우리 Metro 가 뜨기 전에 그 포트를 차지한 무관한 프로세스를 죽일 수 있다.
is_descendant_of_metro() {
  local pid="$1" guard=0
  while [[ -n "$pid" && "$pid" != "0" && "$pid" != "1" && "$guard" -lt 20 ]]; do
    [[ "$pid" == "$metro_pid" ]] && return 0
    pid="$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')"
    guard=$((guard + 1))
  done
  return 1
}

# `npx expo start` 는 실제 Metro 를 손자 프로세스로 띄운다. 직계 자식만 죽이면
# Metro 가 고아로 살아남아 포트를 계속 물고 있다 (2026-08-21 실측 — 다음 실행이 막힌다).
cleanup() {
  trap - EXIT INT TERM
  log "Metro 종료"

  # 먼저 살아 있는 자손 리스너를 찾아 둔다 (부모를 죽이면 ppid 사슬이 끊긴다).
  local listeners=() pid
  while read -r pid; do
    [[ -n "$pid" ]] || continue
    is_descendant_of_metro "$pid" && listeners+=("$pid")
  done < <(lsof -ti "tcp:${METRO_PORT}" -sTCP:LISTEN 2>/dev/null || true)

  if kill -0 "$metro_pid" 2>/dev/null; then
    pkill -P "$metro_pid" 2>/dev/null || true
    kill "$metro_pid" 2>/dev/null || true
  fi

  if [[ ${#listeners[@]} -gt 0 ]]; then
    kill "${listeners[@]}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# Metro가 응답할 때까지 대기 (최대 60초)
for _ in $(seq 1 60); do
  if curl -sf "http://localhost:${METRO_PORT}/status" >/dev/null 2>&1; then
    break
  fi
  kill -0 "$metro_pid" 2>/dev/null || die "Metro 가 기동 중 종료됐다 (위 로그 참조)."
  sleep 1
done

if ! curl -sf "http://localhost:${METRO_PORT}/status" >/dev/null 2>&1; then
  warn "Metro 가 60초 안에 응답하지 않았다 — 계속 진행하지만 앱이 못 붙을 수 있다."
fi

# ─────────────────────────────────────────────────────────────
# 6. 패키지 명시 진입
# ─────────────────────────────────────────────────────────────

if [[ "$do_launch" == true ]]; then
  # 반드시 force-stop 을 먼저 한다. `expo run:android` 는 설치 직후 앱을 자동 실행하는데,
  # 그 시점에는 Metro 가 아직 없다(우리가 --no-bundler 로 분리했으므로). 번들 서버를 못 찾은
  # 그 인스턴스가 top 으로 남아 있으면, 뒤이은 am start 는 새 실행이 아니라 onNewIntent 로
  # 전달만 되고("Activity not started, intent has been delivered to currently running
  # top-most instance") 앱은 검은 화면 그대로다. 콜드 스타트여야 Metro 에 붙는다.
  # (2026-08-21 실측 — 이것 때문에 빌드·설치·Metro 가 다 정상인데 화면만 검게 나왔다)
  log "앱 종료 후 콜드 스타트"
  adb_dev shell am force-stop "$PACKAGE" >/dev/null

  # -n 으로 패키지를 명시한다. 없으면 구 APK와 스킴이 겹쳐 ResolverActivity(선택창)로 샌다.
  log "앱 진입 (패키지 명시 딥링크)"
  adb_dev shell am start \
    -n "${PACKAGE}/${MAIN_ACTIVITY}" \
    -a android.intent.action.VIEW \
    -d "fillmap://expo-development-client/?url=http%3A%2F%2Flocalhost%3A${METRO_PORT}" \
    >/dev/null

  cat <<INFO

  앱이 뜨지 않거나 "Unable to load script" 가 보이면:
    --clear 로 다시 실행한다 (앱 데이터에 임베디드 번들 상태가 남은 경우 — 함정 1)
  로그 보기:
    adb -s ${adb_serial} logcat -s ReactNativeJS:V
  스크린샷:
    adb -s ${adb_serial} exec-out screencap -p > /tmp/shot.png

INFO
fi

log "Metro 실행 중 — Ctrl-C 로 종료한다."
wait "$metro_pid"
