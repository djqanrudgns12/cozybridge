# Linebound

> 2D 창작형 다리 건설·물리 퍼즐 게임

## 프로젝트 구조

```
linebound/
├── apps/
│   └── game/          # React + Phaser 게임 앱
├── packages/
│   └── domain/        # 게임 규칙, 타입, 비즈니스 로직
├── tests/             # E2E, 통합 테스트
└── docs/              # 문서
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

## 현재 단계

Phase 0 — 기술 검증
