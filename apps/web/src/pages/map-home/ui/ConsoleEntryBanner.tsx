import { Link } from "react-router-dom";
import { CONSOLE_ROUTES } from "@/app/console-routes";

/**
 * SOURCE: Figma "② 칩 목록 패널 388" 프레임의 최하단 배너 (15599:2504~2506).
 * 칩 목록 패널(지역축제·팝업스토어·경로추천) 목록 끝의 운영자 콘솔 진입 배너 (MSG-555 AC 3·4·5).
 *
 * 배너 전체가 하나의 링크다 — 두 문구가 함께 접근성 이름이 되어 "여기 없는 행사를
 * 운영하시나요? 공식 행사로 등록하면 지도에 노출됩니다 →"로 읽힌다 (AC 10).
 *
 * `@/app/console-routes`에서 **문자열 상수만** 가져온다 — `app/console/`·`pages/org`를
 * 참조하면 콘솔 lazy 청크가 유저 앱 진입 시 로드되어 MSG-541 AC 3 전제가 깨진다 (AC 8).
 * `Link`는 이동 시점에만 청크를 받으므로 프리로드가 없다.
 *
 * ui-web 승격 대상이 아니다 — 행사 등록이라는 도메인 문구를 아는 컴포넌트다.
 */
export const ConsoleEntryBanner = () => (
  <Link
    to={CONSOLE_ROUTES.orgLogin}
    className="mt-sm flex flex-col gap-xxs rounded-md border border-primary bg-event-tint px-md py-md"
  >
    <p className="text-fm-label font-semibold text-foreground">
      여기 없는 행사를 운영하시나요?
    </p>
    <p className="text-fm-caption font-semibold text-primary">
      공식 행사로 등록하면 지도에 노출됩니다 →
    </p>
  </Link>
);
