/**
 * 블러 처리 통지 모델 (MSG-429 기준 11·12) — 워처가 만든 통지의 문구·주 행동을 정한다.
 * 웹 `BlurNoticeToast`의 `NOTICE_COPY`(MSG-329) 대응이지만, 웹은 컴포넌트 안에 있고
 * 모바일은 **순수 모델로 뺀다** — RN 렌더 테스트 인프라가 없어(vitest.config 정책)
 * 컴포넌트 안에 두면 문구·목적지 회귀를 잡을 자산이 실기밖에 남지 않는다.
 */

/** READY(확인 유도) / FAILED(재업로드 유도) / 15분 무전이(지연 안내) */
export type ProcessingNoticeKind = "ready" | "failed" | "delayed";

export interface ProcessingNotice {
  kind: ProcessingNoticeKind;
  videoId: number;
}

interface NoticeCopy {
  title: string;
  description: string;
  /** 주 행동 라벨 — 갈 곳이 없는 지연 통지는 null (가짜 버튼 금지) */
  actionText: string | null;
}

/**
 * 통지 문구. 모바일 정본 Figma에 통지 프레임이 없어(스펙 Figma 오탐 방지 3) 웹 MSG-329
 * 문구를 기준으로 하되, 실패 문구에는 **영상이 비공개로 남는다는 사실**을 더한다
 * (티켓 동작 요구 8 — 웹 문구에는 없던 정보다).
 */
export const PROCESSING_NOTICE_COPY: Record<ProcessingNoticeKind, NoticeCopy> =
  {
    ready: {
      title: "AI 블러 처리 완료",
      description: "눌러서 결과를 확인하세요",
      actionText: "확인하기",
    },
    failed: {
      title: "블러 처리에 실패했어요",
      description: "영상은 비공개로 남아 있어요. 다시 업로드해주세요",
      actionText: "다시 업로드",
    },
    delayed: {
      title: "처리가 늦어지고 있어요",
      description: "블러 처리가 계속 진행 중이에요. 잠시 후 다시 확인해주세요",
      actionText: null,
    },
  };

/** 통지 추가 — 같은 영상의 기존 통지는 새 것으로 대체한다 */
export const pushProcessingNotice = (
  notices: ProcessingNotice[],
  notice: ProcessingNotice,
): ProcessingNotice[] => [
  ...notices.filter((item) => item.videoId !== notice.videoId),
  notice,
];

/** 닫기 */
export const dismissProcessingNotice = (
  notices: ProcessingNotice[],
  videoId: number,
): ProcessingNotice[] => notices.filter((item) => item.videoId !== videoId);

/** 주 행동의 목적지 — 없으면 null (지연 통지) */
export const resolveNoticeAction = (
  notice: ProcessingNotice,
): { route: string } | null => {
  if (notice.kind === "ready") {
    return { route: `/upload/blur?videoId=${notice.videoId}` };
  }
  if (notice.kind === "failed") return { route: "/upload" };
  return null;
};
