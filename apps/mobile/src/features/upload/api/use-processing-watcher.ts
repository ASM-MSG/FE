import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getPlayback } from "../../../shared/api/sdk";
import { processingStore } from "../model/processing-persistence";
import {
  dismissProcessingNotice,
  pushProcessingNotice,
  type ProcessingNotice,
} from "../model/processing-notice";
import {
  startProcessingPoll,
  type ProcessingPollHandle,
} from "../model/processing-poll";
import { usePendingVideos } from "../model/processing-store";
import { invalidateGridQueries } from "./invalidate-grid-queries";

/**
 * 블러 처리 폴링 워처 (MSG-429 기준 9·10·13) — 루트 상주(어느 화면에 있든 유지).
 * 웹 `features/upload/api/use-processing-watcher.ts`(MSG-329)의 모바일 대응이다.
 *
 * 대기 스토어를 구독해 항목마다 30초 폴링을 돌리고, READY/FAILED/만료 전이 시 목록에서
 * 제거하고 통지를 쌓는다. **웹과의 유일한 실질 차이는 재개 신호**다 — 웹은
 * `document.visibilitychange`, 모바일은 `AppState`의 `active` 복귀다. 플랫폼 API를 이
 * api 계층에 격리하고 판정은 model(`processing-poll`·`processing-notice`)에 둔다.
 */
export const useProcessingWatcher = () => {
  const queryClient = useQueryClient();
  const pending = usePendingVideos(processingStore);
  const [notices, setNotices] = useState<ProcessingNotice[]>([]);
  // 폴 핸들 맵 lazy 초기화 — useRef(new Map())은 렌더마다 버려지는 Map을 만든다(웹 환류)
  const handlesRef = useRef<Map<number, ProcessingPollHandle> | null>(null);
  const getHandles = () => (handlesRef.current ??= new Map());

  const addNotice = useCallback((notice: ProcessingNotice) => {
    setNotices((prev) => pushProcessingNotice(prev, notice));
  }, []);

  // 앱 재진입 복원 — 저장소의 대기 목록을 상태로 (기준 8)
  useEffect(() => {
    void processingStore.hydrate();
  }, []);

  // 대기 목록 ↔ 폴 핸들 동기화 — 새 항목은 폴링 시작(+즉시 1회), 사라진 항목은 중지
  useEffect(() => {
    const handles = getHandles();
    for (const entry of pending) {
      if (handles.has(entry.videoId)) continue;
      // 마지막 조회의 gridId 보관 — READY 시 격자 쿼리 갱신용 (기준 13)
      const lastGridId = { current: null as string | null };
      const settle = (kind: ProcessingNotice["kind"]) => {
        void processingStore.untrack(entry.videoId);
        addNotice({ kind, videoId: entry.videoId });
      };
      const handle = startProcessingPoll({
        fetchStatus: async () => {
          const { data } = await getPlayback({
            path: { videoId: entry.videoId },
            throwOnError: true,
          });
          const playback = unwrapEnvelope(data);
          lastGridId.current = playback.gridId;
          return playback.processingStatus;
        },
        onReady: () => {
          // 블러 완료로 서버 READY 필터가 풀렸다 — 격자 상세를 신선 조회시킨다.
          // 확정 시점 무효화의 재조회는 READY 전이라 비어 있었으므로 여기서 한 번 더 필요하다
          if (lastGridId.current !== null) {
            invalidateGridQueries(queryClient, lastGridId.current);
          }
          settle("ready");
        },
        onFailed: () => settle("failed"),
        onTimeout: () => settle("delayed"),
        startedAtMs: entry.startedAtMs,
      });
      handles.set(entry.videoId, handle);
      // 등록 즉시 1회 조회 — 재진입 항목의 상태를 바로 반영한다
      void handle.checkNow();
    }
    for (const [videoId, handle] of handles) {
      if (!pending.some((entry) => entry.videoId === videoId)) {
        handle.stop();
        handles.delete(videoId);
      }
    }
  }, [pending, addNotice, queryClient]);

  // 포그라운드 복귀 — 대기 목록 재수화 + 즉시 조회 (기준 10)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void processingStore.hydrate();
      for (const handle of getHandles().values()) {
        void handle.checkNow();
      }
    });
    return () => subscription.remove();
  }, []);

  // 언마운트 시 전체 폴링 중지
  useEffect(() => {
    const handles = getHandles();
    return () => {
      for (const handle of handles.values()) handle.stop();
      handles.clear();
    };
  }, []);

  const dismissNotice = useCallback((videoId: number) => {
    setNotices((prev) => dismissProcessingNotice(prev, videoId));
  }, []);

  return { notices, dismissNotice };
};
