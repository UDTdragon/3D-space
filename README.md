# 네오아이즈 2026 주요 행사 전시관

밝은 석고 벽, 천장 보, 레일 조명, 큰 창과 가을 풍경을 표현한 정적 360° 전시관입니다. 원본 스크린샷의 정확한 공간 복원이 아니라, 참고 이미지를 바탕으로 새로 구성한 공통 공간 모델입니다.

## 실행과 배포

Node 22 이상에서 `npm ci`, `npm run dev`로 실행합니다. `npm run build` 결과인 `dist`는 별도 서버 기능 없이 정적 호스팅할 수 있습니다. Vite의 상대 경로 base 설정과 `asset()` 공통 함수로 저장소 하위 경로를 지원합니다.

GitHub 저장소 Settings → Pages → Source에서 **GitHub Actions**를 선택하면 main 브랜치 push마다 `.github/workflows/deploy.yml`이 빌드하고 배포합니다.

## 공간 자료 제작과 웹 기능

1. `src/room.js`는 모든 관람 지점이 공유하는 공간 구조, 석고 재질, 창틀, 조명, 외부 이미지 위치를 정의합니다.
2. `src/data.js`의 관람 좌표에서 각각 여섯 방향을 동일한 조건으로 렌더링합니다. Chrome이 설치된 제작 환경에서 로컬 개발 서버를 켜고 `npm run bake -- --first`로 대표 지점을 먼저 만듭니다.
3. `public/assets/representative.webp`를 확인한 뒤 `npm run bake`로 전체 지점을 출력합니다. 면당 1536px의 압축 WebP 큐브맵이며 원근과 조명은 동일 모델 기준입니다. 별도의 실측 360 원본은 제공되지 않았습니다.
4. 배포용 실행 코드에서는 실내 모델을 실시간 렌더링하지 않고 이 큐브맵을 사용합니다. 액자와 바닥 이동 표시는 별도 3D 요소입니다.

`scripts/bake.mjs`와 `src/bake.js`는 제작 도구이며 최종 이용 화면에는 포함되지 않습니다. 더 높은 수준의 실사 질감이 필요하면 동일 좌표와 축 규약을 유지한 오프라인 렌더러 출력으로 배경 파일을 교체할 수 있습니다.

## 작품 교체

Respect differences 슬로건과 첨부 네오아이즈 로고를 사용합니다. 실제 행사 자료는 아직 제공되지 않아 6개 행사 기록은 준비 중 안내로 표시합니다. `public/artworks/`의 SVG를 같은 이름으로 수정하면 모든 지점과 확대 화면에 동시에 반영됩니다. JPG/PNG/WebP로 바꾸려면 src/data.js의 해당 작품 image 값을 public 아래의 상대 경로로 지정하세요. pdf 값을 documents/example.pdf처럼 지정하면 상세 창에 PDF 링크가 나타납니다. 제목·설명·벽면 위치·회전은 `src/data.js`에서 관리합니다. 기존 이미지는 배경에 합성되어 있지 않습니다.

PDF나 GLB를 추가할 경우 `public/` 아래에 넣고 `asset('documents/example.pdf')`처럼 상대 경로로 참조하세요. 원본 PDF·GLB는 제공되지 않아 이 버전에는 포함하지 않았습니다.

## 동작 및 최적화

- 입장 후 드래그/방향키 회전, 바닥 원/하단 관람 지점 이동, 휠·버튼 확대, 액자 클릭과 상세 보기.
- 이동 시 월드 기준 yaw/pitch를 보존하며 배경과 전시 좌표를 함께 전환합니다.
- 상세 창에서 Esc 또는 닫기로 돌아가면 시점과 확대 수준이 보존됩니다.
- 첫 지점 우선 로드, 다음 지점 프리로드, 현재/다음 지점 외 텍스처 해제, 기기 픽셀 비율 제한.
- `npm test`는 로컬 Chrome에서 입장·드래그·바닥 이동·액자 클릭·모바일 화면을 검사합니다. `GALLERY_URL` 환경 변수로 실제 배포 주소를 검사할 수 있습니다.

외부 가을 풍경은 내장 ImageGen으로 생성했습니다. 프롬프트: photorealistic sunny autumn park, golden and orange trees, stone path, grass, distant low brick buildings, blue sky, warm midday light, no window frames, interior, text or UI.

