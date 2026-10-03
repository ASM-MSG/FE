import { Image } from "expo-image";
import { View } from "react-native";
import { SvgUri, SvgXml } from "react-native-svg";
import { resolveBadgeArt } from "../model/badge-art";

interface BadgeArtViewProps {
  code: string;
  iconUrl: string | null | undefined;
  /** 메달 지름(px) — 도감 56, 획득 모달 112 */
  size: number;
  /** 미획득 — 아트가 없을 때의 민무늬 원만 테두리 원으로 바뀐다(투명도는 호출처 몫) */
  locked?: boolean;
}

/**
 * 뱃지 메달 아트 1개 — `resolveBadgeArt` 결과를 **4분기**로 그린다 (MSG-617 D2).
 * 도감 뱃지 탭(`features/dex/ui/badge-medal`)과 뱃지 획득 모달(`features/upload`)이
 * 같은 아트·같은 폴백 규칙을 쓰도록 렌더 분기를 여기 한 곳에 둔다 — F1(PNG를 `SvgUri`에
 * 넘겨 높이 0, MSG-430)류 분기가 두 곳에 있으면 한쪽만 고쳐지는 재발이 예정된다.
 *
 * 소스 우선순위: 서버 `iconUrl`(현재 S3 PNG) > 로컬 XML 카탈로그 > 민무늬 원.
 * 원격은 형식별로 렌더러가 다르다: `.svg`만 `SvgUri`, 나머지 래스터는 `expo-image`의 `Image`
 * (contain — 정사각 메달이라 전체를 보인다. RN `Image`는 캐시가 없어 react-doctor 훅이 막는다). 장식 요소라 접근성 노드를 만들지 않는다(이름 Text가 낭독 대상).
 */
export const BadgeArtView = ({
  code,
  iconUrl,
  size,
  locked = false,
}: BadgeArtViewProps) => {
  const art = resolveBadgeArt(code, iconUrl);
  const box = { width: size, height: size };

  if (art === null) {
    return (
      <View
        accessible={false}
        className={`rounded-full ${locked ? "border border-border bg-surface" : "bg-primary"}`}
        style={box}
      />
    );
  }
  if (art.kind === "xml") {
    return <SvgXml xml={art.xml} width={size} height={size} />;
  }
  if (art.kind === "svg-uri") {
    return <SvgUri uri={art.uri} width={size} height={size} />;
  }
  return (
    <Image
      accessible={false}
      source={{ uri: art.uri }}
      style={box}
      contentFit="contain"
    />
  );
};
