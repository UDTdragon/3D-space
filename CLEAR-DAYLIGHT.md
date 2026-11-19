# 맑은 창문·밝은 채광 수정본

Blender 원본: neoize-gallery-clear-daylight.blend

- MAT_Window_Clear_Glass: Mix Shader 값 0.025. 97.5% Transparent BSDF와 2.5% 거칠기 0의 유리를 혼합합니다. 창밖을 선명하게 유지하며 약한 반사를 남깁니다.
- Daylight_Sun: 강도 5.0, 각도 0.009rad. 햇빛과 창틀 그림자를 또렷하게 만듭니다.
- Window_Sky_Area: 각각 110W. 실내에 부드러운 하늘빛을 제공합니다.
- Gallery_Track_Spot: 각각 460W. 전시 벽면의 조명 퍼짐을 만듭니다.
- 노출: +0.35. 외부 사진 발광 강도: 1.65.
- 바닥: 회색, Roughness 0.32. 벽은 미세한 질감과 좁은 색상 차이로 얼룩을 줄였습니다.

웹 출력은 panoramas-clear-daylight 폴더의 24면, 2048×2048, 48샘플입니다. 수정 후 재렌더할 때는 새 출력 폴더를 사용하세요. render_panoramas.py는 기존 PNG가 있으면 건너뜁니다.

관람 카메라 위치·방향은 변경하지 않았습니다. 웹의 행사 이미지와 소개는 별도 요소입니다.