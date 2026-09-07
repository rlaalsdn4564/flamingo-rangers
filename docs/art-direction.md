# 원작 관찰과 새 원화

## 직접 확인한 참고 화면

- [인터플래시 원작 소개와 4개 화면](https://inter87.tistory.com/490): 이미지 갤러리의 실제 협동 결정타 화면을 CUA로 열어 확인했습니다.
- [와플래시 한글화판](https://vidkidz.tistory.com/54): 원작 식별과 한글화판의 관계를 확인했습니다.
- [일본 원제와 조작 안내](https://gamez.chakin.com/content/000069.html): 일본 제목과 전투 단계 설명을 대조했습니다.

관찰 사실과 이번 결정은 다음과 같습니다.

1. 원작은 세로로 높은 건물 앞을 작은 전신 인물이 가로로 싸우는 화면입니다. 새 게임도 1280×720의 단일 전투 화면을 쓰고 인물을 바닥 좌표에 고정합니다. 대시보드나 게임 카드 목록 안에서 싸우지 않습니다.
2. 넓은 파란 유리 면, 굵은 콘크리트 띠, 건물 앞의 가로수와 낮은 금속 펜스가 보입니다. 새 유리빛 대로는 동일한 도시 문법을 쓰되 간판 없는 상가·정류장·지하철 입구·은행나무를 따로 그린 새 파노라마입니다.
3. 상단 왼쪽의 대원 얼굴, 오른쪽의 보스 얼굴, 어두운 체력 바가 화면 가장자리를 차지합니다. 새 게임은 대원 그림과 대원별 체력/기력을 왼쪽에, 실제 보스 HP를 오른쪽에 둡니다.
4. 협동 결정타 화면에서 세 대원은 똑같은 V 자세가 아니라, 서서 뒤에서 지지하기·무릎 꿇기·앞으로 쏘기의 다른 관절 자세로 모입니다. 새 결정타는 세 대원의 서로 다른 포즈를 합치고 전투 상태가 결정타로 바뀔 때만 광선을 그립니다.
5. 보존 페이지는 Z 공격, X 특수, C 교체, C+C 결정타를 설명합니다. 이 입력 관계를 유지하되 점프/방어/3단 콤보와 대원별 수치는 새 규칙입니다. 원작의 전체 스테이지나 모든 타격 프레임을 플레이하며 동일성 검증한 것은 아닙니다.

참고용 원작 스크린샷은 이 저장소에 포함하지 않았습니다.

## 구체적인 미술 결정

`unslop-ui`의 참조·색·서체·레이아웃 선택 절차를 사용했습니다. 색은 원작 화면의 청록 유리와 빨강/파랑/노랑 대원에서 출발했습니다. 서체는 한글 웹 게임의 작은 HUD에 어울리는 **Galmuri11**을 선택했습니다. 게임 전체가 곧 첫 화면이며, 광고형 hero/feature 카드 레이아웃은 없습니다.

대원은 긴 홍학 목, 실제로 굽은 분홍 부리, 깃털 갑주, 흰 장갑/장화가 있는 새 캐릭터입니다. 24개 포즈를 그린 뒤 실제 알파 연결요소를 검사하여 칸 침범을 제거했습니다. 대원 몸 크기를 포즈마다 자동 확대하지 않고 같은 원본-게임 비율 `0.61`을 유지하며 발바닥을 `GROUND=598`에 정렬합니다. 적도 대기/예고/타격/피격에 맞는 원화로 전환합니다.

메카는 생성 시도한 배경 제거가 실제 알파 검사에서 실패했기 때문에 해당 생성물을 런타임에 쓰지 않습니다. 최종 갈대왕은 별도의 코드 기반 관절 구조입니다. 파란 다리, 노란 다리, 붉은 가슴/머리 모듈이 분리된 상태에서 조립되며, 공격 시 팔 관절이 움직입니다. 대원 그림을 크게 늘린 것이 아닙니다.

## 생성 자산 기록

모든 채택 bitmap은 기본 내장 이미지 생성 도구로 만들었습니다. 외부 이미지 모델 CLI/API는 사용하지 않았습니다. 아래 파일 외에는 미선택 생성물이나 원작 이미지를 런타임에 사용하지 않습니다.

| 파일                            | 실제 크기       | 용도                                                |
| ------------------------------- | --------------- | --------------------------------------------------- |
| `public/art/rangers-atlas.png`  | 1774×887, RGBA  | 세 대원 × 8포즈                                     |
| `public/art/enemies-atlas.png`  | 1254×1254, RGBA | 까마귀 병정/방패 게/드릴 비틀/글라스 맨티스 × 4포즈 |
| `public/art/glass-avenue.png`   | 2172×724        | 반사 유리, 상가, 정류장, 은행나무 거리              |
| `public/art/canal-junction.png` | 2172×724        | 운하, 붉은 교량, 시장, 버드나무                     |
| `public/art/central-tower.png`  | 2172×724        | 석양 관제탑, 모노레일, 광장, 금속 깃털 조형물       |

### 프롬프트 기록

영웅: “Production 2D action-game sprite atlas, transparent PNG. Original Flamingo sentai trio with premium hand-drawn 2000s Flash cartoon cel art. 8 columns × 3 rows. Red captain with rounded scarlet helmet, hooked pink flamingo beak, white feather cheek and gold crest; slimmer blue with swept feathers; stockier yellow with large gloves. Each row: idle, two run keys, punch, uppercut, high kick, jump, crossed-arm guard. Full body, face right, consistent costumes, genuine alpha, no text, no franchise suits.”

적: “Transparent 4 columns × 4 rows action-game enemy sprite atlas. Columns idle, coiled anticipation, full strike, recoil. Rows charcoal mechanical crow with crimson eyes and talons; turquoise shield crab; olive/yellow drill beetle; mint/bone-white glass mantis with wing panels and crescent blades. Face left, crisp variable-weight ink and two-tone cel shadows, no famous villains, no text.”

유리빛 대로: “Production scrolling 2D beat-em-up background panorama 3072×1024 ultrawide. Orthographic side elevation, sidewalk at 82%, empty asphalt below. Detailed cyan glass bank with reflected diagonal panes, peach stucco cafe, subway stairs, green convenience store, glass bus shelter, no-text vending machine, nuanced gingko foliage, low metal fence. Bright pale cyan and warm concrete, fine intentional ink, no characters, no UI, no logos, no repeating identical blocks.”

운하: “Production 2D scrolling beat-em-up background panorama 3072×1024. Orthographic side elevation, horizontal road lower 18%. Teal canal railing, shallow reflective water, rust-red broadside arch bridge, tile-roof market pavilion, pale concrete museum with mint windows, navy girder overpass, nuanced willow foliage, bicycles and planters. Cel cartoon afternoon, crisp ink, no characters, no UI, no text.”

관제탑: “Production 2D scrolling beat-em-up background panorama 3072×1024. Orthographic side elevation, empty asphalt lower 18%. Cylindrical communications tower with glass observation saucer, angular monorail station, emerald glass block at sunset, concrete civic steps, pools, nuanced orange-lit trees, three abstract metal feather sculpture, warning barricades, utility cabinet. Fine ink, cel shadows, cyan/sunset orange/concrete, no characters, no UI, no text.”

도구의 실제 출력 크기는 요청 크기와 달라 위 표의 실측값으로 기록했습니다. 원화 배경을 논리 월드의 다른 속도로 이동시키고 지면 표식은 플레이 면 속도로 그립니다. 물리/피격/공격 상태는 이미지에서 추정하지 않고 엔진이 결정합니다.
