/**
 * 업로드 위저드 모드 분기 문구 파생 (MSG-415) — 순수 함수/상수.
 * 위저드는 일반 업로드와 교체(replaceTarget 유무)가 같은 스텝열을 공유하고,
 * 확정 버튼·완료 모달 문구와 위치 라벨만 갈라진다 (추정 1·3).
 * 플랫폼 API를 참조하지 않는다 — RN 재사용 대상.
 */

export interface WizardModeCopy {
  /** 확정 버튼 — "업로드하기" / "교체하기" */
  confirmLabel: string;
  /** 확정 진행 중 버튼 — "업로드 중…" / "교체 중…" */
  submittingLabel: string;
  /** 완료 모달 제목 — "업로드 완료!" / "교체 완료!" */
  completedTitle: string;
  /** 완료 안내 — 두 모드 동일. 블러 안내는 서버 블러 중단으로 폐기 (MSG-476 AC 5) */
  completedDescription: string;
}

const COMPLETED_DESCRIPTION =
  "영상이 지도에 등록됐어요. 내 격자에서 확인해보세요";

/** 모드별 확정·완료 문구 세트 (AC 2, 추정 3) */
export const wizardModeCopy = (replace: boolean): WizardModeCopy =>
  replace
    ? {
        confirmLabel: "교체하기",
        submittingLabel: "교체 중…",
        completedTitle: "교체 완료!",
        completedDescription: COMPLETED_DESCRIPTION,
      }
    : {
        confirmLabel: "업로드하기",
        submittingLabel: "업로드 중…",
        completedTitle: "업로드 완료!",
        completedDescription: COMPLETED_DESCRIPTION,
      };

/**
 * 교체 모드 위치 라벨 (추정 1) — 좌표를 보내지 않으므로 지도 중심 행정동 대신
 * 대상 영상의 격자 라벨("서면 A-02")을 표기한다. 어느 하나라도 미확보면 null(생략).
 */
export const replaceGridLabel = (
  zoneName: string | null,
  zoneCell: string | null,
): string | null =>
  zoneName !== null && zoneCell !== null ? `${zoneName} ${zoneCell}` : null;

/**
 * 행사 모드 위치 라벨 (MSG-521 AC 8, replaceGridLabel 미러) — 귀속이 URL path로
 * 결정돼 좌표를 보내지 않으므로 지도 중심 행정동 대신 "행사명 · 위치명"을 표기한다.
 */
export const eventUploadLabel = (
  occurrenceTitle: string,
  locationName: string,
): string => `${occurrenceTitle} · ${locationName}`;
