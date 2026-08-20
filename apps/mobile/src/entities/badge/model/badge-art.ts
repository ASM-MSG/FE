import { BADGE_ART_XML as course1 } from "../assets/course-1";
import { BADGE_ART_XML as course3 } from "../assets/course-3";
import { BADGE_ART_XML as course10 } from "../assets/course-10";
import { BADGE_ART_XML as earlyBird } from "../assets/early-bird";
import { BADGE_ART_XML as event1 } from "../assets/event-1";
import { BADGE_ART_XML as event3 } from "../assets/event-3";
import { BADGE_ART_XML as event10 } from "../assets/event-10";
import { BADGE_ART_XML as explorer1 } from "../assets/explorer-1";
import { BADGE_ART_XML as explorer10 } from "../assets/explorer-10";
import { BADGE_ART_XML as explorer50 } from "../assets/explorer-50";
import { BADGE_ART_XML as explorer100 } from "../assets/explorer-100";
import { BADGE_ART_XML as explorer500 } from "../assets/explorer-500";
import { BADGE_ART_XML as popup1 } from "../assets/popup-1";
import { BADGE_ART_XML as popup3 } from "../assets/popup-3";
import { BADGE_ART_XML as popup10 } from "../assets/popup-10";
import { BADGE_ART_XML as recorder10 } from "../assets/recorder-10";
import { BADGE_ART_XML as recorder50 } from "../assets/recorder-50";
import { BADGE_ART_XML as recorder100 } from "../assets/recorder-100";
import { BADGE_ART_XML as regionMaster10 } from "../assets/region-master-10";
import { BADGE_ART_XML as regionMaster25 } from "../assets/region-master-25";
import { BADGE_ART_XML as regionMaster50 } from "../assets/region-master-50";
import { BADGE_ART_XML as streak3 } from "../assets/streak-3";
import { BADGE_ART_XML as streak7 } from "../assets/streak-7";
import { BADGE_ART_XML as streak30 } from "../assets/streak-30";

/**
 * 뱃지 메달 아트 카탈로그 (MSG-430 L6) — 웹 `entities/badge/model/badge-art.ts`의
 * 모바일 대응물. 웹은 번들러가 `.svg`를 URL로 바꿔 `<img src>`로 그리지만, 모바일은
 * metro에 svg transformer가 없으므로(신규 도입 금지) 같은 아트를 **XML 문자열**로 들고
 * `react-native-svg`의 `SvgXml`로 그린다.
 *
 * `../assets/*.ts` 24개는 웹 `.svg` 24종의 기계 변환물이다 — Figma 아트보드 잔재
 * (뷰박스를 덮는 흰 배경 사각형·페이지 rect·카드 rect 7종)를 제거하고 `<g id="medal">` +
 * `<defs>`만 남겼다. 모바일은 테마 배경 위에 얹히므로 원본을 그대로 감싸면 뱃지 뒤에
 * 흰 판이 보인다(스펙 [A9-a 보충]).
 *
 * **아트 갱신 절차**: 웹 `.svg`를 교체한 뒤, 각 파일에서 위 7종 배경 요소를 버리고
 * `<svg …>` + `<g id="medal">…</g>` + `<defs>…</defs>`만 남긴 문자열을
 * `export const BADGE_ART_XML = \`…\`;` 한 줄 모듈로 다시 쓴다. `url(#…)`이 가리키는
 * mask·gradient id는 `<defs>`에 남아야 한다 — `badge-art.test.ts`가 키 집합과
 * 배경 제거 여부를 고정한다.
 *
 * 백엔드 `badges.icon_url`은 현재 채워져 있어(MSG-430 검증 실측 — S3 PNG) 이 카탈로그는
 * **폴백 경로**다: 서버가 값을 비우거나 신규 code가 카탈로그에만 있을 때 그려진다.
 * 순수 매핑 — 플랫폼 API·라우터 무의존.
 */
const BADGE_ART: Record<string, string> = {
  EXPLORER_1: explorer1,
  EXPLORER_10: explorer10,
  EXPLORER_50: explorer50,
  EXPLORER_100: explorer100,
  EXPLORER_500: explorer500,
  RECORDER_10: recorder10,
  RECORDER_50: recorder50,
  RECORDER_100: recorder100,
  REGION_MASTER_10: regionMaster10,
  REGION_MASTER_25: regionMaster25,
  REGION_MASTER_50: regionMaster50,
  STREAK_3: streak3,
  STREAK_7: streak7,
  STREAK_30: streak30,
  EVENT_1: event1,
  EVENT_3: event3,
  EVENT_10: event10,
  COURSE_1: course1,
  COURSE_3: course3,
  COURSE_10: course10,
  POPUP_1: popup1,
  POPUP_3: popup3,
  POPUP_10: popup10,
  EARLY_BIRD: earlyBird,
};

/** 로컬 카탈로그가 아트를 가진 code 목록 — 웹 BADGE_ART 키 집합과 같아야 한다 [L6] */
export const BADGE_ART_CODES: readonly string[] = Object.keys(BADGE_ART);

/**
 * 뱃지 아트 소스 [L6] — RN은 세 소스의 렌더 경로가 전부 다르다: 원격 SVG=`SvgUri`,
 * 원격 래스터=`Image`, 로컬 XML=`SvgXml`. 웹은 셋 다 `<img src>`라 문자열 하나로 충분했지만
 * 모바일은 표시 컴포넌트가 분기해야 하므로 종류를 함께 돌려준다.
 *
 * 원격을 `uri` 하나로 뭉뚱그렸던 것이 MSG-430 F1의 원인이었다 — PNG가 SVG 파서로 들어가
 * 높이 0으로 렌더됐다. 종류로 갈라 두면 표시 컴포넌트가 분기를 빠뜨릴 수 없다.
 */
export type BadgeArt =
  | { kind: "svg-uri"; uri: string }
  | { kind: "image-uri"; uri: string }
  | { kind: "xml"; xml: string };

/**
 * 원격 아트가 SVG인지 URL로 판별한다 [MSG-430 F1] — 서버는 지금 PNG를 내려주지만
 * 나중에 SVG로 바꿀 수 있으므로 한쪽으로 단정하지 않는다. 쿼리스트링·해시를 떼고
 * 경로 확장자만 본다. 확장자가 없으면 래스터로 본다 — `Image`는 못 그려도 깨진 이미지가
 * 남지만 `SvgUri`는 XML이 아니면 아무것도 그리지 않아(높이 0) 원인이 안 보인다.
 * 순수 함수 — 네트워크·플랫폼 API 무의존.
 */
export const isSvgUri = (uri: string): boolean =>
  uri
    .replace(/[?#].*$/, "")
    .toLowerCase()
    .endsWith(".svg");

/**
 * 뱃지 아트 소스 결정 — 서버 iconUrl > 로컬 code 카탈로그 > null. [L6]
 * null은 "아트 없음"이며, 표시 컴포넌트가 민무늬 원 폴백을 그린다 — 시드에 새 code가
 * 추가돼도 화면이 깨지지 않게 하는 안전망이다(에셋 추가는 후속 작업으로 남는다).
 */
export const resolveBadgeArt = (
  code: string,
  iconUrl: string | null | undefined,
): BadgeArt | null => {
  /*
   * 공백뿐인 값은 "주소 없음"으로 본다 — `""`는 null이 아니라서 그냥 두면 폴백을 건너뛰고
   * 빈 uri가 `Image`로 흘러가 깨진 이미지가 남는다(로컬 카탈로그가 있는데도). 계약의 뜻은
   * "주소가 있으면 그걸 쓴다"이고 빈 문자열은 주소가 아니다. 명세 타입은 `string | null`이라
   * 지금은 안 오지만, 서버가 값을 비우는 방식이 바뀌어도 폴백이 살아 있게 한다 [F1 동류].
   */
  const remote = iconUrl?.trim();
  if (remote) {
    return isSvgUri(remote)
      ? { kind: "svg-uri", uri: remote }
      : { kind: "image-uri", uri: remote };
  }
  const xml = BADGE_ART[code];
  return xml === undefined ? null : { kind: "xml", xml };
};
