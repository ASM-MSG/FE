# 웹 배포 (fillmap.kr)

`main`에 push되면 `.github/workflows/cd-web.yml`이 fillmap.kr로 자동 배포한다.
AWS 인프라(S3 `fillmap-web` + CloudFront + 도메인 + OIDC 배포 역할)는 인프라 담당(성민)이
구축해 두었고 FE에서 손댈 것이 없다. 이 문서는 **FE 레포·외부 콘솔 쪽에서 할 일**의 정본이다.

원 전달 문서는 develop 배포 전제였으나, README 브랜치 전략(`main`=배포 / `develop`=기본)에
맞춰 main으로 옮겼다. 그 밖에도 실제 코드와 어긋나던 항목을 정정했다 — 아래 "전달본과 다른 점".

## 릴리스 흐름

```
작업 브랜치 → PR → develop   (평소 개발, CI가 PR에서 검증)
develop → PR → main         (릴리스, 머지 즉시 fillmap.kr 배포)
```

같은 push에 걸린 워크플로는 서로 순서가 없어 **CD는 CI를 기다리지 않는다.** 릴리스를 PR로
내는 것이 그 공백을 메운다 — PR에서 CI가 이미 돌기 때문이다(`ci.yml`의
`pull_request: [develop, main]`). GitHub Settings > Branches에서 main에
**Require status checks to pass**를 걸어 강제하는 것을 권장한다.

> BE는 develop이 곧 라이브(`cd-dev.yml`)라 리듬이 다르다. api.fillmap.kr(BE develop)이 먼저
> 바뀌고 fillmap.kr(FE main)이 나중에 따라가는 구간이 생기므로, API 계약이 바뀌는 릴리스는
> 순서를 맞춘다.

## GitHub 설정 (1회)

1. **environment 생성**: Settings > Environments > New environment, 이름은 정확히 **`web`**.
   AWS 역할 신뢰 조건이 이 이름에 걸려 있어 다르면 인증이 거부된다.
   같은 이유로 `cd-web.yml`의 `environment: web` 줄을 지우면 안 된다.

2. **변수·시크릿**:

   | 위치 | 이름 | 값 |
   |---|---|---|
   | repo variable | `WEB_DEPLOY_ENABLED` | `true` (배포를 멈추려면 이 값만 지우거나 다른 값으로) |
   | `web` 환경 variable | `VITE_API_BASE_URL` | `https://api.fillmap.kr` |
   | `web` 환경 secret | `VITE_NAVER_MAP_NCP_KEY_ID` | NCP 콘솔의 Maps Client ID |

   `VITE_*`는 빌드 시점에 번들로 굳는다 — 값을 바꾸면 재배포해야 반영된다.

## 외부 콘솔 등록 (1회)

지금은 `http://localhost:5173`만 등록돼 있어 프로덕션 주소를 추가해야 한다.

### 네이버 클라우드 플랫폼 (지도)

NCP 콘솔 > Services > Maps > Application > 해당 애플리케이션 > **Web 서비스 URL**에
`https://fillmap.kr` 추가. 등록 안 하면 지도 타일이 인증 실패로 안 뜬다.

### 카카오 (로그인)

**Redirect URI가 필수 항목이다.** 카카오 개발자 콘솔 > 내 애플리케이션 > 제품 설정 >
카카오 로그인 > **Redirect URI**에 다음을 추가한다:

```
https://fillmap.kr/oauth/kakao/callback
```

- 도메인이 아니라 **경로까지 정확히** 일치해야 한다(문자 하나만 달라도 `KOE006`으로 막힌다).
- 프론트는 이 값을 `KakaoLoginButton`에서 `${appOrigin()}${KAKAO_CALLBACK_PATH}`로 만들어
  서버 진입점에 넘기고, 서버가 그대로 카카오에 전달한다 — 즉 **브라우저가 떠 있는 주소**가
  그대로 들어간다. 로컬용 `http://localhost:5173/oauth/kakao/callback`은 지우지 말고 함께 둔다.
- 등록 대상은 **서버가 쓰는 카카오 앱**이다. 앱 소유가 BE 쪽이면 BE에 요청한다.

앱 설정 > **플랫폼 > Web > 사이트 도메인**(`https://fillmap.kr`)은 **이 로그인 플로우의 필수
조건이 아니다.** 그 항목은 브라우저가 카카오 JavaScript SDK를 직접 호출할 때 허용 출처를
가리는 용도인데, 우리는 SDK를 쓰지 않는다(로그인 전 구간이 서버 경유). 카카오 공유하기 등
JS SDK 기능을 나중에 붙일 때 필요하므로 미리 등록해 둬도 해는 없다.

## 첫 배포 확인

`develop → main` PR 머지 → Actions에서 `CD (web)` 실행 확인 → https://fillmap.kr 접속.
첫 배포 전까지 fillmap.kr이 에러 페이지인 것은 정상이다(버킷이 비어 있음).

## 배포가 하는 일

`pnpm --filter web build` → S3 업로드 → CloudFront 무효화 → 헬스체크.

캐시는 해시 파일명 에셋(`assets/`)만 1년 불변으로 잡고 `index.html`은 캐시하지 않아,
배포 직후 새 버전이 바로 보인다. 헬스체크는 업로드 성공이 아니라 **서빙 성공**을 본다 —
`index.html`이 방금 올린 엔트리 번들 해시를 가리킬 때까지 최대 60초 재확인한다.

## 자주 걸릴 만한 것

- **`Not authorized to perform sts:AssumeRoleWithWebIdentity`**: job의 `environment: web`이
  빠졌거나 environment 이름이 다르다.
- **빌드가 `VITE_API_BASE_URL 이 비어 있다`로 실패**: `web` 환경 variable 미등록.
  코드에 폴백이 없는 설계(조용한 오배포 방지)라 빈 값이면 일부러 빌드를 막는다.
- **헬스체크 실패인데 사이트는 멀쩡**: 헬스체크가 `assets/index-*.js` 패턴으로 엔트리 번들을
  찾는다. Vite 출력 파일명 규칙을 바꿨다면 `cd-web.yml`의 Health check step 패턴을 맞춘다.
- **배포를 잠시 멈추고 싶을 때**: repo variable `WEB_DEPLOY_ENABLED`를 지우거나 `true`가 아닌
  값으로 바꾸면 workflow가 skip된다.

## 전달본과 다른 점 (2026-08-21, MSG-451)

| 항목 | 전달본 | 이 레포 | 이유 |
|---|---|---|---|
| 트리거 | `develop` push | `main` push | README 브랜치 전략(main=배포)과 일치. CD가 CI를 안 기다리는 공백도 릴리스 PR이 메운다 |
| `VITE_KAKAO_JS_KEY` (secret) | 등록 | **제거** | 코드가 읽지 않는다. 카카오 앱 키는 서버 몫이라 프론트에 필요한 경로가 없다 |
| `VITE_KAKAO_LOGIN_ENABLED` (variable) | `false` 등록 | **제거** | 코드가 읽지 않는다. `false`여도 카카오 로그인은 그대로 동작하며, 교환 엔드포인트도 이미 붙어 있다 |
| assets S3 sync | 기본 비교 | `--size-only` 추가 | 기본 비교가 mtime을 봐서 내용이 같아도 전량 재업로드된다(ffmpeg wasm 31MB 포함). 해시 파일명이라 크기 비교로 충분하다 |
| `ci.yml` push 트리거 | — | `main` 추가 | 배포된 커밋에 검증 이력이 남아야 한다 |

문의: 성민 (인프라). AWS 리소스 변경이 필요하면 이쪽으로 요청한다.
