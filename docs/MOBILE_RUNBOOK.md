# 모바일 실기 런북 — dev client 빌드 · 기기 연결 · 실동작 검증

`apps/mobile`(Expo dev client)을 **실제로 띄워서 화면을 보는** 절차. 위에서 아래로 순서대로 따라가면 앱이 뜬다.

> **왜 이 문서가 있나:** 하네스의 실동작 검증이 웹 dev 서버 기준으로만 규정돼 있어, 모바일 티켓(MSG-419~431)이 정적 게이트(vitest·typecheck·lint)만으로 통과해 왔다. 2026-08-20 실기 시도에서 함정 6가지에 순차로 걸렸고 전부 재발할 문제라 절차로 굳혔다. 검증 스킬에서의 진입점은 `.claude/skills/page-verification/SKILL.md` 절차 3-B.

> **범위:** Android만 다룬다. iOS 실기는 현재 개발 환경에 Xcode 커맨드라인 도구가 없어 제외 — 필요해지면 별도 티켓.

**Expo Go로는 이 앱이 뜨지 않는다.** 네이버 지도·expo-notifications 등 네이티브 모듈을 쓰므로 **dev client**(직접 빌드한 debug APK)가 필요하다. `expo start`를 플래그 없이 띄우면 Expo Go 경로로 안내되고 앱은 즉시 강제 종료된다 — 항상 `--dev-client`.

---

## 0. 한 번만 하는 준비

### 0-1. 도구

| 도구 | 확인 | 비고 |
|---|---|---|
| `adb` | `adb devices` | macOS 기본 경로 `~/Library/Android/sdk/platform-tools/adb`. PATH에 없으면 `export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"` |
| JDK 17+ | `java -version` | Gradle 빌드용. Android Studio 동봉 JDK로도 된다 |
| Android SDK | `echo $ANDROID_HOME` | 미설정이면 `export ANDROID_HOME="$HOME/Library/Android/sdk"` |
| Node / pnpm | `node -v` · `pnpm -v` | 루트 `engines`는 node >= 24 |

### 0-2. `.env` 준비

`apps/mobile/.env`는 gitignore다. `.env.example`을 복사해 값을 채운다.

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

**네이버 지도 키는 웹 값을 그대로 재사용한다.** NCP 콘솔 > Maps > Application "FillMap" 하나에 Web 서비스 URL(`https://fillmap.kr`, `http://localhost:5173`)과 Android 패키지명(`kr.fillmap.app`)이 **함께** 등록돼 있다. 값은 같고 **변수명만 플랫폼별로 다르다**:

| 플랫폼 | 파일 | 변수명 |
|---|---|---|
| 웹 | `apps/web/.env.local` | `VITE_NAVER_MAP_NCP_KEY_ID` |
| 모바일 | `apps/mobile/.env` | `EXPO_PUBLIC_NAVER_MAP_CLIENT_ID` |

```bash
# 웹 값을 그대로 옮겨 붙이기
grep VITE_NAVER_MAP_NCP_KEY_ID apps/web/.env.local
```

`EXPO_PUBLIC_API_BASE_URL`은 `.env.example`의 기본값(`https://api.fillmap.kr`)을 그대로 쓴다. 코드 폴백이 없어서 **미설정이면 앱 부트 시점에 throw한다** — "왜 흰 화면이지" 하기 전에 이 값부터 본다.

> 네이버 키는 **prebuild 시점에** 네이티브(`AndroidManifest`의 `NCP_KEY_ID`)로 들어간다. 키를 넣거나 바꾸면 `.env` 수정만으로는 반영되지 않고 prebuild + 재빌드가 필요하다(→ [2. 빌드 판단](#2-빌드가-필요한지-판단)).

### 0-3. 구 APK 정리 (**중요 — 안 하면 딥링크가 선택창으로 샌다**)

이 앱의 패키지명은 과거 Expo 기본값 `com.anonymous.fillmap`에서 `kr.fillmap.app`으로 바뀌었다. 구 APK가 기기에 남아 있으면 **두 앱이 `fillmap://` 스킴을 공유**해 딥링크가 앱을 못 고르고 선택창(`ResolverActivity`)으로 빠진다.

```bash
adb uninstall com.anonymous.fillmap   # 없으면 "Failure [DELETE_FAILED_INTERNAL_ERROR]" — 무시해도 된다
adb shell pm list packages | grep fillmap   # kr.fillmap.app 하나만 남아야 정상
```

---

## 1. 기기 연결

목표는 `adb devices`에 기기가 `device` 상태로 하나 뜨는 것이다. 셋 중 하나를 고른다.

### 1-A. 에뮬레이터 (가장 빠르고 재현이 안정적)

Android Studio > Device Manager에서 AVD를 실행하거나:

```bash
$ANDROID_HOME/emulator/emulator -list-avds
$ANDROID_HOME/emulator/emulator -avd <AVD이름> &
adb devices          # emulator-5554  device
```

### 1-B. USB 실기

기기에서 개발자 옵션 > **USB 디버깅** 켜고 케이블 연결 → 기기에 뜨는 "USB 디버깅 허용" 팝업 승인.

```bash
adb devices          # R3CT...  device   ("unauthorized"면 팝업 승인이 안 된 것)
```

### 1-C. 무선 디버깅 (Android 11+)

**페어링 포트와 연결 포트는 다른 포트다.** 이걸 헷갈리면 계속 실패한다.

1. 기기: 개발자 옵션 > **무선 디버깅** 켜기 → **"페어링 코드로 기기 페어링"** 탭
2. 팝업에 뜨는 **페어링용** IP:포트와 6자리 코드로 페어링한다. **팝업을 닫으면 그 포트와 코드는 즉시 폐기된다** — 명령을 미리 준비해두고 팝업을 연 채로 실행한다.
   ```bash
   adb pair 192.168.x.x:37123 123456     # ← 페어링 포트(팝업에 뜬 값)
   ```
3. 페어링에 성공하면 **무선 디버깅 메인 화면**에 표시된 **다른** 포트로 연결한다.
   ```bash
   adb connect 192.168.x.x:5555          # ← 연결 포트(메인 화면 값, 페어링 포트와 다르다)
   adb devices                            # 192.168.x.x:5555  device
   ```

**mDNS 캐시를 믿지 마라.** `adb mdns services`에 뜨는 포트는 이미 죽은 값일 수 있다 — 실제로 2026-08-20에 이 죽은 포트로 붙으려다 "기기가 안 보인다"고 오진했다. 항상 **기기 화면에 지금 표시된 값**을 쓴다.

---

## 2. 빌드가 필요한지 판단

기기에 이미 최신 dev client APK가 깔려 있으면 3단계를 건너뛰고 [4. Metro](#4-metro-기동-빌드와-별도-프로세스로)로 간다. 아래에 하나라도 해당하면 빌드해야 한다.

### 2-1. `expo prebuild`가 필요한 경우 (네이티브 프로젝트 재생성)

| 조건 | 예시 |
|---|---|
| `apps/mobile/android/`가 없다 | 새 클론·새 워크트리 (android는 gitignore다) |
| **새 네이티브 의존성 / Expo 플러그인**이 들어왔다 | MSG-429의 `expo-notifications` — 기존 `android/`로는 안 잡혀 빌드는 되는데 런타임에 모듈이 없다 |
| `app.config.js`의 `plugins`·`android` 블록이 바뀌었다 | 패키지명, `googleServicesFile`, 스플래시 |
| **네이티브로 주입되는 env 키**가 바뀌었다 | `EXPO_PUBLIC_NAVER_MAP_CLIENT_ID` (AndroidManifest의 `NCP_KEY_ID`로 굳어 들어간다) |

```bash
cd apps/mobile
npx expo prebuild -p android
```

**`prebuild`는 재생성이 기본이다** — 기존 `android/`를 지우고 새로 만든다. 그래서 새 네이티브 의존성이
안 잡히던 문제가 이 명령 한 번으로 풀린다. 반대로 기존 네이티브 폴더 위에 변경분만 얹고 싶으면
`--no-clean`을 붙인다. (`--clean`이라는 플래그는 **없다** — SDK 57 CLI는 그냥 무시한다.
다른 프로젝트에서 봤더라도 이 레포에서는 붙이지 않는다.)

> JS/TS만 바뀐 경우엔 prebuild도 빌드도 필요 없다 — Metro가 새 번들을 밀어 넣는다.
>
> `android/`를 지웠다 다시 만들므로 그 안의 Gradle 빌드 산출물도 사라진다. prebuild 뒤에는 항상 재빌드가 따라온다.

### 2-2. Gradle 재빌드만 필요한 경우

`android/`는 최신인데 APK가 기기에 없거나 오래됐을 때 → 3단계로.

---

## 3. 빌드 · 설치

```bash
cd apps/mobile
npx expo run:android --no-bundler                      # 연결된 기기가 하나일 때
npx expo run:android --no-bundler --device SM_S931N    # 실기 여러 대
npx expo run:android --no-bundler --device Pixel_8     # 에뮬레이터 여러 대
```

**`--device`는 adb 시리얼을 받지 않고, 기기 종류마다 받는 이름이 다르다** (→ [함정 5](#함정-5-expo-runandroid---device가-시리얼을-안-받는다--그리고-기기-종류마다-받는-이름이-다르다)):

```bash
adb devices -l                          # 물리 기기: model:SM_S931N  ← 이 model 값
adb -s emulator-5554 emu avd name       # 에뮬레이터: Pixel_8_2      ← AVD 이름
```

**`--no-bundler`를 붙이는 이유** — 이 플래그가 없으면 `expo run:android`가 Metro를 자기 자식 프로세스로 물고 실행한다. 빌드 명령이 끝나는 순간 Metro도 같이 죽어서, 앱을 켜면 붙을 서버가 없다. Metro는 4단계에서 **따로** 띄운다.

빌드가 끝나면 APK가 설치되고 앱이 한 번 실행된다. 빌드 산출물만 따로 설치하려면:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 4. Metro 기동 (빌드와 별도 프로세스로)

**포트는 8081로 고정한다.** dev client는 콜드 스타트에서 저장된 서버 주소를 무시하고 8081로 되돌아간다 — 8082로 띄우면 앱이 붙지 않는다.

```bash
cd apps/mobile
npx expo start --dev-client --port 8081
```

USB·무선 실기라면 기기의 `localhost:8081`을 맥으로 포워딩한다(에뮬레이터에도 해두면 편하다):

```bash
adb reverse tcp:8081 tcp:8081
```

> `adb reverse`는 **기기가 재연결될 때마다 풀린다.** 앱이 갑자기 Metro를 못 찾으면 이것부터 다시 건다.

---

## 5. 앱 진입 (패키지를 명시해서)

앱 아이콘을 눌러도 되지만, **패키지를 명시한 딥링크가 확실하다** — 구 APK가 남아 있어도 선택창으로 새지 않는다.

```bash
adb shell am force-stop kr.fillmap.app        # ← 빠뜨리면 검은 화면 (함정 8)
adb shell am start -n kr.fillmap.app/.MainActivity \
  -a android.intent.action.VIEW \
  -d "fillmap://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
```

`force-stop`이 먼저 오는 이유는 [함정 8](#함정-8-빌드설치metro가-다-정상인데-화면만-검다)에 있다 — 앱이 이미 떠 있으면
`am start`는 새 실행이 아니라 인텐트 전달로 끝나서 Metro에 붙지 않는다.

`-n kr.fillmap.app/.MainActivity`가 패키지 명시다. 이게 없으면 `fillmap://`를 처리할 수 있는 앱이 둘이라 Android가 `ResolverActivity`(선택창)를 띄운다.

**"Unable to load script" / 흰 화면이 뜨면** → [함정 1](#함정-1-unable-to-load-script--metro에-안-붙는다)로.

---

## 6. 화면 확인

```bash
adb exec-out screencap -p > /tmp/shot.png      # 스크린샷
adb logcat -s ReactNativeJS:V                  # JS 콘솔 (console.log·에러)
adb logcat -c                                  # 로그 비우기 (재현 전에)
```

검증 리포트에 붙일 스크린샷은 `_workspace/MSG-{번호}/screenshots/`에 남긴다.

> **검은 화면을 너무 빨리 판정하지 마라.** Metro 로그에 `Android Bundled ...` 가 찍힌 **뒤에도**
> 첫 화면이 그려지기까지 에뮬레이터에서 20~30초가 더 걸린다. 번들 직후 12초에 찍은 스크린샷이
> 검게 나와 결함으로 오판한 적이 있다 (2026-08-21). `adb logcat -s ReactNativeJS:V` 에
> `Running "main"` 이 찍혔는지부터 보고, 그 뒤로 30초를 더 준 다음에 판정한다.

---

## 한 번에 하기 — `android:dev` 스크립트

위 2~5단계를 한 명령으로 묶었다.

```bash
pnpm --filter mobile android:dev              # 빌드·설치 → Metro(8081) → 패키지 명시 진입
pnpm --filter mobile android:dev -- --help    # 플래그 목록
```

파괴적인 동작은 **기본에 없다**. 필요할 때만 붙인다:

| 플래그 | 하는 일 | 언제 |
|---|---|---|
| `--clean` | `expo prebuild -p android` 먼저 실행 (네이티브 재생성 — `android/`가 지워진다) | 새 네이티브 의존성·플러그인·키 변경 (2-1) |
| `--clear` | `adb shell pm clear kr.fillmap.app` | 임베디드 번들 상태가 남아 Metro에 안 붙을 때 (함정 1). **SecureStore 토큰까지 지워져 재로그인이 필요하다** |
| `--purge-legacy` | `adb uninstall com.anonymous.fillmap` | 딥링크가 선택창으로 샐 때 (함정 2) |
| `--device <이름\|시리얼>` | 대상 기기 지정 — 모델명·AVD 이름·**adb 시리얼** 셋 다 받는다(스크립트가 expo가 원하는 이름으로 변환). 같은 모델이 여러 대면 이름으로 구분이 안 되므로 시리얼을 요구하고 멈춘다 | 기기가 2대 이상 |
| `--skip-build` | 빌드·설치 건너뛰고 Metro + 진입만 | JS만 고쳤을 때 (가장 자주 쓰게 된다) |
| `--no-launch` | 앱 진입 생략 | Metro만 띄우고 싶을 때 |

Metro는 스크립트가 **별도 프로세스로** 띄우고 포그라운드로 남는다. `Ctrl-C`로 끝낸다.

---

## 함정 사전 (2026-08-20 · 08-21 실측)

전부 실제로 걸렸던 것들이다. 증상으로 찾아 쓴다.

### 함정 1. "Unable to load script" / Metro에 안 붙는다

**증상** — 앱은 뜨는데 빨간 화면에 `Unable to load script. Make sure you're either running Metro...`. Metro 로그에는 아무 요청도 안 찍힌다.

**원인** — 기기에 깔려 있던 APK가 **임베디드 번들 로더**(`loadJSBundleFromAssets`)였다. release 빌드거나 번들을 포함해 만든 APK는 Metro를 아예 쳐다보지 않는다. 2026-08-20에는 에뮬레이터에 있던 APK 2종이 **둘 다** 그랬다.

**대응** — debug dev client APK를 새로 설치한다. 그래도 안 되면 **앱 데이터에 구 상태가 남은 것**이라 지우고 딥링크로 재진입한다:

```bash
adb shell pm clear kr.fillmap.app      # 로그인 세션(SecureStore)도 지워진다
adb shell am start -n kr.fillmap.app/.MainActivity -a android.intent.action.VIEW \
  -d "fillmap://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
```

`adb install -r`로 덮어써도 앱 데이터는 남는다는 게 핵심이다. 재설치만으로는 안 풀린다.

### 함정 2. 딥링크가 앱 선택창(ResolverActivity)으로 빠진다

**증상** — `am start`를 했는데 앱이 아니라 "어떤 앱으로 열까요?" 선택창이 뜬다.

**원인** — 구 APK `com.anonymous.fillmap`과 현 `kr.fillmap.app`이 **같은 `fillmap://` 스킴**을 등록하고 있다.

**대응** — 둘 중 하나. 구 APK를 지우거나(`adb uninstall com.anonymous.fillmap`), `am start`에 `-n kr.fillmap.app/.MainActivity`로 패키지를 명시한다. 스크립트는 **항상 패키지를 명시**해서 이 함정을 원천적으로 피한다.

### 함정 3. dev client가 8081로 되돌아간다

**증상** — Metro를 8082로 띄웠는데 앱이 8081을 찾다가 실패한다.

**원인** — dev client는 **콜드 스타트에서 기본 포트(8081)로 복귀**한다. 이전에 8082로 붙였던 기록이 있어도 마찬가지다.

**대응** — 싸우지 말고 8081을 쓴다. 8081이 이미 점유돼 있으면 그 프로세스를 정리한다:

```bash
lsof -ti tcp:8081 -sTCP:LISTEN | xargs kill
```

`-sTCP:LISTEN`을 빼면 안 된다 — 그게 없으면 에뮬레이터(`qemu-system-aarch64`·`netsimd`)가 Metro로 **맺은 연결**까지
매치돼, 포트가 비어 있는데도 점유로 보이고 엉뚱한 프로세스를 죽이게 된다 (2026-08-21 실측).

**8081을 물고 있는 게 죽은 줄 알았던 Metro인 경우가 잦다.** `npx expo start`는 실제 Metro를 손자 프로세스로
띄우기 때문에, 터미널을 닫거나 부모만 죽이면 Metro가 고아로 남아 포트를 계속 문다. `android:dev` 스크립트는
종료 시 손자까지 정리하지만, 손으로 띄웠다면 위 명령으로 확인하고 지운다.

### 함정 4. 무선 디버깅 페어링이 계속 실패한다

**증상** — `adb pair`가 `failed to authenticate` 또는 무응답.

**원인** — **페어링 포트와 코드는 팝업을 열 때마다 새로 생성되고 만료된다.** 그리고 `adb mdns services`가 캐시한 포트는 이미 죽은 값일 수 있다 — 그 죽은 포트로 시도하다 "기기가 안 보인다"고 오진했다.

**대응** — 기기 화면에 **지금 떠 있는** 페어링 IP:포트와 코드만 쓴다. 팝업을 연 상태에서 명령을 실행하고, 페어링이 되면 **메인 화면의 다른 포트**로 `adb connect` 한다([1-C](#1-c-무선-디버깅-android-11)).

### 함정 5. `expo run:android --device`가 시리얼을 안 받는다 — 그리고 기기 종류마다 받는 이름이 다르다

**증상** — `--device emulator-5554`나 `--device 192.168.0.5:5555`를 넣으면
`CommandError: Could not find device with name: ...` 로 죽는다. **모델명을 넣어도 에뮬레이터에서는 똑같이 죽는다.**

**원인** — 이 플래그는 adb 시리얼을 받지 않는다. 그리고 무엇을 받는지가 기기 종류에 따라 다르다:

| 기기 | `--device` 에 넣을 값 | 확인 방법 |
|---|---|---|
| 물리 기기 | **모델명** (`SM_S931N`) | `adb devices -l` 의 `model:` 값 |
| 에뮬레이터 | **AVD 이름** (`Pixel_8`) | `emulator -list-avds` 또는 `adb -s emulator-5554 emu avd name` |

2026-08-20에 실기(`SM_S931N`)로만 확인해 "모델명을 받는다"고 정리했는데, 2026-08-21에 에뮬레이터로 돌려 보니
모델명(`sdk_gphone16k_arm64`)으로는 실패하고 AVD 이름(`Pixel_8_2`)이어야 통과했다.

**대응** — 기기 종류에 맞는 값을 쓴다. `android:dev` 스크립트는 이 둘을 자동으로 구분하므로
(에뮬레이터면 `adb ... emu avd name`으로 AVD 이름을 뽑는다) 스크립트를 쓰면 신경 쓸 필요가 없고,
`--device` 없이 2대 이상이면 후보 목록을 올바른 이름으로 출력하고 멈춘다.

**같은 모델을 두 대 이상 연결했다면 이름으로는 구분이 안 된다.** 스크립트의 `--device`는 **adb 시리얼**도
받으므로(시리얼은 항상 유일하다) 그때는 시리얼을 쓴다 — 이름이 여러 대에 걸리면 스크립트가 첫 대를 조용히
고르지 않고 시리얼 목록을 보여주며 멈춘다. expo 자체는 시리얼을 받지 않으므로 변환은 스크립트가 한다.

### 함정 6. 새 네이티브 의존성이 안 잡힌다

**증상** — 빌드는 성공하는데 런타임에 해당 모듈이 없다고 죽거나 기능이 무반응.

**원인** — 기존 `android/`는 그 의존성이 없던 시점에 생성된 것이다. MSG-429의 `expo-notifications`가 이 경우였다.

**대응** — `npx expo prebuild -p android` 후 재빌드. prebuild는 재생성이 기본이라 이 한 번으로 잡힌다
(`--no-clean`을 붙이면 기존 폴더에 얹기만 하므로 이 상황에서는 **붙이면 안 된다**).

### 함정 7. 빌드 명령을 끝내면 Metro도 같이 죽는다

**증상** — `expo run:android`가 끝난 뒤(또는 그 터미널을 닫은 뒤) 앱이 Metro를 못 찾는다.

**원인** — `expo run:android`는 기본적으로 **Metro를 자기 자식 프로세스로 물고 있다.** 부모가 끝나면 Metro도 끝난다.

**대응** — 빌드는 `--no-bundler`로 돌리고 Metro는 `expo start --dev-client --port 8081`로 **따로** 띄운다. 스크립트가 이 분리를 기본으로 한다.

### 함정 8. 빌드·설치·Metro가 다 정상인데 화면만 검다

**증상** — Gradle `BUILD SUCCESSFUL`, APK 설치됨, Metro도 8081에서 돌고 있는데 앱은 검은 화면.
`adb logcat -s ReactNativeJS:V`에 아무것도 안 찍히고 Metro 로그에도 번들 요청이 없다.
`am start`를 다시 때리면 `Warning: Activity not started, intent has been delivered to currently running top-most instance.`가 뜬다.

**원인** — `expo run:android`는 설치가 끝나면 **앱을 자동으로 한 번 실행한다.** `--no-bundler`로 Metro를 분리해 뒀으므로
그 시점에는 붙을 번들 서버가 없다. 서버를 못 찾은 그 인스턴스가 top으로 살아 있으면, 뒤이어 보내는 `am start`는
**새 실행이 아니라 `onNewIntent` 전달로 끝난다** — 앱은 다시 로드하지 않고 검은 화면 그대로다.

**대응** — 진입 전에 앱을 완전히 죽여 **콜드 스타트**로 만든다.

```bash
adb shell am force-stop kr.fillmap.app
adb shell am start -n kr.fillmap.app/.MainActivity \
  -a android.intent.action.VIEW \
  -d "fillmap://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
```

`android:dev` 스크립트는 진입 직전에 항상 `force-stop`을 건다. 2026-08-21에 빌드·설치·Metro가 전부 정상인데
화면만 검게 나와 한참 헤맨 원인이 정확히 이것이었다.

### 함정 9. 입력창을 눌러도 소프트 키보드 자판이 안 뜬다 (플로팅 툴바만 뜬다)

**증상** — `TextInput` 포커스 시 `dumpsys input_method`는 `mInputShown=true`인데 화면에는 자판 없이 Gboard **좌측 플로팅 툴바**(지우기·엔터·이모지·≡)만 뜨고, `settings put secure show_ime_with_hard_keyboard 1`도 효과가 없다. uiautomator 덤프에 `com.google.android.inputmethod.latin` 노드 0개.

**원인** — 하드웨어 키보드가 아니다(`getevent -p`에 키보드 장치 없음). Gboard가 **스타일러스 필기 모드**로 동작한다 — 에뮬레이터 virtio 멀티터치가 스타일러스로 등록돼(`dumpsys input_method`의 `isStylusHandwritingEnabled=true`, `mStylusIds=[2..12]`) 자판 대신 필기 툴바를 띄운다. MSG-562 R2 검증에서 두 검증자가 "하드웨어 키보드 모드"로 오판해 확인불가로 남겼던 항목.

**대응** — 시스템 필기 설정을 끄고 Gboard 상태를 초기화한다. 검증 후 원복.

```bash
adb shell settings put secure stylus_handwriting_enabled 0
adb shell pm clear com.google.android.inputmethod.latin     # 필기 온보딩 패널이 뜨면 Cancel
# … 입력창 탭 → 도킹 자판 확인 …
adb shell settings delete secure stylus_handwriting_enabled  # 원복
```

**덤으로 주의** — `adb shell dumpsys window windows | head`처럼 큰 덤프를 파이프로 끊으면 그 직후 몇 초간 `device offline`이 나고 `adb reverse`가 풀린다. 덤프는 `grep`으로만 걸러 끝까지 읽히게 하고, offline 뒤에는 `adb reverse tcp:8081 tcp:8081`을 다시 건다.

### 함정 10. 핀치 줌이 안 된다 — `adb shell input`은 단일 포인터다

**증상** — 줌아웃 클러스터 마커처럼 **줌 단이 달라야 보이는 기준**을 에뮬레이터에서 확인하려는데 `input swipe`로는 핀치가 안 되고, `input` 서브커맨드에 멀티터치가 없다. MSG-566 1차 실기가 이 이유로 클러스터 항목을 "미실행"으로 남겼다.

**원인** — `input`은 포인터 1개만 합성한다. 지도 SDK 줌은 두 손가락 거리 변화만 본다(더블탭 줌인은 되지만 줌아웃은 두 손가락 탭이라 역시 불가).

**대응** — 멀티터치 프로토콜 B를 `sendevent`로 직접 쏜다. 스크립트가 있다: `apps/mobile/scripts/emu-pinch.sh`.

```bash
adb root                                                              # google_apis 이미지만 됨(Play 이미지 불가)
adb push apps/mobile/scripts/emu-pinch.sh /data/local/tmp/pinch.sh
adb shell sh /data/local/tmp/pinch.sh 320 60                          # 간격 320→60px = 줌아웃 약 1단, 2회면 격자→클러스터 층
adb shell sh /data/local/tmp/pinch.sh 60 320                          # 줌인
adb unroot; adb reverse tcp:8081 tcp:8081                             # root 토글마다 adbd가 재시작돼 reverse가 풀린다
```

**두 번 걸린 함정** — (1) 일반 셸은 `/dev/input/event1` 쓰기 권한이 없어 `Permission denied`가 이벤트 수만큼 찍힌다 → `adb root` 선행. (2) root 뒤에도 무반응이면 툴타입이다 — 에뮬레이터 virtio 터치 장치는 `BTN_TOUCH`가 없고 `BTN_STYLUS`만 있어(함정 9의 스타일러스 오인과 같은 뿌리) `ABS_MT_TOOL_TYPE=0`(finger)·`ABS_MT_PRESSURE`를 명시해야 제스처로 인식된다. 스크립트는 둘 다 반영돼 있다.

### 함정 11. "Metro 가동 중"인데 첫 콜드 스타트가 옛 코드를 받는다 — 다른 워크트리의 Metro

**증상** — `lsof -ti tcp:8081 -sTCP:LISTEN`에 pid가 있고 `curl localhost:8081/status`도 `packager-status:running`인데, 앱을 콜드 스타트하면 방금 고친 화면이 아니라 **삭제한 UI가 그대로** 보인다. Metro 로그의 `Android Bundled (N modules)` 모듈 수도 예상과 다르다.

**원인** — 8081을 물고 있는 Metro가 **다른 워크트리**(예: `~/projects/FE-MSG-558`)에서 띄운 것이다. 워크트리가 여러 개면 어느 cwd의 Metro인지 포트만으로는 구분이 안 된다. MSG-567 검증에서 오케스트레이터가 "Metro 가동 중"으로 넘긴 8081이 머지된 MSG-565 브랜치의 번들을 서빙하고 있었다(2026-09-04).

**대응** — 넘겨받은 Metro는 cwd부터 확인하고, 다르면 죽이고 이 레포에서 8081로 재기동한다(함정 3대로 8082는 안 붙는다).

```bash
PID=$(lsof -ti tcp:8081 -sTCP:LISTEN); lsof -p $PID | grep cwd     # cwd가 지금 레포인가
kill $PID && (cd apps/mobile && npx expo start --dev-client --port 8081)
```

### 에뮬레이터 재현 성공 경로 (막혔을 때 통째로 다시 밟을 순서)

2026-08-20에 실제로 통한 경로다. 개별 대응이 안 먹으면 이 순서로 초기화한다.

```bash
cd apps/mobile
npx expo prebuild -p android                                            # 1. 네이티브 재생성(기본 동작)
npx expo run:android --no-bundler                                       # 2. APK 빌드 + 설치
adb install -r android/app/build/outputs/apk/debug/app-debug.apk        # 3. (필요 시) 명시적 재설치
adb shell pm clear kr.fillmap.app                                       # 4. 구 앱 데이터 제거
adb reverse tcp:8081 tcp:8081                                           # 5. 포트 포워딩
npx expo start --dev-client --port 8081 &                               # 6. Metro 단독 기동
adb shell am force-stop kr.fillmap.app                                  # 7. 콜드 스타트 강제 (함정 8)
adb shell am start -n kr.fillmap.app/.MainActivity \
  -a android.intent.action.VIEW \
  -d "fillmap://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"   # 8. 패키지 명시 진입
```

---

## 네트워크 제약 — 사내망에서 실기가 안 붙을 때

**사내망(172.16.x.x)에서 맥 ↔ 폰 TCP가 차단돼 무선 디버깅이 되지 않는다.** 2026-08-20에 **폰 핫스팟으로 우회**해서 해결했다.

진단 포인트: **mDNS는 통과하는데 TCP만 막히는 조합이 AP 클라이언트 격리(client isolation)의 증상이다.** `adb mdns services`에는 기기가 보이는데 `adb connect`가 타임아웃 나면 방화벽·포트가 아니라 AP 설정을 의심한다.

**대응 우선순위**
1. **USB 케이블** — 네트워크를 아예 안 탄다. 가능하면 이게 가장 확실하다
2. **폰 핫스팟에 맥을 연결** — 같은 사설망에 둘만 있게 만든다 (실측으로 통한 경로)
3. **에뮬레이터로 대체** — 네트워크가 개입하지 않는다. 실기에서만 재현되는 문제(카메라·푸시·실지도 성능)가 아니면 에뮬레이터로 충분하다

---

## 관측 환경 (스테일 판별용)

이 문서의 실측 항목은 아래 환경에서 관측했다. Expo·Android 버전이 크게 바뀌면 재확인이 필요하다.

| 항목 | 값 |
|---|---|
| 관측일 | 2026-08-20 |
| 실기 | 갤럭시 S25 (`SM_S931N`) |
| 에뮬레이터 | `sdk_gphone64_arm64` / `sdk_gphone16k_arm64` |
| Expo SDK | 57 (`expo ~57.0.9`, `react-native 0.86.2`) |
| 호스트 | macOS (Apple Silicon) |
| 패키지명 / 스킴 | `kr.fillmap.app` / `fillmap://` (구: `com.anonymous.fillmap`) |
