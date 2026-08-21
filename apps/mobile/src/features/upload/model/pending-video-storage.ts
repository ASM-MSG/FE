import type { KeyValueStorage } from "./upload-flow-storage";

/**
 * 처리 대기 영상 보관소 (MSG-429 기준 8) — 확정 후 서버 블러 처리를 기다리는 videoId를
 * 기기에 남겨, 앱을 종료했다 켜도 완료 확인 경로가 끊기지 않게 한다.
 * 웹 `shared/storage.ts`의 `pendingVideoStorage`(MSG-329) 대응이며 목록 연산·형상 검증
 * 의미를 `pending-video-storage.parity.test.ts`가 값으로 고정한다.
 *
 * 저장소는 **포트로 주입받는다** — 네이티브 모듈(AsyncStorage)을 모델에 직접 들여오면
 * 순수 모델 테스트가 불가능해진다(`upload-flow-storage`의 `KeyValueStorage` 선례).
 * 세 함수 모두 **총함수**다(절대 reject하지 않음): 저장소 접근 실패·손상 값은 "대기 없음"
 * 으로 폴백한다. 대기 목록을 못 읽는 것이 알림을 못 받는 이유는 돼도, 앱이 죽을 이유는 아니다.
 */

export interface PendingVideo {
  videoId: number;
  /** 폴링 기산점(확정 시각) — 15분 만료 판정을 재진입 후에도 이어가기 위해 저장한다 */
  startedAtMs: number;
}

/** 웹 키(`fillmap.upload.pending:v1`)와 별개다 — 저장소 자체가 기기 로컬로 분리돼 있다 */
export const PENDING_VIDEO_STORAGE_KEY = "fillmap.upload.pending";

/**
 * 보관 항목 상한 (스펙 R7) — 15분 만료 전에 앱이 종료되고 다시 안 열리면 항목이 남는다.
 * `isPollExpired`가 재진입 시 즉시 만료로 정리하지만, 그마저 안 도는 경로에서 목록이
 * 무한히 자라지 않게 오래된 쪽부터 버린다. 웹에는 없는 모바일 전용 방어다(parity 편차).
 */
export const MAX_PENDING_VIDEOS = 20;

const isPendingVideo = (value: unknown): value is PendingVideo =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as PendingVideo).videoId === "number" &&
  typeof (value as PendingVideo).startedAtMs === "number";

/** 저장 문자열 → 목록. 없음·손상·형상 불일치는 전부 빈 목록이다 (웹 `list`와 동일 판정) */
export const parsePendingVideos = (raw: string | null): PendingVideo[] => {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isPendingVideo)) return [];
    return parsed;
  } catch {
    return [];
  }
};

/** 추가 — 같은 videoId가 있으면 제거 후 뒤에 붙인다(중복 없음, 갱신 의미) */
export const addPendingVideo = (
  list: PendingVideo[],
  entry: PendingVideo,
): PendingVideo[] => [
  ...list.filter((item) => item.videoId !== entry.videoId),
  entry,
];

/** READY/FAILED/만료 처리 후 제거 — 없는 id는 무해하다 */
export const removePendingVideo = (
  list: PendingVideo[],
  videoId: number,
): PendingVideo[] => list.filter((item) => item.videoId !== videoId);

export interface PendingVideoStorage {
  list: () => Promise<PendingVideo[]>;
  /** 기록 후 갱신된 목록을 돌려준다 — 호출부(스토어)가 재조회 없이 상태를 맞춘다 */
  add: (entry: PendingVideo) => Promise<PendingVideo[]>;
  remove: (videoId: number) => Promise<PendingVideo[]>;
}

export const createPendingVideoStorage = (
  storage: KeyValueStorage,
): PendingVideoStorage => {
  const read = async (): Promise<PendingVideo[]> => {
    try {
      return parsePendingVideos(
        await storage.getItem(PENDING_VIDEO_STORAGE_KEY),
      );
    } catch {
      return [];
    }
  };

  const write = async (list: PendingVideo[]): Promise<PendingVideo[]> => {
    // 상한 초과분은 오래된 쪽(앞)부터 버린다 — 최근 업로드의 완료 확인이 더 중요하다
    const capped =
      list.length > MAX_PENDING_VIDEOS
        ? list.slice(list.length - MAX_PENDING_VIDEOS)
        : list;
    try {
      await storage.setItem(PENDING_VIDEO_STORAGE_KEY, JSON.stringify(capped));
    } catch {
      // best-effort — 저장 실패로 폴링 자체를 막지 않는다 (재진입 복원만 못 할 뿐)
    }
    return capped;
  };

  return {
    list: read,
    add: async (entry) => write(addPendingVideo(await read(), entry)),
    remove: async (videoId) => write(removePendingVideo(await read(), videoId)),
  };
};
