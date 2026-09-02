/**
 * 발송 완료 화면의 보낸 시각·유효 기간 표기 (MSG-542 AC 10·추정 6).
 *
 * 서버 응답에 시각 정보가 없어(200 unknown) **클라이언트 제출 시각 기준**으로 계산한다 —
 * Figma의 "2026. 9. 18. 10:24"·"10:54까지"는 디자인 시점 예시값이다.
 * 유효 기간 30분은 서버 명세(`reset-request` description)의 값이다.
 */

/** 재설정 링크 유효 시간(분) — 서버 명세 값 */
export const RESET_LINK_VALID_MINUTES = 30;

const pad2 = (value: number): string => value.toString().padStart(2, "0");

const timeLabel = (at: Date): string =>
  `${pad2(at.getHours())}:${pad2(at.getMinutes())}`;

export const resetLinkExpiry = (
  sentAt: Date,
): { sentAtLabel: string; expiresAtLabel: string } => {
  const expiresAt = new Date(
    sentAt.getTime() + RESET_LINK_VALID_MINUTES * 60_000,
  );

  return {
    sentAtLabel: `${sentAt.getFullYear()}. ${sentAt.getMonth() + 1}. ${sentAt.getDate()}. ${timeLabel(sentAt)}`,
    expiresAtLabel: timeLabel(expiresAt),
  };
};
