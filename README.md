# Cozybridge

> 2D 창작형 다리 건설·물리 퍼즐 게임 (`v1.0.0`)

## 프로젝트 구조

```
linebound/
├── apps/
│   ├── game/             # React + Phaser 게임 앱 (@cozybridge/game)
│   └── desktop/          # Tauri 2 Windows 데스크톱 앱 (@cozybridge/desktop)
└── packages/
    ├── domain/           # 게임 규칙, 타입, 비즈니스 로직 (@cozybridge/domain)
    ├── content/          # 캠페인 22단계, 수업 6단계, 비법 노트 (@cozybridge/content)
    ├── simulation/       # Matter.js 물리 시뮬레이션 엔진 (@cozybridge/simulation)
    ├── infrastructure/   # IndexedDB(Dexie), 인증, 동기화 (@cozybridge/infrastructure)
    └── application/      # 유스케이스 조율 레이어 (@cozybridge/application)
```

## 시작하기

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev

# 도메인 테스트 실행
pnpm test:domain

# 전체 테스트
pnpm test

# 웹 프로덕션 빌드
pnpm build
```

## 기술 스택

- **TypeScript** — 전체 프로젝트 언어
- **React 19** — UI 프레임워크
- **Phaser 4** — 2D 게임 캔버스
- **Matter.js** — 2D 물리 엔진
- **Tailwind CSS 4** — 스타일링
- **Vite 6** — 빌드 도구
- **Tauri 2** — Windows 데스크톱 패키징
- **pnpm** — 패키지 관리

## 현재 버전

v1.0.0 — 릴리스 빌드로 캠페인 22단계, 수업 모드 6단계, 자유 만들기, 내 다리 보관함, 다리 광장 및 Tauri 데스크톱 패키징을 지원합니다.
