import type { LevelDefinition } from './levels';

/** 초기 배치 부재 정의 */
export interface LessonInitialMember {
  readonly id: string;
  readonly startX: number;
  readonly startY: number;
  readonly endX: number;
  readonly endY: number;
  /** true이면 실수로 지우지 못하도록 보호되는 기본 다리 부재 */
  readonly locked?: boolean;
}

/** 점선 가이드(추천 연결 또는 삭제 안내) 선분 */
export interface LessonGuideSegment {
  readonly startX: number;
  readonly startY: number;
  readonly endX: number;
  readonly endY: number;
  /** 'add': 이 점선을 따라 선을 그어보세요 / 'erase': 이 막대를 지우개로 지워보세요 */
  readonly action: 'add' | 'erase';
  readonly label?: string;
}

/** 초등 3학년 눈높이 다리 교실(수업 모드) 커리큘럼 정의 */
export interface LessonDefinition {
  readonly id: string;
  readonly order: number;
  readonly badge: string;
  readonly title: string;
  readonly subtitle: string;
  /** 수업 시작 시 선생님 한마디 (쉬운 일상어) */
  readonly coachIntro: string;
  /** 실패했을 때 눈높이 맞춤 힌트 */
  readonly coachOnFail: string;
  /** 목표 행동을 마쳤거나 준비되었을 때 격려 문구 */
  readonly coachWhenReady: string;
  /** 통과했을 때 원리 정리 칭찬 문구 */
  readonly coachOnSuccess: string;
  /** 기본 추천 도구 ('build' | 'delete') */
  readonly recommendedTool: 'build' | 'delete';
  /** 먼저 실패를 관찰해보도록 유도할지 여부 */
  readonly encourageObserveFirst: boolean;
  /** 초기 배치 부재 목록 */
  readonly initialMembers: readonly LessonInitialMember[];
  /** 점선 가이드 목록 */
  readonly guideSegments: readonly LessonGuideSegment[];
  /** 물리 및 지형 레벨 정의 */
  readonly level: LevelDefinition;
}

export const LESSONS: readonly LessonDefinition[] = [
  // ─── 1교시: 점과 점 이어 끊어진 길 완성하기 ───
  {
    id: 'lesson-001',
    order: 1,
    badge: '1교시 · 길 잇기',
    title: '끊어진 트럭 길 이어주기',
    subtitle: '점 두 개를 차례로 톡! 톡! 눌러서 빈틈없는 길을 만들어요.',
    coachIntro:
      '오른쪽 길이 끊어져 있어요! 먼저 [트럭 출발!]을 눌러 어떻게 되는지 본 다음, 가운데 하얀 점과 오른쪽 노란 고정 핀을 차례로 클릭해 길을 이어주세요.',
    coachOnFail:
      '길이 끊겨 있어서 트럭이 풍덩 빠졌어요! 주황색 점선을 따라 가운데 점을 한 번 톡! 누르고, 오른쪽 노란 고정 핀을 또 한 번 톡! 눌러 이어볼까요?',
    coachWhenReady:
      '우와, 길이 반듯하게 이어졌어요! 이제 [트럭 출발!] 버튼을 눌러 건너가 볼까요?',
    coachOnSuccess:
      '참 잘했어요! 양쪽 노란 고정 핀까지 빈틈없이 선을 이으면 트럭이 달릴 수 있는 길이 된답니다!',
    recommendedTool: 'build',
    encourageObserveFirst: true,
    initialMembers: [
      { id: 'l1-m1', startX: 5, startY: 8, endX: 8, endY: 8, locked: true },
    ],
    guideSegments: [
      {
        startX: 8,
        startY: 8,
        endX: 11,
        endY: 8,
        action: 'add',
        label: '두 점을 차례로 클릭!',
      },
    ],
    level: {
      id: 'lesson-001',
      title: '1교시 · 끊어진 길 이어주기',
      description: '점 두 개를 클릭해 끊어진 트럭 길을 완성하세요.',
      difficulty: 1,
      budget: 30000,
      unitCost: 500,
      maxMemberLength: 6,
      gridConfig: { width: 16, height: 11, cellSize: 40 },
      terrain: [
        { x: 0, y: 8 }, { x: 1, y: 8 }, { x: 2, y: 8 }, { x: 3, y: 8 }, { x: 4, y: 8 }, { x: 5, y: 8 },
        { x: 11, y: 8 }, { x: 12, y: 8 }, { x: 13, y: 8 }, { x: 14, y: 8 }, { x: 15, y: 8 }, { x: 16, y: 8 },
        { x: 6, y: 11 }, { x: 7, y: 11 }, { x: 8, y: 11 }, { x: 9, y: 11 }, { x: 10, y: 11 },
      ],
      anchors: [
        { id: 'l1-a-left', x: 5, y: 8, type: 'fixed' },
        { id: 'l1-a-mid', x: 8, y: 8, type: 'fixed' },
        { id: 'l1-a-right', x: 11, y: 8, type: 'fixed' },
      ],
      truckPath: [
        { x: 0, y: 7 }, { x: 5, y: 7 }, { x: 11, y: 7 }, { x: 16, y: 7 },
      ],
      unlockRequirements: [],
      contentVersion: 1,
    },
  },

  // ─── 2교시: 막대 최대 길이 제한과 징검다리 연결 ───
  {
    id: 'lesson-002',
    order: 2,
    badge: '2교시 · 나누어 잇기',
    title: '너무 멀 땐 징검다리처럼 나누어 잇기',
    subtitle: '막대 하나는 5칸까지만 늘어날 수 있어요! 중간에서 쉬어가며 이어봐요.',
    coachIntro:
      '왼쪽 끝에서 오른쪽 끝까지 한 번에 그으려고 하면 너무 멀어서 빨간 줄이 떠요! 한가운데 노란 고정 핀에서 한 번 쉬었다가 두 번에 나누어 이어보세요.',
    coachOnFail:
      '아직 끝까지 길이 이어지지 않았어요! 왼쪽 노란 고정 핀 → 가운데 노란 고정 핀 → 오른쪽 노란 고정 핀 순서로 차근차근 이어주세요.',
    coachWhenReady:
      '짧은 막대 두 개를 징검다리처럼 멋지게 이었네요! [트럭 출발!]을 눌러보세요!',
    coachOnSuccess:
      '대단해요! 먼 거리도 한 번에 무리해서 긋지 않고 중간 점을 찍어 나누어 이으면 얼마든지 건널 수 있어요!',
    recommendedTool: 'build',
    encourageObserveFirst: false,
    initialMembers: [],
    guideSegments: [
      { startX: 5, startY: 8, endX: 9, endY: 8, action: 'add', label: '1번 막대' },
      { startX: 9, startY: 8, endX: 13, endY: 8, action: 'add', label: '2번 막대' },
    ],
    level: {
      id: 'lesson-002',
      title: '2교시 · 징검다리 나누어 잇기',
      description: '길이 제한(5칸)을 지켜 두 번에 나누어 길을 이으세요.',
      difficulty: 1,
      budget: 35000,
      unitCost: 500,
      maxMemberLength: 5,
      gridConfig: { width: 18, height: 11, cellSize: 40 },
      terrain: [
        { x: 0, y: 8 }, { x: 1, y: 8 }, { x: 2, y: 8 }, { x: 3, y: 8 }, { x: 4, y: 8 }, { x: 5, y: 8 },
        { x: 13, y: 8 }, { x: 14, y: 8 }, { x: 15, y: 8 }, { x: 16, y: 8 }, { x: 17, y: 8 }, { x: 18, y: 8 },
        { x: 6, y: 11 }, { x: 7, y: 11 }, { x: 8, y: 11 }, { x: 9, y: 11 }, { x: 10, y: 11 }, { x: 11, y: 11 }, { x: 12, y: 11 },
      ],
      anchors: [
        { id: 'l2-a-left', x: 5, y: 8, type: 'fixed' },
        { id: 'l2-a-mid', x: 9, y: 8, type: 'fixed' },
        { id: 'l2-a-right', x: 13, y: 8, type: 'fixed' },
      ],
      truckPath: [
        { x: 0, y: 7 }, { x: 5, y: 7 }, { x: 13, y: 7 }, { x: 18, y: 7 },
      ],
      unlockRequirements: [],
      contentVersion: 1,
    },
  },

  // ─── 3교시: 길 위 장애물 & 지우개 도구 (유령 자동차 금지!) ───
  {
    id: 'lesson-003',
    order: 3,
    badge: '3교시 · 길 비우기',
    title: '유령 자동차는 없어요! 길 위 막대 치우기',
    subtitle: '트럭 앞을 가로막는 막대가 있으면 쿵 부딪혀요! 받침대는 길 아래에만 둬요.',
    coachIntro:
      '누군가 트럭이 달리는 길 위쪽에 뾰족한 세모(△)를 세워놨어요! 먼저 [트럭 출발!]로 왜 못 가는지 본 뒤, [지우개]로 빨간 점선이 쳐진 길 위 막대 2개를 지워주세요!',
    coachOnFail:
      '트럭은 유령이 아니라서 길 위 막대에 쿵! 부딪혀 못 지나가요! 왼쪽 [지우개] 도구를 누르고 길 위에 솟은 막대 2개를 클릭해 치워주세요.',
    coachWhenReady:
      '길 위가 뻥 뚫렸어요! 길 아래쪽 받침대(▽)는 든든히 남아 있으니 이제 [트럭 출발!]을 눌러보세요!',
    coachOnSuccess:
      '정답이에요! 트럭이 달리는 길 위는 항상 깨끗이 비워두고, 모든 받침대는 다리 아래쪽(▽)에 만들어야 해요!',
    recommendedTool: 'delete',
    encourageObserveFirst: true,
    initialMembers: [
      { id: 'l3-deck-1', startX: 5, startY: 8, endX: 9, endY: 8, locked: true },
      { id: 'l3-deck-2', startX: 9, startY: 8, endX: 13, endY: 8, locked: true },
      { id: 'l3-under-1', startX: 5, startY: 8, endX: 9, endY: 10, locked: true },
      { id: 'l3-under-2', startX: 9, startY: 8, endX: 9, endY: 10, locked: true },
      { id: 'l3-under-3', startX: 13, startY: 8, endX: 9, endY: 10, locked: true },
      // 지워야 할 길 위 장애물 2개
      { id: 'l3-obs-1', startX: 5, startY: 8, endX: 7, endY: 6, locked: false },
      { id: 'l3-obs-2', startX: 7, startY: 6, endX: 9, endY: 8, locked: false },
    ],
    guideSegments: [
      { startX: 5, startY: 8, endX: 7, endY: 6, action: 'erase', label: '지우개로 클릭!' },
      { startX: 7, startY: 6, endX: 9, endY: 8, action: 'erase', label: '지우개로 클릭!' },
    ],
    level: {
      id: 'lesson-003',
      title: '3교시 · 길 위 장애물 치우기',
      description: '지우개 도구로 트럭 앞을 가로막는 길 위 막대를 지우세요.',
      difficulty: 1,
      budget: 45000,
      unitCost: 500,
      maxMemberLength: 6,
      gridConfig: { width: 18, height: 12, cellSize: 40 },
      terrain: [
        { x: 0, y: 8 }, { x: 1, y: 8 }, { x: 2, y: 8 }, { x: 3, y: 8 }, { x: 4, y: 8 }, { x: 5, y: 8 },
        { x: 13, y: 8 }, { x: 14, y: 8 }, { x: 15, y: 8 }, { x: 16, y: 8 }, { x: 17, y: 8 }, { x: 18, y: 8 },
        { x: 6, y: 12 }, { x: 7, y: 12 }, { x: 8, y: 12 }, { x: 9, y: 12 }, { x: 10, y: 12 }, { x: 11, y: 12 }, { x: 12, y: 12 },
      ],
      anchors: [
        { id: 'l3-a-left', x: 5, y: 8, type: 'fixed' },
        { id: 'l3-a-right', x: 13, y: 8, type: 'fixed' },
      ],
      truckPath: [
        { x: 0, y: 7 }, { x: 5, y: 7 }, { x: 13, y: 7 }, { x: 18, y: 7 },
      ],
      unlockRequirements: [],
      contentVersion: 1,
    },
  },

  // ─── 4교시: 상판 처짐 해결 — 길 아래 뒤집어진 세모(▽) ───
  {
    id: 'lesson-004',
    order: 4,
    badge: '4교시 · 아래쪽 세모(▽)',
    title: '출렁이는 일자 다리에 세모 받침대 달기',
    subtitle: '일자 길만 있으면 무거워서 축 처져요! 길 아래에 세모(▽)를 만들어 봐요.',
    coachIntro:
      '먼저 [트럭 출발!]을 눌러 일자 길이 왜 무너지는지 관찰해보세요! 그다음 주황색 점선을 따라 길 아래쪽에 뒤집어진 세모(▽) 3줄을 이어주세요.',
    coachOnFail:
      '받침대가 없는 일자 길은 트럭 무게에 가운데가 축 처지며 끊어져요! 주황색 점선을 따라 길 아래쪽 점으로 막대 3개를 모아 뒤집어진 세모(▽)를 만들어보세요.',
    coachWhenReady:
      '길 아래에 든든한 세모(▽) 받침대가 생겼어요! [트럭 출발!]로 얼마나 튼튼해졌는지 확인해보세요!',
    coachOnSuccess:
      '우와, 조금도 처지지 않고 건넜어요! 이렇게 길 아래에 세모 모양으로 받쳐 무게를 나누어 주는 게 튼튼한 다리의 핵심 비법이에요!',
    recommendedTool: 'build',
    encourageObserveFirst: true,
    initialMembers: [
      { id: 'l4-deck-1', startX: 5, startY: 8, endX: 9, endY: 8, locked: true },
      { id: 'l4-deck-2', startX: 9, startY: 8, endX: 13, endY: 8, locked: true },
    ],
    guideSegments: [
      { startX: 5, startY: 8, endX: 9, endY: 10, action: 'add', label: '왼쪽 세모 팔' },
      { startX: 9, startY: 8, endX: 9, endY: 10, action: 'add', label: '가운데 기둥' },
      { startX: 13, startY: 8, endX: 9, endY: 10, action: 'add', label: '오른쪽 세모 팔' },
    ],
    level: {
      id: 'lesson-004',
      title: '4교시 · 출렁이는 일자 다리 받치기',
      description: '길 아래쪽에 뒤집어진 세모(▽) 받침대를 만들어 처짐을 막으세요.',
      difficulty: 2,
      budget: 45000,
      unitCost: 500,
      maxMemberLength: 6,
      gridConfig: { width: 18, height: 12, cellSize: 40 },
      terrain: [
        { x: 0, y: 8 }, { x: 1, y: 8 }, { x: 2, y: 8 }, { x: 3, y: 8 }, { x: 4, y: 8 }, { x: 5, y: 8 },
        { x: 13, y: 8 }, { x: 14, y: 8 }, { x: 15, y: 8 }, { x: 16, y: 8 }, { x: 17, y: 8 }, { x: 18, y: 8 },
        { x: 6, y: 12 }, { x: 7, y: 12 }, { x: 8, y: 12 }, { x: 9, y: 12 }, { x: 10, y: 12 }, { x: 11, y: 12 }, { x: 12, y: 12 },
      ],
      anchors: [
        { id: 'l4-a-left', x: 5, y: 8, type: 'fixed' },
        { id: 'l4-a-right', x: 13, y: 8, type: 'fixed' },
      ],
      truckPath: [
        { x: 0, y: 7 }, { x: 5, y: 7 }, { x: 13, y: 7 }, { x: 18, y: 7 },
      ],
      unlockRequirements: [],
      contentVersion: 1,
    },
  },

  // ─── 5교시: 사각형 찌그러짐 vs 대각선 잠금 ───
  {
    id: 'lesson-005',
    order: 5,
    badge: '5교시 · 네모 vs 세모',
    title: '흔들리는 네모 상자에 대각선 그어 잠그기',
    subtitle: '네모(□) 받침대는 옆으로 찌그러져요! 대각선 딱 1개로 세모를 만들어 봐요.',
    coachIntro:
      '길 아래에 네모 상자 받침대가 있어요. 튼튼해 보이지만 먼저 [트럭 출발!]을 눌러볼까요? 그다음 가운데 네모 칸을 가로지르는 대각선 1개를 그어보세요!',
    coachOnFail:
      '가운데 네모 상자가 무게를 받자 옆으로 기우뚱 찌그러지며 무너졌어요! 가운데 네모 칸의 마주 보는 모서리를 비스듬한 대각선 딱 1개로 이어보세요!',
    coachWhenReady:
      '네모 상자가 세모 두 개로 단단히 잠겼어요! 이제 [트럭 출발!]을 눌러 확인해볼까요?',
    coachOnSuccess:
      '마법 같죠? 네모는 모서리가 돌아가며 쉽게 찌그러지지만, 대각선 하나로 세모를 만들면 모양이 절대 무너지지 않아요!',
    recommendedTool: 'build',
    encourageObserveFirst: true,
    initialMembers: [
      { id: 'l5-d1', startX: 5, startY: 8, endX: 8, endY: 8, locked: true },
      { id: 'l5-d2', startX: 8, startY: 8, endX: 11, endY: 8, locked: true },
      { id: 'l5-d3', startX: 11, startY: 8, endX: 14, endY: 8, locked: true },
      { id: 'l5-s1', startX: 5, startY: 8, endX: 8, endY: 10, locked: true },
      { id: 'l5-v1', startX: 8, startY: 8, endX: 8, endY: 10, locked: true },
      { id: 'l5-b1', startX: 8, startY: 10, endX: 11, endY: 10, locked: true },
      { id: 'l5-v2', startX: 11, startY: 8, endX: 11, endY: 10, locked: true },
      { id: 'l5-s2', startX: 11, startY: 10, endX: 14, endY: 8, locked: true },
    ],
    guideSegments: [
      {
        startX: 8,
        startY: 8,
        endX: 11,
        endY: 10,
        action: 'add',
        label: '대각선 딱 1개!',
      },
    ],
    level: {
      id: 'lesson-005',
      title: '5교시 · 흔들리는 네모 상자 잠그기',
      description: '가운데 네모 칸에 대각선을 그어 튼튼한 세모로 나누세요.',
      difficulty: 2,
      budget: 55000,
      unitCost: 500,
      maxMemberLength: 6,
      gridConfig: { width: 19, height: 12, cellSize: 40 },
      terrain: [
        { x: 0, y: 8 }, { x: 1, y: 8 }, { x: 2, y: 8 }, { x: 3, y: 8 }, { x: 4, y: 8 }, { x: 5, y: 8 },
        { x: 14, y: 8 }, { x: 15, y: 8 }, { x: 16, y: 8 }, { x: 17, y: 8 }, { x: 18, y: 8 }, { x: 19, y: 8 },
        { x: 6, y: 12 }, { x: 7, y: 12 }, { x: 8, y: 12 }, { x: 9, y: 12 }, { x: 10, y: 12 }, { x: 11, y: 12 }, { x: 12, y: 12 }, { x: 13, y: 12 },
      ],
      anchors: [
        { id: 'l5-a-left', x: 5, y: 8, type: 'fixed' },
        { id: 'l5-a-right', x: 14, y: 8, type: 'fixed' },
      ],
      truckPath: [
        { x: 0, y: 7 }, { x: 5, y: 7 }, { x: 14, y: 7 }, { x: 19, y: 7 },
      ],
      unlockRequirements: [],
      contentVersion: 1,
    },
  },

  // ─── 6교시: 넓은 강 — 세모 여러 개 기차처럼 잇기 ───
  {
    id: 'lesson-006',
    order: 6,
    badge: '6교시 · 세모 기차',
    title: '넓은 강에 세모 받침대 기차 만들기',
    subtitle: '강이 넓을 땐 세모를 옆으로 이어 붙이고 맨 아랫줄도 손잡듯 연결해요!',
    coachIntro:
      '왼쪽 절반은 세모 받침대가 완성되어 있는데 오른쪽 절반이 비어 있어요! 주황색 점선 3개를 모두 이어서 세모 기차를 완성해보세요.',
    coachOnFail:
      '오른쪽 길 아래가 비어 있거나 아랫줄이 끊어져 무너졌어요! 세모 기둥뿐만 아니라 맨 아랫줄 가로 막대도 손잡듯 꼭 이어주세요!',
    coachWhenReady:
      '세모들이 손에 손을 잡은 기차 모양이 완성되었어요! [트럭 출발!]을 눌러 막대 색깔(초록=안전)을 관찰해보세요!',
    coachOnSuccess:
      '멋져요! 세모 여러 개를 기차처럼 길게 이어 붙이고 아랫줄끼리 연결하면 아무리 넓은 강도 거뜬히 건널 수 있어요!',
    recommendedTool: 'build',
    encourageObserveFirst: false,
    initialMembers: [
      { id: 'l6-d1', startX: 4, startY: 9, endX: 8, endY: 9, locked: true },
      { id: 'l6-d2', startX: 8, startY: 9, endX: 12, endY: 9, locked: true },
      { id: 'l6-d3', startX: 12, startY: 9, endX: 16, endY: 9, locked: true },
      { id: 'l6-u1', startX: 4, startY: 9, endX: 8, endY: 11, locked: true },
      { id: 'l6-u2', startX: 8, startY: 9, endX: 8, endY: 11, locked: true },
      { id: 'l6-u3', startX: 8, startY: 11, endX: 12, endY: 9, locked: true },
    ],
    guideSegments: [
      { startX: 12, startY: 9, endX: 12, endY: 11, action: 'add', label: '오른쪽 기둥' },
      { startX: 8, startY: 11, endX: 12, endY: 11, action: 'add', label: '아랫줄 손잡기!' },
      { startX: 12, startY: 11, endX: 16, endY: 9, action: 'add', label: '절벽 핀 연결!' },
    ],
    level: {
      id: 'lesson-006',
      title: '6교시 · 넓은 강 세모 기차',
      description: '오른쪽 절반에도 연속된 아래쪽 세모 받침대를 이어 붙이세요.',
      difficulty: 2,
      budget: 65000,
      unitCost: 500,
      maxMemberLength: 6,
      gridConfig: { width: 20, height: 13, cellSize: 40 },
      terrain: [
        { x: 0, y: 9 }, { x: 1, y: 9 }, { x: 2, y: 9 }, { x: 3, y: 9 }, { x: 4, y: 9 },
        { x: 16, y: 9 }, { x: 17, y: 9 }, { x: 18, y: 9 }, { x: 19, y: 9 }, { x: 20, y: 9 },
        { x: 5, y: 13 }, { x: 6, y: 13 }, { x: 7, y: 13 }, { x: 8, y: 13 }, { x: 9, y: 13 },
        { x: 10, y: 13 }, { x: 11, y: 13 }, { x: 12, y: 13 }, { x: 13, y: 13 }, { x: 14, y: 13 }, { x: 15, y: 13 },
      ],
      anchors: [
        { id: 'l6-a-left', x: 4, y: 9, type: 'fixed' },
        { id: 'l6-a-right', x: 16, y: 9, type: 'fixed' },
      ],
      truckPath: [
        { x: 0, y: 8 }, { x: 4, y: 8 }, { x: 16, y: 8 }, { x: 20, y: 8 },
      ],
      unlockRequirements: [],
      contentVersion: 1,
    },
  },

  // ─── 7교시: 비탈길과 계곡 바닥 핀 기둥 ───
  {
    id: 'lesson-007',
    order: 7,
    badge: '7교시 · 바닥 기둥',
    title: '비탈길 아래 계곡 바닥에서 기둥 올리기',
    subtitle: '계곡 맨 바닥에 숨어 있는 노란 고정 핀에서 기둥을 세워 받쳐봐요!',
    coachIntro:
      '왼쪽 땅은 높고 오른쪽 땅은 낮아요! 계곡 맨 바닥에 있는 노란 고정 핀을 찾아 위로 기둥과 양쪽 세모 날개를 올려 비탈길 배를 받쳐주세요.',
    coachOnFail:
      '비탈길 아래를 받쳐주는 기둥이 부족해서 무너졌어요! 맨 아래 바닥의 노란 고정 핀에서 주황색 점선 4개를 따라 기둥과 날개를 세워보세요!',
    coachWhenReady:
      '바닥 바위에서 올라온 든든한 기둥이 비탈길을 떠받치고 있어요! [트럭 출발!]을 눌러보세요!',
    coachOnSuccess:
      '최고예요! 계곡 바닥에 노란 고정 핀이 보이면 언제든 위로 기둥을 올려 다리를 훨씬 튼튼하게 받칠 수 있어요!',
    recommendedTool: 'build',
    encourageObserveFirst: false,
    initialMembers: [
      { id: 'l7-d1', startX: 5, startY: 7, endX: 10, endY: 8, locked: true },
      { id: 'l7-d2', startX: 10, startY: 8, endX: 15, endY: 9, locked: true },
    ],
    guideSegments: [
      { startX: 10, startY: 13, endX: 10, endY: 10, action: 'add', label: '바닥 기둥 올리기' },
      { startX: 10, startY: 10, endX: 10, endY: 8, action: 'add', label: '가운데 받치기' },
      { startX: 5, startY: 7, endX: 10, endY: 10, action: 'add', label: '왼쪽 날개' },
      { startX: 10, startY: 10, endX: 15, endY: 9, action: 'add', label: '오른쪽 날개' },
    ],
    level: {
      id: 'lesson-007',
      title: '7교시 · 비탈길과 바닥 기둥',
      description: '계곡 바닥 노란 고정 핀에서 기둥을 올려 비탈길을 받쳐주세요.',
      difficulty: 3,
      budget: 80000,
      unitCost: 500,
      maxMemberLength: 6,
      gridConfig: { width: 20, height: 13, cellSize: 40 },
      terrain: [
        { x: 0, y: 7 }, { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 },
        { x: 15, y: 9 }, { x: 16, y: 9 }, { x: 17, y: 9 }, { x: 18, y: 9 }, { x: 19, y: 9 }, { x: 20, y: 9 },
        { x: 6, y: 13 }, { x: 7, y: 13 }, { x: 8, y: 13 }, { x: 9, y: 13 }, { x: 10, y: 13 },
        { x: 11, y: 13 }, { x: 12, y: 13 }, { x: 13, y: 13 }, { x: 14, y: 13 },
      ],
      anchors: [
        { id: 'l7-a-left', x: 5, y: 7, type: 'fixed' },
        { id: 'l7-a-right', x: 15, y: 9, type: 'fixed' },
        { id: 'l7-a-bottom', x: 10, y: 13, type: 'fixed' },
      ],
      truckPath: [
        { x: 0, y: 6 }, { x: 5, y: 6 }, { x: 15, y: 8 }, { x: 20, y: 8 },
      ],
      unlockRequirements: [],
      contentVersion: 1,
    },
  },

  // ─── 8교시: 용돈(예산) 아껴 쓰기 졸업 시험 ───
  {
    id: 'lesson-008',
    order: 8,
    badge: '8교시 · 졸업 시험',
    title: '용돈 아껴 쓰는 알뜰 건축왕!',
    subtitle: '막대를 너무 많이 쓰면 남은 돈이 빨간색이 돼요! 군더더기 막대를 지워봐요.',
    coachIntro:
      '앗, 막대를 너무 많이 달아서 쓸 수 있는 돈(₩12,000)을 넘겼어요! [지우개]로 맨 아래에 빨간 점선이 쳐진 군더더기 막대들을 지워 남은 돈을 0원 이상으로 만들어보세요!',
    coachOnFail:
      '무언가 부족했나요? 상단의 [처음 상태로] 버튼을 누르고, 빨간 점선으로 표시된 맨 아래 불필요한 막대들만 톡톡 지워보세요!',
    coachWhenReady:
      '야호! 돈을 알뜰하게 아껴서 초록불이 켜졌어요! 이제 [트럭 출발!]로 졸업 시험을 통과해볼까요?',
    coachOnSuccess:
      '축하합니다! 다리 교실 8교시를 모두 마쳤어요! 이제 [단계별 도전]에서 나만의 멋진 다리를 척척 만들어 보세요!',
    recommendedTool: 'delete',
    encourageObserveFirst: false,
    initialMembers: [
      // 꼭 필요한 핵심 다리 (비용 약 ₩9,472)
      { id: 'l8-d1', startX: 5, startY: 8, endX: 9, endY: 8, locked: true },
      { id: 'l8-d2', startX: 9, startY: 8, endX: 13, endY: 8, locked: true },
      { id: 'l8-u1', startX: 5, startY: 8, endX: 9, endY: 10, locked: true },
      { id: 'l8-u2', startX: 9, startY: 8, endX: 9, endY: 10, locked: true },
      { id: 'l8-u3', startX: 13, startY: 8, endX: 9, endY: 10, locked: true },
      // 지워야 할 불필요한 군더더기 막대 4개 (+₩6,039 -> 총 ₩15,511 예산 초과!)
      { id: 'l8-extra-1', startX: 9, startY: 10, endX: 7, endY: 11, locked: false },
      { id: 'l8-extra-2', startX: 9, startY: 10, endX: 11, endY: 11, locked: false },
      { id: 'l8-extra-3', startX: 7, startY: 11, endX: 11, endY: 11, locked: false },
      { id: 'l8-extra-4', startX: 5, startY: 8, endX: 7, endY: 11, locked: false },
    ],
    guideSegments: [
      { startX: 9, startY: 10, endX: 7, endY: 11, action: 'erase', label: '군더더기 지우기' },
      { startX: 9, startY: 10, endX: 11, endY: 11, action: 'erase', label: '군더더기 지우기' },
      { startX: 7, startY: 11, endX: 11, endY: 11, action: 'erase', label: '군더더기 지우기' },
      { startX: 5, startY: 8, endX: 7, endY: 11, action: 'erase', label: '군더더기 지우기' },
    ],
    level: {
      id: 'lesson-008',
      title: '8교시 · 알뜰 건축왕 졸업 시험',
      description: '불필요한 막대를 지워 예산(₩12,000) 안으로 맞추고 통과하세요.',
      difficulty: 2,
      budget: 12000,
      unitCost: 500,
      maxMemberLength: 6,
      gridConfig: { width: 18, height: 12, cellSize: 40 },
      terrain: [
        { x: 0, y: 8 }, { x: 1, y: 8 }, { x: 2, y: 8 }, { x: 3, y: 8 }, { x: 4, y: 8 }, { x: 5, y: 8 },
        { x: 13, y: 8 }, { x: 14, y: 8 }, { x: 15, y: 8 }, { x: 16, y: 8 }, { x: 17, y: 8 }, { x: 18, y: 8 },
        { x: 6, y: 12 }, { x: 7, y: 12 }, { x: 8, y: 12 }, { x: 9, y: 12 }, { x: 10, y: 12 }, { x: 11, y: 12 }, { x: 12, y: 12 },
      ],
      anchors: [
        { id: 'l8-a-left', x: 5, y: 8, type: 'fixed' },
        { id: 'l8-a-right', x: 13, y: 8, type: 'fixed' },
      ],
      truckPath: [
        { x: 0, y: 7 }, { x: 5, y: 7 }, { x: 13, y: 7 }, { x: 18, y: 7 },
      ],
      unlockRequirements: [],
      contentVersion: 1,
    },
  },
];

export function getLessonById(id: string): LessonDefinition | undefined {
  return LESSONS.find((lesson) => lesson.id === id);
}

/** 실패 원인 카테고리에 맞는 추천 복습 교시 ID 반환 */
export function getRecommendedLessonIdForFailure(
  messageKey: string | undefined,
): string {
  switch (messageKey) {
    case 'failure.road_blocked':
      return 'lesson-003';
    case 'failure.vehicle_fall':
      return 'lesson-001';
    case 'failure.excessive_displacement':
      return 'lesson-004';
    case 'failure.member_deformation':
      return 'lesson-005';
    default:
      return 'lesson-004';
  }
}
