/**
 * SOURCE: Figma "[v2] [행사 운영자 2] 홈·신청 현황" (15525:8652) 사이드바 하단 —
 * "행사 등록 권한" 고정 안내 카드 (MSG-545 AC 10).
 *
 * 데이터 의존이 없는 정적 안내다(ORG 계정의 메뉴 노출 범위 설명) — 시안 문구 그대로.
 */
export const OrgPermissionNotice = () => (
  <div className="rounded-sm border border-border px-sm py-sm">
    <p className="text-fm-label font-semibold text-foreground">
      행사 등록 권한
    </p>
    <p className="mt-xxs text-fm-caption text-foreground-body">
      행사 신청만 이용할 수 있습니다. 지도·업로드·도감·프로필 메뉴는 ORG 계정에
      표시되지 않습니다.
    </p>
  </div>
);
