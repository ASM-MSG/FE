/**
 * 테마 시트 콘텐츠 파생 (MSG-298 AC 12·14·17) — 테마 mock → {배지 N, 격자 섹션 배열}.
 * 표시값(업로더 표기·시점·조회수)까지 여기서 확정해 뷰는 그리기만 한다 — 순수 모델.
 */
import { THEME_META, type ThemeId } from "./themes";
import { formatKoreanViewCount, formatUploadTime } from "./theme-format";
import type { ThemeGridEntry, ThemeRepVideo } from "./mock-theme-data";

export interface ThemeSheetVideo {
  durationSec: number;
  /** "내 영상"은 primary 색 강조 — 뷰 분기용 (AC 14) */
  isMine: boolean;
  /** "내 영상" 또는 "@핸들" (AC 14) */
  uploaderLabel: string;
  /** "12분 전"·"2시간 전"·"7월 31일" (AC 15) */
  uploadedAtLabel: string;
  /** "조회 8,600"·"조회 2.4만" (AC 15) */
  viewCountLabel: string;
}

export interface ThemeSheetSection {
  key: string;
  label: string;
  videoCount: number;
  video: ThemeSheetVideo;
}

export interface ThemeSheetModel {
  themeLabel: string;
  themeColor: string;
  /** 배지 우측 "· N개"의 N = 테마 격자 목록 길이 (AC 12) */
  badgeCount: number;
  sections: ThemeSheetSection[];
}

/** 업로더 표기 규칙 (AC 14) — 내 영상이면 "내 영상", 타인 영상이면 @핸들 */
export const uploaderLabelFor = (
  video: Pick<ThemeRepVideo, "isMine" | "uploaderHandle">,
): string => (video.isMine ? "내 영상" : `@${video.uploaderHandle}`);

/** 테마 mock → 시트 콘텐츠 모델. 격자 0개면 빈 섹션 배열 (AC 17). `now` 주입으로 결정적 */
export const buildThemeSheet = (
  theme: ThemeId,
  grids: ThemeGridEntry[],
  now: Date = new Date(),
): ThemeSheetModel => ({
  themeLabel: THEME_META[theme].label,
  themeColor: THEME_META[theme].color,
  badgeCount: grids.length,
  sections: grids.map(({ cell, label, videoCount, video }) => ({
    key: `${cell.col}:${cell.row}`,
    label,
    videoCount,
    video: {
      durationSec: video.durationSec,
      isMine: video.isMine,
      uploaderLabel: uploaderLabelFor(video),
      uploadedAtLabel: formatUploadTime(video.uploadedAt, now),
      viewCountLabel: formatKoreanViewCount(video.viewCount),
    },
  })),
});
