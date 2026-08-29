# Zzaim Viewer

로컬에 있는 **마크다운 · JSON · YAML · 텍스트**를 폴더째 열어 읽는 정적 웹 뷰어입니다.
업로드도 서버도 없습니다. 브라우저가 디스크에서 직접 읽습니다.

```
npm install
npm run dev      # http://localhost:5173
```

## 무엇을 하나

- **폴더 하나를 열면 그 안을 전부 탐색** — 트리, 이름·경로 필터, `⌘K` 빠른 찾기
- **마크다운** — GFM 표·체크리스트, 코드 하이라이트, 문서 간 상대경로 링크 이동
- **JSON · JSONC · JSONL · YAML** — 접이식 트리, 키/값 검색, 경로(`$.a.b[0]`) 복사, 원문 보기
- **텍스트 · 로그** — 줄 번호, 긴 파일 점진 로드
- **읽기 설정** — 테마 · 글꼴 · 글자 크기 · 본문 너비 · 줄 간격 (브라우저에 저장)
- **다국어** — UI 한국어·영어, 문서는 UTF-8 외에 CP949·Shift_JIS·GB18030·Big5 자동 추론

## 브라우저

| | 폴더 열기 | 재방문 복원 |
| --- | --- | --- |
| Chrome · Edge · Arc · Opera | File System Access API | 지원 |
| Firefox · Safari | 드래그앤드롭 · 폴더 선택 (스냅샷) | 미지원 |

> **`index.html`을 더블클릭해서 열면 동작하지 않습니다.**
> File System Access API 는 보안 컨텍스트(HTTPS 또는 `localhost`)를 요구합니다.
> `npm run dev` 로 띄우거나 정적 호스팅에 배포해서 쓰세요.

## 배포

```
npm run build              # dist/ 에 정적 파일만 생성됩니다
BASE_PATH=/repo/ npm run build   # GitHub Pages 등 서브경로 배포
```

## 상태

M1(폴더 열기 · 트리 · 마크다운 · JSON/YAML 트리 · 텍스트 · 테마 · 빠른 찾기) 완료.

이번 버전은 **읽기 전용**입니다. 폴더 권한을 `read` 로만 요청하므로 파일을 덮어쓸 경로가
아예 없습니다. 편집·저장은 설계를 남겨 두고 다음 버전에서 다시 꺼냅니다.

전체 계획과 남은 마일스톤은 [docs/PLAN.md](docs/PLAN.md) 를 보세요.

`examples/sample/` 에 한국어·일본어·스페인어가 섞인 시험용 폴더가 들어 있습니다.
