import type { PresignedUrlRequestDto } from "@/shared/api/generated";

/**
 * presign 발급 용도 수기 상수 래퍼 (MSG-329, 티켓 확정 — BE 확인 요청 3).
 * 스웨거가 purpose를 enum이 아닌 pattern 문자열로 선언해 생성 타입이 `purpose?: string`으로
 * 풀린다 — 오타를 컴파일 타임에 막을 수 없어 유효값을 여기 한 곳에 고정한다.
 * enum 선언이 반영돼 생성 타입이 좁혀지면 satisfies가 어긋남을 잡는다.
 */
export const PRESIGN_PURPOSE = {
  /** 업로드 확정용 (기본값 — 요청에서 생략하면 서버가 UPLOAD로 처리) */
  upload: "UPLOAD",
  /** 하이라이트 선분석 원본용 — 전용 크기 상한(기본 2GiB) 적용 */
  highlightPreview: "HIGHLIGHT_PREVIEW",
} as const satisfies Record<
  string,
  NonNullable<PresignedUrlRequestDto["purpose"]>
>;
