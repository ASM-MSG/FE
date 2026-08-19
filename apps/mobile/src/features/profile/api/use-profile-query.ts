import { useQuery } from "@tanstack/react-query";
import {
  toProfileIdentity,
  type ProfileIdentity,
} from "../../../entities/profile/model/profile";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getMeOptions } from "../../../shared/api/query-options";

/**
 * 프로필 조회 (결정 E2 — 최소 연동) — `GET /api/users/me` 생성 옵션 + 봉투 언랩.
 * 닉네임·이메일·가입일·프로필이미지 4개만 서버값이다. 스트릭·수집률은 대응 API 연동이
 * 범위 밖이라 mock을 그대로 쓴다.
 *
 * **화면은 이 조회에 잠기지 않는다** — 로딩·실패에는 호출부가 mock으로 폴백한다
 * (MSG-422 consent-gate 교훈: 게이트가 조회에 묶이면 화면 자체가 사라진다).
 * 이 연동이 없으면 `profileImageUrl`이 영원히 null이라 기준 12·15("기본 이미지로 되돌리기")가
 * 구조적으로 관찰 불가능해진다.
 */
export const useProfileQuery = () =>
  useQuery({
    ...getMeOptions(),
    select: (envelope): ProfileIdentity =>
      toProfileIdentity(unwrapEnvelope(envelope)),
  });
