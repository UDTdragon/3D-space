# 네오아이즈 전시관 Blender 편집 자료

GitHub UDTdragon/3D-space main 커밋 7a98753 기준. 행사 01 왼쪽, 설명 오른쪽의 최신 좌표 포함.

neoize-gallery.blend 파일을 Blender 5.2에서 여세요. 외부 이미지와 로고는 파일에 내장되어 있습니다.

- 01_Walls_and_Ceiling: 벽과 천장
- 02_Floor_Tiles: 바닥 타일
- 03_Window_Frames_and_Metal: 창틀과 레일 등 금속
- 04_Door_Glass: 출입문 유리
- 05_Trim_Beams_and_Bench: 보, 창턱, 벤치
- 06_Exterior: 창밖 사진
- 09_Lighting: Sun과 레일 스포트라이트
- 10_Cameras: 네 관람 지점 × 6면 카메라 및 미리보기 카메라
- 11_Web_Content_Guides: 웹에서 별도로 표시하는 행사와 설명의 위치 가이드

오브젝트 선택 → Material Properties에서 재질 수정. 같은 재질을 공유하는 다른 오브젝트도 함께 바뀝니다. 개별 변경은 재질 이름 옆 사용자 수 버튼으로 복제하세요. 벽과 천장도 필요한 경우 재질을 복제해 분리하세요.

간접광은 Cycles로 계산합니다. Rendered 뷰 또는 F12에서 확인하세요. 기본 Sun, 환경광, 4회 확산 반사가 설정되어 있으나 최종 품질 튜닝은 하지 않았습니다. World Shader에서 HDRI를 연결하거나 환경 밝기를 조정할 수 있습니다. 창밖 사진 평면은 햇빛과 간접광을 막지 않도록 설정했습니다.

원본 측면 창문에는 유리판이 없었습니다. 08_Optional_Window_Glass 컬렉션은 추가 편집용으로 만들었으며 표시/렌더링을 기본적으로 껐습니다. 필요하면 컬렉션의 모니터·카메라 아이콘을 켜세요.

원본 형상과 좌표를 유지했고 작은 베벨을 수정자로 추가했습니다. 텍스처를 입히기 전 원하는 매핑 크기와 UV를 확인하세요. 작품 이미지와 설명문은 배경에 중복 렌더링되지 않도록 가이드로만 들어 있습니다.

카메라 좌표는 웹과 맞춰져 있습니다. 재질을 바꿀 때는 카메라를 이동하지 마세요. 좌표 변환은 (x,y,z) → (x,-z,y)입니다. 큐브 면 이름/방향은 기존 bake.js 규칙을 그대로 따릅니다.

주의: 현재 GitHub Actions는 Three.js 파노라마를 다시 생성합니다. 향후 Blender 렌더링 결과를 웹에 적용하기 전 자동 생성 단계를 변경해야 합니다. 이번 자료 제작에서는 웹과 GitHub 배포를 변경하지 않았습니다.

build_gallery.py는 초기 장면 재생성용입니다. 실행하면 새 장면을 만들고 neoize-gallery.blend를 덮어쓰므로, 사용자가 편집한 파일은 반드시 다른 이름으로 저장하세요.

## 벽 재질·간접광 수정본

`neoize-gallery-material-lighting-edited.blend`에는 창문 수정과 함께 다음 설정이 적용되어 있습니다.

- `MAT_Wall_Fine_Plaster`: 벽의 색상, 미세 요철과 거칠기
- `MAT_Ceiling_Soft_Plaster`: 천장용 밝은 석고
- `MAT_Trim_Satin`: 창턱과 건축 마감
- `Daylight_Sun`: 따뜻한 직사광과 창틀 그림자
- `Window_Sky_Area_01`~`04`: 창문을 통해 들어오는 부드러운 하늘광
- `Gallery_Track_Spot_01`~`05`: 전시 벽면의 조명 원
- `Ceiling_Indirect_Fill`: 천장과 실내의 약한 반사광 보완
- `World > Background Strength`: 공간 전체 환경광

Cycles 256 샘플, 디노이즈, 확산 반사 6회, 유리 투과 반사 6회와 AgX 색상 관리가 설정되어 있습니다. 조명을 수정할 때는 먼저 `Daylight_Sun`, `Window_Sky_Area`와 World Strength를 조정하고, 벽면 조명 원은 `Gallery_Track_Spot`의 Power와 Spot Size로 조정하세요.

`modify_materials_lighting.py`를 실행하면 창문 수정본을 기준으로 재질·조명 파일을 다시 생성합니다. Blender에서 직접 편집한 결과를 보존하려면 다른 파일명으로 저장하세요.