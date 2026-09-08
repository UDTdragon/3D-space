# 네오아이즈 2026 주요 행사 전시관

밝은 석고 벽, 천장 보, 레일 조명, 큰 창과 가을 풍경을 표현한 정적 360° 전시관입니다. 원본 스크린샷의 정확한 공간 복원이 아니라, 참고 이미지를 바탕으로 새로 구성한 공통 공간 모델입니다.

## 실행과 배포

Node 22 이상에서 `npm ci`, `npm run dev`로 실행합니다. `npm run build` 결과인 `dist`는 별도 서버 기능 없이 정적 호스팅할 수 있습니다. Vite의 상대 경로 base 설정과 `asset()` 공통 함수로 저장소 하위 경로를 지원합니다.

GitHub 저장소 Settings → Pages → Source에서 **GitHub Actions**를 선택하면 main 브랜치 push마다 `.github/workflows/deploy.yml`이 빌드하고 배포합니다.

## Blender 배경 적용 및 이후 수정

관람 배경은 `neoize-gallery-material-lighting-edited.blend`에서 Cycles로 렌더링한 큐브맵을 사용합니다. 네 관람 지점 × 여섯 면, 면당 2048×2048px, 24샘플과 디노이즈로 출력한 WebP입니다. 작품과 소개 문구는 웹에서 별도 표시하므로 Blender 배경에 합치지 않습니다.

렌더 스크립트는 `scripts/render-blender.py`이며 NVIDIA OptiX GPU를 사용합니다. 다른 장치에서는 해당 GPU 설정을 환경에 맞게 조정하세요. 출력 폴더의 기존 PNG는 건너뛰므로 재질을 수정한 후에는 새 출력 폴더를 지정해야 합니다.

1. Blender에서 창틀·벽 재질·조명을 수정합니다. 관람 카메라의 위치·회전·90도 시야각은 유지합니다.
2. `entrance`, `discovery`, `connection`, `horizon` 지점별로 `px`, `nx`, `py`, `ny`, `pz`, `nz` 카메라를 정사각형 PNG로 출력합니다. 모든 면에 동일한 노출과 색상 관리를 사용합니다.
3. `node scripts/import-blender.mjs "렌더 폴더"`를 실행합니다. 24개 PNG의 존재와 크기를 검사한 뒤 `public/panoramas/`를 압축 WebP로 교체합니다.
4. `src/viewer.js`의 파노라마 URL 버전을 갱신하고 빌드·미리보기에서 방향과 액자 정렬을 확인한 뒤 커밋합니다.

GitHub Actions는 커밋된 파노라마를 그대로 배포합니다. 기존 `npm run bake`는 Three.js 공간 제작용 도구로, 실행하면 Blender 배경을 기존 공간 이미지로 덮어씁니다. 아래의 Three.js 제작 설명은 이전 제작 방식의 참고입니다.

창밖 사진만 GitHub에 올려도 Blender 배경은 바뀌지 않습니다. Blender의 외부 풍경 이미지도 교체하고 네 지점을 다시 렌더링해야 합니다. 첫 화면의 `public/assets/entrance-exterior.webp`는 별도 이미지이며 이번 실내 큐브맵 교체 대상과 다릅니다.

## 공간 자료 제작과 웹 기능

1. `src/room.js`는 모든 관람 지점이 공유하는 공간 구조, 석고 재질, 창틀, 조명, 외부 이미지 위치를 정의합니다.
2. `src/data.js`의 관람 좌표에서 각각 여섯 방향을 동일한 조건으로 렌더링합니다. Chrome이 설치된 제작 환경에서 로컬 개발 서버를 켜고 `npm run bake -- --first`로 대표 지점을 먼저 만듭니다.
3. `public/assets/representative.webp`를 확인한 뒤 `npm run bake`로 전체 지점을 출력합니다. 면당 2048px의 압축 WebP 큐브맵이며 원근과 조명은 동일 모델 기준입니다. 별도의 실측 360 원본은 제공되지 않았습니다.
4. 배포용 실행 코드에서는 실내 모델을 실시간 렌더링하지 않고 이 큐브맵을 사용합니다. 액자와 바닥 이동 표시는 별도 3D 요소입니다.

`scripts/bake.mjs`와 `src/bake.js`는 제작 도구이며 최종 이용 화면에는 포함되지 않습니다. 더 높은 수준의 실사 질감이 필요하면 동일 좌표와 축 규약을 유지한 오프라인 렌더러 출력으로 배경 파일을 교체할 수 있습니다.

## 작품 교체

Respect differences 슬로건과 첨부 네오아이즈 로고를 사용합니다. 실제 행사 자료는 아직 제공되지 않아 6개 행사 기록은 준비 중 안내로 표시합니다. `public/artworks/`의 SVG를 같은 이름으로 수정하면 모든 지점과 확대 화면에 동시에 반영됩니다. JPG/PNG/WebP로 바꾸려면 src/data.js의 해당 작품 image 값을 public 아래의 상대 경로로 지정하세요. pdf 값을 documents/example.pdf처럼 지정하면 상세 창에 PDF 링크가 나타납니다. 제목·설명·벽면 위치·회전은 `src/data.js`에서 관리합니다. 기존 이미지는 배경에 합성되어 있지 않습니다.

PDF나 GLB를 추가할 경우 `public/` 아래에 넣고 `asset('documents/example.pdf')`처럼 상대 경로로 참조하세요. 원본 PDF·GLB는 제공되지 않아 이 버전에는 포함하지 않았습니다.

## 동작 및 최적화

- 문밖 전실에서 입장 후 드래그/방향키 회전, 바닥 원 이동, 휠·버튼 확대, 액자 클릭과 상세 보기.
- 이동 시 월드 기준 yaw/pitch를 보존하며 배경과 전시 좌표를 함께 전환합니다.
- 상세 창에서 Esc 또는 닫기로 돌아가면 시점과 확대 수준이 보존됩니다.
- 첫 지점 우선 로드, 다음 지점 프리로드, 현재/다음 지점 외 텍스처 해제, 기기 픽셀 비율 제한.
- `npm test`는 로컬 Chrome에서 입장·드래그·바닥 이동·액자 클릭·모바일 화면을 검사합니다. `GALLERY_URL` 환경 변수로 실제 배포 주소를 검사할 수 있습니다.

외부 가을 풍경은 내장 ImageGen으로 생성했습니다. 프롬프트: photorealistic sunny autumn park, golden and orange trees, stone path, grass, distant low brick buildings, blue sky, warm midday light, no window frames, interior, text or UI.


## 입구와 첫 전시 벽

첫 화면은 동일 공간 모델의 문밖 전실을 렌더링한 `public/assets/entrance-exterior.webp`입니다. 입장하면 소개와 행사 01이 나란히 있는 벽면을 바라봅니다. 소개 문구는 `public/assets/wall-introduction.svg`이며 별도 3D 평면으로 벽에 붙습니다. 입장 후 좌측 상단 로고/위치 문구와 하단 01~04 버튼은 표시하지 않습니다. 바닥 원으로 이동하며 키보드의 PageDown/PageUp으로도 지점 이동이 가능합니다.

## 창밖 풍경을 고화질로 교체하는 방법

현재 원본 `public/assets/autumn.webp`는 1774×887px입니다. 큰 창과 확대 시점에 비해 작은 원본이므로 파노라마 크기를 높이는 것만으로 나뭇잎 등의 디테일이 복원되지는 않습니다. 가로 6000~8000px 정도의 선명한 원본을 준비하고, 기존과 비슷한 가로 2:1 구도의 풍경을 사용하면 배치를 유지하기 좋습니다. 작은 이미지를 단순히 확대하는 것은 원본 디테일을 늘리지 않습니다.

1. `node scripts/prepare-exterior.mjs "고해상도 원본 경로"`로 풍경만 변환합니다. 다른 행사 콘텐츠는 건드리지 않습니다. 또는 고화질 WebP를 `public/assets/autumn.webp`에 직접 넣습니다.
2. `npm run dev`를 실행한 상태에서 별도 터미널로 `npm run bake`를 실행합니다. 기본값은 큐브면 2048×2048, WebP 품질 95입니다. 더 큰 출력을 원하면 PowerShell에서 `$env:PANORAMA_SIZE=3072`를 설정한 후 실행할 수 있지만, 다운로드와 GPU 메모리 사용량도 늘어납니다.
3. 생성된 `public/panoramas/`의 4개 지점 전체와 `public/assets/entrance-exterior.webp`, `public/assets/representative.webp`, 원본 풍경 파일을 함께 커밋합니다. 그다음 GitHub Actions가 배포합니다.

GitHub에서 `autumn.webp`만 업로드하면 관람 중 배경은 바뀌지 않습니다. GitHub Actions는 웹 빌드·배포만 수행하며 공간 이미지를 재렌더링하지 않습니다. 이번 변경에서는 원본 풍경은 유지했고, 파노라마 출력만 1536px에서 2048px로 높였습니다.
