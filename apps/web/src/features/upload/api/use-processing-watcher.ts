import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { getPlayback } from "@/shared/api/generated/sdk.gen";
import {
  type ProcessingPollHandle,
  startProcessingPoll,
} from "../model/processing-poll";
import { useProcessingStore } from "../model/processing-store";
import { invalidateGridQueries } from "./invalidate-grid-queries";

/** 워처가 화면에 띄울 통지 — READY(확인 유도)/FAILED(재업로드 유도)/만료(지연 안내) */
export type ProcessingNotice =
  | { kind: "ready"; videoId: number; playbackUrl: string | null }
  | { kind: "failed"; videoId: number }
  | { kind: "delayed"; videoId: number };

/**
 * 블러 처리 폴링 워처 (MSG-329 B14~B17) — AppLayout 상주(모달이 닫혀도 유지).
 * 처리 대기 스토어(pendingVideoStorage 미러)를 구독해 항목마다 30초 폴링을 돌리고,
 * READY/FAILED/만료 전이 시 목록에서 제거(B15)하고 통지를 쌓는다.
 * 탭 포커스 복귀·재진입 시 즉시 조회한다(visibilitychange + hydrate).
 * 웹 전용 API(document 가시성)는 이 api 계층에 격리한다 — 판정 로직은 model(processing-poll).
 */
export const useProcessingWatcher = () => {
  const queryClient = useQueryClient();
  const pending = useProcessingStore((s) => s.pending);
  const hydrate = useProcessingStore((s) => s.hydrate);
  const untrack = useProcessingStore((s) => s.untrack);
  const [notices, setNotices] = useState<ProcessingNotice[]>([]);
  // 폴 핸들 맵 lazy 초기화 — useRef(new Map())은 렌더마다 버려지는 Map을 만든다
  // (react-doctor 환류). 읽기는 전부 effect 안이라 렌더 중 ref 접근도 없다
  const handlesRef = useRef<Map<number, ProcessingPollHandle> | null>(null);
  const getHandles = () => (handlesRef.current ??= new Map());

  const pushNotice = useCallback((notice: ProcessingNotice) => {
    setNotices((prev) => [
      ...prev.filter((item) => item.videoId !== notice.videoId),
      notice,
    ]);
  }, []);

  // 앱 재진입 복원 — 스토리지의 대기 목록을 상태로 (B15)
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // 대기 목록 ↔ 폴 핸들 동기화 — 새 항목은 폴링 시작(+즉시 1회 조회), 사라진 항목은 중지
  useEffect(() => {
    const map = getHandles();
    for (const entry of pending) {
      if (map.has(entry.videoId)) continue;
      // 마지막 조회의 playbackUrl·gridId 보관 — READY 통지의 재생 소스(B16)와 격자 쿼리 갱신용
      const lastPlaybackUrl = { current: null as string | null };
      const lastGridId = { current: null as string | null };
      const handle = startProcessingPoll({
        fetchStatus: async () => {
          const { data } = await getPlayback({
            path: { videoId: entry.videoId },
            throwOnError: true,
          });
          const playback = unwrapEnvelope(data);
          lastPlaybackUrl.current = playback.playbackUrl;
          lastGridId.current = playback.gridId;
          return playback.processingStatus;
        },
        onReady: () => {
          untrack(entry.videoId);
          // 블러 완료로 서버 READY 필터가 풀렸다 — 격자 상세(대표 영상 등)를 신선 조회시킨다.
          // 확정 시점 무효화의 재조회는 READY 전이라 비어 있었으므로 여기서 한 번 더 필요하다
          if (lastGridId.current !== null) {
            invalidateGridQueries(queryClient, lastGridId.current);
          }
          pushNotice({
            kind: "ready",
            videoId: entry.videoId,
            playbackUrl: lastPlaybackUrl.current,
          });
        },
        onFailed: () => {
          untrack(entry.videoId);
          pushNotice({ kind: "failed", videoId: entry.videoId });
        },
        onTimeout: () => {
          untrack(entry.videoId);
          pushNotice({ kind: "delayed", videoId: entry.videoId });
        },
        startedAtMs: entry.startedAtMs,
      });
      map.set(entry.videoId, handle);
      // 등록 즉시 1회 조회 — 재진입 항목의 상태를 바로 반영 (확정 직후 항목은 pending으로 무해)
      void handle.checkNow();
    }
    for (const [videoId, handle] of map) {
      if (!pending.some((entry) => entry.videoId === videoId)) {
        handle.stop();
        map.delete(videoId);
      }
    }
  }, [pending, untrack, pushNotice, queryClient]);

  // 탭 포커스 복귀 — 대기 목록 재수화 + 즉시 조회 (B15)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      hydrate();
      for (const handle of getHandles().values()) {
        void handle.checkNow();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [hydrate]);

  // 언마운트 시 전체 폴링 중지
  useEffect(() => {
    const map = getHandles();
    return () => {
      for (const handle of map.values()) handle.stop();
      map.clear();
    };
  }, []);

  const dismissNotice = useCallback((videoId: number) => {
    setNotices((prev) => prev.filter((item) => item.videoId !== videoId));
  }, []);

  return { notices, dismissNotice };
};
