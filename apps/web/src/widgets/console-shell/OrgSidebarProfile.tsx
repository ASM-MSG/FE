import { useOrgProfileQuery } from "@/features/org-account/api/use-org-profile-query";

/**
 * SOURCE: Figma "[v2] [행사 운영자 2] 홈·신청 현황" (15525:8652) 사이드바 상단 —
 * "ORG 계정" 연블루 뱃지 + 계정 이메일 (MSG-545 AC 10).
 *
 * 쿼리를 직접 구독하는 자급 컨테이너다(EventCapsule 선례) — 셸이 도메인 데이터를 릴레이하지
 * 않는다. 로딩·실패에는 뱃지만 남는다: 프로필 조회는 사이드바의 부가 정보이고, 실패로
 * 콘솔 제목·메뉴가 사라지면 안 된다(AC 10).
 *
 * **조직명은 렌더하지 않는다** — 시안의 "부산광역시 관광마이스과" 자리에 쓸 서버 필드가
 * 없다(`OrgProfileResponseDto`는 email·contactName·contactPhone뿐, 실측). 질문 1 (b) 확정:
 * 이번 티켓은 생략하고 서버 필드 추가를 환류한다.
 */
export const OrgSidebarProfile = () => {
  const { data } = useOrgProfileQuery();

  return (
    <div className="flex flex-col gap-xs px-sm">
      <span className="w-fit rounded-full bg-primary/10 px-xs py-0.5 text-fm-label text-primary">
        ORG 계정
      </span>
      {data !== undefined && (
        <p className="text-fm-body text-foreground-body">{data.email}</p>
      )}
    </div>
  );
};
