# 프라이어팰리스 리노베이션 공감 리포트

입주민 배포용 공감 리포트를 HTML 원본 중심으로 관리하는 저장소입니다.

공개용 HTML: https://dahanpark.github.io/pp/

## 구성

- `src/report.html`: 2026년 11월호 최신 웹 발행 원본 (20쪽)
- `releases/2026-11/261026_프라이어팰리스 리노베이션 공감리포트_26년 11월_Rev10.html`: 11월호 최신 HTML. 사용자가 지정한 Rev08의 화면 구성 복원, 글꼴·아이콘·스타일 로컬화
- `releases/2026-11/261026_프라이어팰리스 리노베이션 공감리포트_26년 11월_Rev10.pdf`: HTML 동일본. Rev08의 글씨 크기·줄바꿈·배치를 288dpi 무손실 화면으로 보존한 20쪽 PDF
- `releases/2026-11/261026_프라이어팰리스 리노베이션 공감리포트_26년 11월_Rev10_A4가로_화면비유지.pdf`: A4 가로 인쇄 사본. 재배치 없이 페이지 전체를 균등 확대·축소하므로 페이지별 여백과 글씨의 물리적 크기는 달라짐
- `releases/2026-11/`의 Rev02~Rev09 HTML: 이전 확정본 보관
- `releases/2026-10/report-Rev15.html`: 10월호 잠금본 HTML 보관
- `src/survey-results.html`: 10월 설문 결과 14문항·제출 246건을 별도로 관리하는 HTML (4쪽, A4 가로 인쇄 대응)
- `assets/`: 표지·로고·11월호 별첨 이미지 13점, 로컬 Noto Sans KR 및 Font Awesome 글꼴과 라이선스
- `scripts/export_screen_pdf.cjs`, `scripts/capture_screen_pages.cjs`, `scripts/merge_screen_pdf.py`: 화면 레이아웃 검증·288dpi 캡처·화면 동일 PDF와 A4 사본 생성
- `scripts/build_html_release.cjs`: 스타일·설문 렌더러를 포함한 HTML 보관본 생성
- `releases/2026-10/`: 10월호 보관본
- `releases/2026-11/`: 11월호 배포본

## 운영 원칙

1. 리포트 내용과 디자인은 모바일 HTML 원본인 `src/report.html`에서 먼저 수정합니다.
2. HTML 확정본을 `releases/YYYY-MM/`에 보관합니다. PDF는 화면 동일본을 먼저 만들고 A4 인쇄 사본을 따로 만듭니다.
3. HTML과 PDF를 각각 화면·인쇄 매체에서 확인합니다.
4. 인증 제출 자료, 참가자 명단, 녹화 영상 등 민감한 첨부물은 사용자가 직접 관리하며 Git 저장소에 넣지 않습니다.
5. 변경 단위마다 Git 커밋을 남겨 발행 이력을 관리합니다.

대수선 주민 의견조사 결과는 `src/survey-results.html`과 11월호 8~11쪽에 동일한 집계 데이터로 표시합니다. 조사 기간은 2026.10.7~10.25(19일간), 수록 응답은 10.25 23:11까지 접수된 246건입니다. 제공된 원본의 10.26 응답 1건은 마감 기준에서 제외했습니다. 문항별 유효 응답 수는 미응답에 따라 다릅니다. 공지방 인원 138명·354명은 응답자 수와 다릅니다.

## PDF 생성·확인

HTML 상단의 **HTML 동일 PDF** 버튼을 사용합니다. 화면 동일본은 브라우저의 인쇄용 CSS를 사용하지 않고 `screen` 미디어의 288dpi 무손실 이미지를 원래 화면 크기로 PDF에 넣습니다. PDF 엔진의 폰트·그림자 재해석도 생기지 않으며, 원본의 글씨 크기와 요소 위치를 바꾸지 않습니다. 화면 보존을 위해 이미지 방식으로 만들었으므로 PDF 텍스트 선택·검색은 지원하지 않습니다. 각 페이지 높이가 달라 모두 A4 가로 크기는 아닙니다. 모바일 화면은 읽기 편하게 세로로 재배치됩니다.

종이 인쇄에는 **A4 가로 PDF** 버튼을 사용합니다. 원본 페이지를 A4 한 장에 맞추는 균등 배율만 적용하며 줄바꿈이나 내부 배치를 바꾸지 않습니다. 긴 원본 페이지는 A4에 맞추며 축소됩니다. 원본 글씨 크기 유지와 모든 페이지의 A4 가로 규격 고정은 별개의 출력 조건입니다.

생성 순서: `node scripts/export_screen_pdf.cjs` → `node scripts/capture_screen_pages.cjs` → `python scripts/merge_screen_pdf.py` → `python scripts/verify_screen_pdf.py` → `node scripts/build_html_release.cjs`. 실행 환경에는 Playwright·Chrome, pypdf·ReportLab·Pillow·NumPy·pypdfium2가 필요합니다. `scripts/build_pdf.cjs`는 이전 호의 출력 코드이며 현재 화면 동일본 생성에는 사용하지 않습니다.

검증 근거는 보관본과 같은 이름의 `-layout-check.json`에 저장합니다. Rev08 대비 페이지 내 텍스트·글씨 크기·줄간격·색상·좌표 비교, 캡처 직전의 글씨·좌표 변화 여부, PDF에 들어간 이미지와 화면 원본의 픽셀 일치 여부 및 실제 PDF 렌더링을 확인합니다. 주민 대화 원문·설문 개별 응답·인증 자료는 Git 저장소에 올리지 않습니다.
