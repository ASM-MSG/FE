#!/bin/sh
# 에뮬레이터 핀치 줌 (MSG-566) — `adb shell input`은 단일 포인터라 핀치가 안 된다.
# 멀티터치 프로토콜 B를 sendevent로 직접 쏜다. **`adb root` 선행**(google_apis 이미지만 가능,
# Play 이미지는 root 불가), 끝나면 `adb unroot`. 기기의 /data/local/tmp 에 push해서 실행한다:
#   adb root && adb push apps/mobile/scripts/emu-pinch.sh /data/local/tmp/pinch.sh
#   adb shell sh /data/local/tmp/pinch.sh 320 60     # 손가락 간격 320px→60px = 줌아웃 1단
#   adb shell sh /data/local/tmp/pinch.sh 60 320     # 반대로 = 줌인
#   adb unroot
# 함정: virtio 터치 장치는 BTN_TOUCH(0x14a)가 없고 BTN_STYLUS만 있어 툴타입(0x37)을 0(finger)으로
# 명시하고 압력(0x3a)을 줘야 IME 필기 모드가 아닌 손가락 제스처로 인식된다.
# 좌표계: 장치 축 0..32767 ↔ 화면 1080x2400(`wm size`). 다른 해상도면 W·H를 바꾼다.
D=/dev/input/event1; W=1080; H=2400
CX=${3:-540}; CY=${4:-700}; S=$1; E=$2; STEPS=25
rx() { echo $(( $1 * 32767 / W )); }
ry() { echo $(( $1 * 32767 / H )); }
Y=$(ry $CY)
se() { sendevent $D $1 $2 $3; }
down() { se 3 47 $1; se 3 57 $2; se 3 55 0; se 3 48 10; se 3 58 60; se 3 53 $3; se 3 54 $Y; }
down 0 100 $(rx $((CX-S))); down 1 101 $(rx $((CX+S))); se 3 0 $(rx $((CX-S))); se 3 1 $Y; se 0 0 0
sleep 0.05
i=1
while [ $i -le $STEPS ]; do
  g=$(( S + (E - S) * i / STEPS ))
  se 3 47 0; se 3 53 $(rx $((CX-g))); se 3 54 $Y
  se 3 47 1; se 3 53 $(rx $((CX+g))); se 3 54 $Y
  se 0 0 0; sleep 0.02
  i=$((i+1))
done
se 3 47 0; se 3 58 0; se 3 57 -1; se 3 47 1; se 3 58 0; se 3 57 -1; se 0 0 0
