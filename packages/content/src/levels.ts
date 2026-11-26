/**
 * 레벨 정의 데이터 (PRD 6.6, 8.6)
 *
 * 콘텐츠는 코드 수정 없이 데이터로 추가할 수 있게 설계합니다. (P-05)
 * 기존 클리어 기록·별점·저장 도면 호환성을 위해 기존 12개 스테이지의 고유 ID(level-001~012)는 유지하며,
 * 사이사이에 추가된 10개 징검다리 스테이지는 level-013~022 고유 ID를 부여해 배열 순서(1~22단계)로 배치합니다.
 *
 * 캠페인 구성 (총 22단계 · 4개 챕터):
 * - 1장 입문 계곡 (1~5단계): 첫 세모 다리, 2연속 세모 개울, 얕은 디딤돌 기둥 입문, 넓은 평지 계곡, 완만한 1칸 내리막
 * - 2장 강물과 언덕 (6~11단계): 깊은 내리막 교각, 대칭 바위섬, 비대칭 여울 바위섬, 오르막 언덕, 바위섬 오르막 강, 5칸 막대 제한 입문
 * - 3장 절벽과 통나무 (12~17단계): 4칸 짧은 통나무 입문, 4칸 통나무 바위섬 응용, 작은 절벽 아치 입문, 본격 절벽 아치 협곡, 쌍둥이 교각 대교, 계단 폭포 철교
 * - 4장 마스터 협곡 (18~22단계): 알뜰 예산 시험, 가파른 산악 철교, 구름 위 심연 외팔보, 안개 낀 고산 협곡(18칸 리허설), 최종 라인바운드 대교(20칸)
 */

export interface LevelDefinition {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  budget: number;
  unitCost: number;
  maxMemberLength?: number;
  gridConfig: {
    width: number;
    height: number;
    cellSize: number;
  };
  terrain: Array<{ x: number; y: number }>;
  anchors: Array<{
    id: string;
    x: number;
    y: number;
    type: 'fixed' | 'roller';
  }>;
  truckPath: Array<{ x: number; y: number }>;
  unlockRequirements: Array<{
    type: 'level_complete';
    levelId: string;
  }>;
  contentVersion: number;
}

/**
 * 스테이지 캠페인 레벨 데이터 (1~22단계)
 */
export const LEVELS: LevelDefinition[] = [
  // ─── 1장: 입문 계곡 (1~5단계) ───
  {
    // 1단계
    id: 'level-001',
    title: '첫 번째 다리',
    description: '작은 계곡에 다리를 놓아 트럭이 건너갈 수 있게 하세요.',
    difficulty: 1,
    budget: 40000,
    unitCost: 500,
    maxMemberLength: 6,
    gridConfig: {
      width: 20,
      height: 12,
      cellSize: 40,
    },
    terrain: [
      // 좌측 지면 (y=9 레벨)
      { x: 0, y: 9 }, { x: 1, y: 9 }, { x: 2, y: 9 }, { x: 3, y: 9 },
      { x: 4, y: 9 }, { x: 5, y: 9 },
      // 우측 지면 (y=9 레벨)
      { x: 14, y: 9 }, { x: 15, y: 9 }, { x: 16, y: 9 }, { x: 17, y: 9 },
      { x: 18, y: 9 }, { x: 19, y: 9 }, { x: 20, y: 9 },
      // 계곡 바닥 (y=12 레벨)
      { x: 6, y: 12 }, { x: 7, y: 12 }, { x: 8, y: 12 }, { x: 9, y: 12 },
      { x: 10, y: 12 }, { x: 11, y: 12 }, { x: 12, y: 12 }, { x: 13, y: 12 },
    ],
    anchors: [
      { id: 'anchor-left', x: 5, y: 9, type: 'fixed' },
      { id: 'anchor-right', x: 14, y: 9, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 8 }, { x: 5, y: 8 }, { x: 14, y: 8 }, { x: 20, y: 8 },
    ],
    unlockRequirements: [],
    contentVersion: 1,
  },
  {
    // 2단계 (신규 징검다리 1: 9칸 → 11칸 연속 세모 연습)
    id: 'level-013',
    title: '잔잔한 개울가',
    description:
      '첫 번째 다리보다 조금 더 넓은 개울이에요. 길 아래에 뒤집어진 세모 받침대 두 개를 나란히 달고 아랫줄도 서로 이어보세요.',
    difficulty: 1,
    budget: 45000,
    unitCost: 500,
    maxMemberLength: 6,
    gridConfig: {
      width: 22,
      height: 13,
      cellSize: 40,
    },
    terrain: [
      // 좌측 지면 (y=9)
      { x: 0, y: 9 }, { x: 1, y: 9 }, { x: 2, y: 9 }, { x: 3, y: 9 },
      { x: 4, y: 9 }, { x: 5, y: 9 },
      // 우측 지면 (y=9)
      { x: 16, y: 9 }, { x: 17, y: 9 }, { x: 18, y: 9 }, { x: 19, y: 9 },
      { x: 20, y: 9 }, { x: 21, y: 9 }, { x: 22, y: 9 },
      // 개울 바닥 (y=13)
      { x: 6, y: 13 }, { x: 7, y: 13 }, { x: 8, y: 13 }, { x: 9, y: 13 },
      { x: 10, y: 13 }, { x: 11, y: 13 }, { x: 12, y: 13 }, { x: 13, y: 13 },
      { x: 14, y: 13 }, { x: 15, y: 13 },
    ],
    anchors: [
      { id: 'anchor-left', x: 5, y: 9, type: 'fixed' },
      { id: 'anchor-right', x: 16, y: 9, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 8 }, { x: 5, y: 8 }, { x: 16, y: 8 }, { x: 22, y: 8 },
    ],
    unlockRequirements: [
      { type: 'level_complete', levelId: 'level-001' },
    ],
    contentVersion: 1,
  },
  {
    // 3단계 (신규 징검다리 2: 평지 얕은 디딤돌 기둥 첫 입문)
    id: 'level-014',
    title: '여울목 디딤돌',
    description:
      '얕은 개울 한가운데 디딤돌 고정 핀이 놓여 있어요! 디딤돌에서 위로 짧은 기둥을 세우면 긴 다리도 흔들리지 않게 받칠 수 있어요.',
    difficulty: 1,
    budget: 44000,
    unitCost: 500,
    maxMemberLength: 6,
    gridConfig: {
      width: 20,
      height: 13,
      cellSize: 40,
    },
    terrain: [
      // 좌측 지면 (y=9)
      { x: 0, y: 9 }, { x: 1, y: 9 }, { x: 2, y: 9 }, { x: 3, y: 9 }, { x: 4, y: 9 },
      // 중앙 여울 디딤돌 (y=12)
      { x: 9, y: 12 }, { x: 10, y: 12 }, { x: 11, y: 12 },
      // 우측 지면 (y=9)
      { x: 16, y: 9 }, { x: 17, y: 9 }, { x: 18, y: 9 }, { x: 19, y: 9 }, { x: 20, y: 9 },
      // 여울 바닥 (y=13)
      { x: 5, y: 13 }, { x: 6, y: 13 }, { x: 7, y: 13 }, { x: 8, y: 13 },
      { x: 12, y: 13 }, { x: 13, y: 13 }, { x: 14, y: 13 }, { x: 15, y: 13 },
    ],
    anchors: [
      { id: 'anchor-left', x: 4, y: 9, type: 'fixed' },
      { id: 'anchor-right', x: 16, y: 9, type: 'fixed' },
      { id: 'anchor-stepping-stone', x: 10, y: 12, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 8 }, { x: 4, y: 8 }, { x: 16, y: 8 }, { x: 20, y: 8 },
    ],
    unlockRequirements: [
      { type: 'level_complete', levelId: 'level-013' },
    ],
    contentVersion: 1,
  },
  {
    // 4단계
    id: 'level-002',
    title: '넓은 계곡',
    description: '더 넓은 계곡을 건너세요. 삼각형 구조가 도움이 될 수 있습니다.',
    difficulty: 2,
    budget: 70000,
    unitCost: 500,
    maxMemberLength: 6,
    gridConfig: {
      width: 24,
      height: 14,
      cellSize: 40,
    },
    terrain: [
      // 좌측 지면
      { x: 0, y: 10 }, { x: 1, y: 10 }, { x: 2, y: 10 }, { x: 3, y: 10 },
      { x: 4, y: 10 },
      // 우측 지면
      { x: 18, y: 10 }, { x: 19, y: 10 }, { x: 20, y: 10 }, { x: 21, y: 10 },
      { x: 22, y: 10 }, { x: 23, y: 10 }, { x: 24, y: 10 },
      // 계곡 바닥
      { x: 5, y: 14 }, { x: 6, y: 14 }, { x: 7, y: 14 }, { x: 8, y: 14 },
      { x: 9, y: 14 }, { x: 10, y: 14 }, { x: 11, y: 14 }, { x: 12, y: 14 },
      { x: 13, y: 14 }, { x: 14, y: 14 }, { x: 15, y: 14 }, { x: 16, y: 14 },
      { x: 17, y: 14 },
    ],
    anchors: [
      { id: 'anchor-left', x: 4, y: 10, type: 'fixed' },
      { id: 'anchor-right', x: 18, y: 10, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 9 }, { x: 4, y: 9 }, { x: 18, y: 9 }, { x: 24, y: 9 },
    ],
    unlockRequirements: [
      { type: 'level_complete', levelId: 'level-014' },
    ],
    contentVersion: 1,
  },
  {
    // 5단계 (신규 징검다리 3: 1칸 높이차 완만한 내리막 입문)
    id: 'level-015',
    title: '산들바람 내리막길',
    description:
      '오른쪽 들판이 한 칸 더 낮아요! 급하게 꺾이지 않도록 부드럽게 내려가는 길을 잇고 아래쪽을 세모 받침대로 단단히 묶어보세요.',
    difficulty: 2,
    budget: 38000,
    unitCost: 500,
    maxMemberLength: 6,
    gridConfig: {
      width: 20,
      height: 13,
      cellSize: 40,
    },
    terrain: [
      // 좌측 언덕 (y=8)
      { x: 0, y: 8 }, { x: 1, y: 8 }, { x: 2, y: 8 }, { x: 3, y: 8 },
      { x: 4, y: 8 }, { x: 5, y: 8 },
      // 우측 들판 (y=9)
      { x: 15, y: 9 }, { x: 16, y: 9 }, { x: 17, y: 9 }, { x: 18, y: 9 },
      { x: 19, y: 9 }, { x: 20, y: 9 },
      // 계곡 바닥 (y=13)
      { x: 6, y: 13 }, { x: 7, y: 13 }, { x: 8, y: 13 }, { x: 9, y: 13 },
      { x: 10, y: 13 }, { x: 11, y: 13 }, { x: 12, y: 13 }, { x: 13, y: 13 },
      { x: 14, y: 13 },
    ],
    anchors: [
      { id: 'anchor-left', x: 5, y: 8, type: 'fixed' },
      { id: 'anchor-right', x: 15, y: 9, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 7 }, { x: 5, y: 7 }, { x: 15, y: 8 }, { x: 20, y: 8 },
    ],
    unlockRequirements: [
      { type: 'level_complete', levelId: 'level-002' },
    ],
    contentVersion: 1,
  },

  // ─── 2장: 강물과 언덕 (6~11단계) ───
  {
    // 6단계
    id: 'level-003',
    title: '높이 차이',
    description: '높이가 다른 두 지점을 연결하세요.',
    difficulty: 2,
    budget: 100000,
    unitCost: 500,
    maxMemberLength: 6,
    gridConfig: {
      width: 22,
      height: 14,
      cellSize: 40,
    },
    terrain: [
      // 좌측 높은 지면 (y=7)
      { x: 0, y: 7 }, { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 },
      { x: 4, y: 7 }, { x: 5, y: 7 },
      // 우측 낮은 지면 (y=10)
      { x: 16, y: 10 }, { x: 17, y: 10 }, { x: 18, y: 10 }, { x: 19, y: 10 },
      { x: 20, y: 10 }, { x: 21, y: 10 }, { x: 22, y: 10 },
      // 계곡 바닥
      { x: 6, y: 14 }, { x: 7, y: 14 }, { x: 8, y: 14 }, { x: 9, y: 14 },
      { x: 10, y: 14 }, { x: 11, y: 14 }, { x: 12, y: 14 }, { x: 13, y: 14 },
      { x: 14, y: 14 }, { x: 15, y: 14 },
    ],
    anchors: [
      { id: 'anchor-left', x: 5, y: 7, type: 'fixed' },
      { id: 'anchor-right', x: 16, y: 10, type: 'fixed' },
      // 중간 지지대 힌트
      { id: 'anchor-mid-bottom', x: 10, y: 14, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 6 }, { x: 5, y: 6 }, { x: 16, y: 9 }, { x: 22, y: 9 },
    ],
    unlockRequirements: [
      { type: 'level_complete', levelId: 'level-015' },
    ],
    contentVersion: 1,
  },
  {
    // 7단계
    id: 'level-004',
    title: '징검다리 바위섬',
    description:
      '넓은 강 한가운데 낮은 바위섬이 솟아 있어요. 바위섬 고정 핀을 교각 삼아 양쪽 다리를 든든하게 받쳐보세요.',
    difficulty: 2,
    budget: 45000,
    unitCost: 500,
    maxMemberLength: 6,
    gridConfig: {
      width: 24,
      height: 14,
      cellSize: 40,
    },
    terrain: [
      // 좌측 강둑 (y=9)
      { x: 0, y: 9 }, { x: 1, y: 9 }, { x: 2, y: 9 }, { x: 3, y: 9 }, { x: 4, y: 9 },
      // 중앙 바위섬 (y=11)
      { x: 11, y: 11 }, { x: 12, y: 11 }, { x: 13, y: 11 },
      // 우측 강둑 (y=9)
      { x: 20, y: 9 }, { x: 21, y: 9 }, { x: 22, y: 9 }, { x: 23, y: 9 }, { x: 24, y: 9 },
      // 강 바닥 (y=14)
      { x: 5, y: 14 }, { x: 6, y: 14 }, { x: 7, y: 14 }, { x: 8, y: 14 },
      { x: 9, y: 14 }, { x: 10, y: 14 },
      { x: 14, y: 14 }, { x: 15, y: 14 }, { x: 16, y: 14 }, { x: 17, y: 14 },
      { x: 18, y: 14 }, { x: 19, y: 14 },
    ],
    anchors: [
      { id: 'anchor-left', x: 4, y: 9, type: 'fixed' },
      { id: 'anchor-right', x: 20, y: 9, type: 'fixed' },
      { id: 'anchor-island', x: 12, y: 11, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 8 }, { x: 4, y: 8 }, { x: 20, y: 8 }, { x: 24, y: 8 },
    ],
    unlockRequirements: [
      { type: 'level_complete', levelId: 'level-003' },
    ],
    contentVersion: 1,
  },
  {
    // 8단계 (신규 징검다리 4: 한쪽으로 치우친 비대칭 바위섬)
    id: 'level-016',
    title: '외딴 여울 바위섬',
    description:
      '이번 강에는 바위섬이 왼쪽에 치우쳐 있어요! 짧은 왼쪽 구간은 가볍게 잇고, 더 넓은 오른쪽 물길은 연속 세모 받침대로 든든히 버텨보세요.',
    difficulty: 2,
    budget: 44000,
    unitCost: 500,
    maxMemberLength: 6,
    gridConfig: {
      width: 24,
      height: 14,
      cellSize: 40,
    },
    terrain: [
      // 좌측 강둑 (y=9)
      { x: 0, y: 9 }, { x: 1, y: 9 }, { x: 2, y: 9 }, { x: 3, y: 9 }, { x: 4, y: 9 },
      // 좌측 치우친 바위섬 (y=11)
      { x: 8, y: 11 }, { x: 9, y: 11 }, { x: 10, y: 11 },
      // 우측 강둑 (y=9)
      { x: 19, y: 9 }, { x: 20, y: 9 }, { x: 21, y: 9 }, { x: 22, y: 9 },
      { x: 23, y: 9 }, { x: 24, y: 9 },
      // 강 바닥 (y=14)
      { x: 5, y: 14 }, { x: 6, y: 14 }, { x: 7, y: 14 },
      { x: 11, y: 14 }, { x: 12, y: 14 }, { x: 13, y: 14 }, { x: 14, y: 14 },
      { x: 15, y: 14 }, { x: 16, y: 14 }, { x: 17, y: 14 }, { x: 18, y: 14 },
    ],
    anchors: [
      { id: 'anchor-left', x: 4, y: 9, type: 'fixed' },
      { id: 'anchor-right', x: 19, y: 9, type: 'fixed' },
      { id: 'anchor-offset-island', x: 9, y: 11, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 8 }, { x: 4, y: 8 }, { x: 19, y: 8 }, { x: 24, y: 8 },
    ],
    unlockRequirements: [
      { type: 'level_complete', levelId: 'level-004' },
    ],
    contentVersion: 1,
  },
  {
    // 9단계
    id: 'level-005',
    title: '오르막 언덕길',
    description:
      '오른쪽 땅이 더 높아요! 트럭이 힘차게 언덕을 올라갈 수 있도록 급하게 꺾이지 않는 완만한 오르막 다리를 지어보세요.',
    difficulty: 2,
    budget: 36000,
    unitCost: 500,
    maxMemberLength: 6,
    gridConfig: {
      width: 22,
      height: 14,
      cellSize: 40,
    },
    terrain: [
      // 좌측 낮은 평지 (y=10)
      { x: 0, y: 10 }, { x: 1, y: 10 }, { x: 2, y: 10 }, { x: 3, y: 10 },
      { x: 4, y: 10 }, { x: 5, y: 10 },
      // 우측 높은 언덕 (y=8)
      { x: 16, y: 8 }, { x: 17, y: 8 }, { x: 18, y: 8 }, { x: 19, y: 8 },
      { x: 20, y: 8 }, { x: 21, y: 8 }, { x: 22, y: 8 },
      // 계곡 바닥 (y=14)
      { x: 6, y: 14 }, { x: 7, y: 14 }, { x: 8, y: 14 }, { x: 9, y: 14 },
      { x: 10, y: 14 }, { x: 11, y: 14 }, { x: 12, y: 14 }, { x: 13, y: 14 },
      { x: 14, y: 14 }, { x: 15, y: 14 },
    ],
    anchors: [
      { id: 'anchor-left', x: 5, y: 10, type: 'fixed' },
      { id: 'anchor-right', x: 16, y: 8, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 9 }, { x: 5, y: 9 }, { x: 16, y: 7 }, { x: 22, y: 7 },
    ],
    unlockRequirements: [
      { type: 'level_complete', levelId: 'level-016' },
    ],
    contentVersion: 1,
  },
  {
    // 10단계 (신규 징검다리 5: 3칸 큰 오르막 + 중앙 바위섬 결합)
    id: 'level-017',
    title: '바위섬 오르막 강',
    description:
      '오른쪽 언덕이 3칸이나 높게 솟아 있어요! 강 한가운데 바위섬 고정 핀을 디딤돌 삼아 높은 언덕까지 완만한 오르막 다리를 놓아보세요.',
    difficulty: 3,
    budget: 46000,
    unitCost: 500,
    maxMemberLength: 6,
    gridConfig: {
      width: 23,
      height: 14,
      cellSize: 40,
    },
    terrain: [
      // 좌측 낮은 강가 (y=10)
      { x: 0, y: 10 }, { x: 1, y: 10 }, { x: 2, y: 10 }, { x: 3, y: 10 }, { x: 4, y: 10 },
      // 중앙 수중 바위섬 (y=11)
      { x: 10, y: 11 }, { x: 11, y: 11 }, { x: 12, y: 11 },
      // 우측 높은 언덕 (y=7)
      { x: 18, y: 7 }, { x: 19, y: 7 }, { x: 20, y: 7 }, { x: 21, y: 7 },
      { x: 22, y: 7 }, { x: 23, y: 7 },
      // 강 바닥 (y=14)
      { x: 5, y: 14 }, { x: 6, y: 14 }, { x: 7, y: 14 }, { x: 8, y: 14 }, { x: 9, y: 14 },
      { x: 13, y: 14 }, { x: 14, y: 14 }, { x: 15, y: 14 }, { x: 16, y: 14 }, { x: 17, y: 14 },
    ],
    anchors: [
      { id: 'anchor-left', x: 4, y: 10, type: 'fixed' },
      { id: 'anchor-right', x: 18, y: 7, type: 'fixed' },
      { id: 'anchor-mid-island', x: 11, y: 11, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 9 }, { x: 4, y: 9 }, { x: 18, y: 6 }, { x: 23, y: 6 },
    ],
    unlockRequirements: [
      { type: 'level_complete', levelId: 'level-005' },
    ],
    contentVersion: 1,
  },
  {
    // 11단계 (신규 징검다리 6: 막대 최대 5칸 제한 첫 입문)
    id: 'level-018',
    title: '강바람 중형 철교',
    description:
      '강바람이 불어 긴 막대는 휘청거려요! 이번 단계부터는 막대 하나를 최대 5칸까지만 이을 수 있으니 4칸 간격으로 알맞게 나누어 지어보세요.',
    difficulty: 3,
    budget: 38000,
    unitCost: 500,
    maxMemberLength: 5,
    gridConfig: {
      width: 22,
      height: 14,
      cellSize: 40,
    },
    terrain: [
      // 좌측 강둑 (y=9)
      { x: 0, y: 9 }, { x: 1, y: 9 }, { x: 2, y: 9 }, { x: 3, y: 9 },
      { x: 4, y: 9 }, { x: 5, y: 9 },
      // 우측 강둑 (y=9)
      { x: 17, y: 9 }, { x: 18, y: 9 }, { x: 19, y: 9 }, { x: 20, y: 9 },
      { x: 21, y: 9 }, { x: 22, y: 9 },
      // 강 바닥 (y=14)
      { x: 6, y: 14 }, { x: 7, y: 14 }, { x: 8, y: 14 }, { x: 9, y: 14 },
      { x: 10, y: 14 }, { x: 11, y: 14 }, { x: 12, y: 14 }, { x: 13, y: 14 },
      { x: 14, y: 14 }, { x: 15, y: 14 }, { x: 16, y: 14 },
    ],
    anchors: [
      { id: 'anchor-left', x: 5, y: 9, type: 'fixed' },
      { id: 'anchor-right', x: 17, y: 9, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 8 }, { x: 5, y: 8 }, { x: 17, y: 8 }, { x: 22, y: 8 },
    ],
    unlockRequirements: [
      { type: 'level_complete', levelId: 'level-017' },
    ],
    contentVersion: 1,
  },

  // ─── 3장: 절벽과 통나무 (12~17단계) ───
  {
    // 12단계
    id: 'level-006',
    title: '짧은 통나무 다리',
    description:
      '이 숲에서는 막대 하나를 최대 4칸까지만 이을 수 있어요! 짧은 막대들을 촘촘한 세모 그물처럼 엮어 계곡을 건너세요.',
    difficulty: 3,
    budget: 34000,
    unitCost: 500,
    maxMemberLength: 4,
    gridConfig: {
      width: 20,
      height: 13,
      cellSize: 40,
    },
    terrain: [
      // 좌측 지면 (y=9)
      { x: 0, y: 9 }, { x: 1, y: 9 }, { x: 2, y: 9 }, { x: 3, y: 9 },
      { x: 4, y: 9 }, { x: 5, y: 9 },
      // 우측 지면 (y=9)
      { x: 15, y: 9 }, { x: 16, y: 9 }, { x: 17, y: 9 }, { x: 18, y: 9 },
      { x: 19, y: 9 }, { x: 20, y: 9 },
      // 계곡 바닥 (y=13)
      { x: 6, y: 13 }, { x: 7, y: 13 }, { x: 8, y: 13 }, { x: 9, y: 13 },
      { x: 10, y: 13 }, { x: 11, y: 13 }, { x: 12, y: 13 }, { x: 13, y: 13 },
      { x: 14, y: 13 },
    ],
    anchors: [
      { id: 'anchor-left', x: 5, y: 9, type: 'fixed' },
      { id: 'anchor-right', x: 15, y: 9, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 8 }, { x: 5, y: 8 }, { x: 15, y: 8 }, { x: 20, y: 8 },
    ],
    unlockRequirements: [
      { type: 'level_complete', levelId: 'level-018' },
    ],
    contentVersion: 1,
  },
  {
    // 13단계 (신규 징검다리 7: 4칸 통나무 제한 + 바위섬 + 완만한 언덕 응용)
    id: 'level-019',
    title: '통나무 징검섬 언덕',
    description:
      '4칸짜리 짧은 통나무만 쓸 수 있는 넓은 숲속 개울이에요! 가운데 바위섬 고정 핀을 딛고 오른쪽 언덕까지 촘촘한 세모 다리를 놓아보세요.',
    difficulty: 3,
    budget: 44000,
    unitCost: 500,
    maxMemberLength: 4,
    gridConfig: {
      width: 22,
      height: 14,
      cellSize: 40,
    },
    terrain: [
      // 좌측 숲길 (y=9)
      { x: 0, y: 9 }, { x: 1, y: 9 }, { x: 2, y: 9 }, { x: 3, y: 9 }, { x: 4, y: 9 },
      // 중앙 바위섬 (y=11)
      { x: 10, y: 11 }, { x: 11, y: 11 }, { x: 12, y: 11 },
      // 우측 숲 언덕 (y=8)
      { x: 18, y: 8 }, { x: 19, y: 8 }, { x: 20, y: 8 }, { x: 21, y: 8 }, { x: 22, y: 8 },
      // 개울 바닥 (y=14)
      { x: 5, y: 14 }, { x: 6, y: 14 }, { x: 7, y: 14 }, { x: 8, y: 14 }, { x: 9, y: 14 },
      { x: 13, y: 14 }, { x: 14, y: 14 }, { x: 15, y: 14 }, { x: 16, y: 14 }, { x: 17, y: 14 },
    ],
    anchors: [
      { id: 'anchor-left', x: 4, y: 9, type: 'fixed' },
      { id: 'anchor-right', x: 18, y: 8, type: 'fixed' },
      { id: 'anchor-forest-island', x: 11, y: 11, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 8 }, { x: 4, y: 8 }, { x: 18, y: 7 }, { x: 22, y: 7 },
    ],
    unlockRequirements: [
      { type: 'level_complete', levelId: 'level-006' },
    ],
    contentVersion: 1,
  },
  {
    // 14단계 (신규 징검다리 8: 아담한 10칸 협곡에서 절벽 아래 아치 첫 입문)
    id: 'level-020',
    title: '작은 절벽 아치',
    description:
      '협곡 바닥은 깊지만 양쪽 절벽 바로 아래 턱에 고정 핀이 있어요! 아담한 10칸 협곡에서 첫 무지개 아치 받침대를 연습해보세요.',
    difficulty: 3,
    budget: 36000,
    unitCost: 500,
    maxMemberLength: 6,
    gridConfig: {
      width: 22,
      height: 15,
      cellSize: 40,
    },
    terrain: [
      // 좌측 상단 절벽 (y=8) 및 아치 턱 (y=11)
      { x: 0, y: 8 }, { x: 1, y: 8 }, { x: 2, y: 8 }, { x: 3, y: 8 },
      { x: 4, y: 8 }, { x: 5, y: 8 }, { x: 6, y: 8 },
      { x: 6, y: 11 }, { x: 7, y: 11 },
      // 우측 아치 턱 (y=11) 및 상단 절벽 (y=8)
      { x: 15, y: 11 }, { x: 16, y: 11 },
      { x: 16, y: 8 }, { x: 17, y: 8 }, { x: 18, y: 8 }, { x: 19, y: 8 },
      { x: 20, y: 8 }, { x: 21, y: 8 }, { x: 22, y: 8 },
      // 깊은 협곡 바닥 (y=15)
      { x: 8, y: 15 }, { x: 9, y: 15 }, { x: 10, y: 15 }, { x: 11, y: 15 },
      { x: 12, y: 15 }, { x: 13, y: 15 }, { x: 14, y: 15 },
    ],
    anchors: [
      { id: 'anchor-left', x: 6, y: 8, type: 'fixed' },
      { id: 'anchor-right', x: 16, y: 8, type: 'fixed' },
      { id: 'anchor-ledge-left', x: 7, y: 11, type: 'fixed' },
      { id: 'anchor-ledge-right', x: 15, y: 11, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 7 }, { x: 6, y: 7 }, { x: 16, y: 7 }, { x: 22, y: 7 },
    ],
    unlockRequirements: [
      { type: 'level_complete', levelId: 'level-019' },
    ],
    contentVersion: 1,
  },
  {
    // 15단계
    id: 'level-007',
    title: '절벽 아치 협곡',
    description:
      '바닥이 아득히 깊어 기둥을 내릴 수 없어요. 양쪽 절벽 아래 턱에 박힌 고정 핀에서 무지개 아치처럼 버팀대를 뻗어 올리세요.',
    difficulty: 3,
    budget: 46000,
    unitCost: 500,
    maxMemberLength: 6,
    gridConfig: {
      width: 24,
      height: 15,
      cellSize: 40,
    },
    terrain: [
      // 좌측 상단 절벽 (y=8) 및 하단 아치 턱 (y=11)
      { x: 0, y: 8 }, { x: 1, y: 8 }, { x: 2, y: 8 }, { x: 3, y: 8 },
      { x: 4, y: 8 }, { x: 5, y: 8 },
      { x: 5, y: 11 }, { x: 6, y: 11 },
      // 우측 하단 아치 턱 (y=11) 및 상단 절벽 (y=8)
      { x: 18, y: 11 }, { x: 19, y: 11 },
      { x: 19, y: 8 }, { x: 20, y: 8 }, { x: 21, y: 8 }, { x: 22, y: 8 },
      { x: 23, y: 8 }, { x: 24, y: 8 },
      // 깊은 협곡 바닥 (y=15)
      { x: 7, y: 15 }, { x: 8, y: 15 }, { x: 9, y: 15 }, { x: 10, y: 15 },
      { x: 11, y: 15 }, { x: 12, y: 15 }, { x: 13, y: 15 }, { x: 14, y: 15 },
      { x: 15, y: 15 }, { x: 16, y: 15 }, { x: 17, y: 15 },
    ],
    anchors: [
      { id: 'anchor-left', x: 5, y: 8, type: 'fixed' },
      { id: 'anchor-right', x: 19, y: 8, type: 'fixed' },
      { id: 'anchor-cliff-left', x: 6, y: 11, type: 'fixed' },
      { id: 'anchor-cliff-right', x: 18, y: 11, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 7 }, { x: 5, y: 7 }, { x: 19, y: 7 }, { x: 24, y: 7 },
    ],
    unlockRequirements: [
      { type: 'level_complete', levelId: 'level-020' },
    ],
    contentVersion: 1,
  },
  {
    // 16단계
    id: 'level-008',
    title: '쌍둥이 교각 대교',
    description:
      '시원하게 펼쳐진 큰 강 위에 두 개의 바위 교각이 서 있어요. 두 교각을 든든한 기둥 삼아 긴 3경간 대교를 완성하세요.',
    difficulty: 3,
    budget: 52000,
    unitCost: 500,
    maxMemberLength: 6,
    gridConfig: {
      width: 26,
      height: 15,
      cellSize: 40,
    },
    terrain: [
      // 좌측 강둑 (y=9)
      { x: 0, y: 9 }, { x: 1, y: 9 }, { x: 2, y: 9 }, { x: 3, y: 9 }, { x: 4, y: 9 },
      // 1번 수중 교각 (y=12)
      { x: 9, y: 12 }, { x: 10, y: 12 }, { x: 11, y: 12 },
      // 2번 수중 교각 (y=12)
      { x: 15, y: 12 }, { x: 16, y: 12 }, { x: 17, y: 12 },
      // 우측 강둑 (y=9)
      { x: 22, y: 9 }, { x: 23, y: 9 }, { x: 24, y: 9 }, { x: 25, y: 9 }, { x: 26, y: 9 },
      // 강 바닥 (y=15)
      { x: 5, y: 15 }, { x: 6, y: 15 }, { x: 7, y: 15 }, { x: 8, y: 15 },
      { x: 12, y: 15 }, { x: 13, y: 15 }, { x: 14, y: 15 },
      { x: 18, y: 15 }, { x: 19, y: 15 }, { x: 20, y: 15 }, { x: 21, y: 15 },
    ],
    anchors: [
      { id: 'anchor-left', x: 4, y: 9, type: 'fixed' },
      { id: 'anchor-right', x: 22, y: 9, type: 'fixed' },
      { id: 'anchor-pier-1', x: 10, y: 12, type: 'fixed' },
      { id: 'anchor-pier-2', x: 16, y: 12, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 8 }, { x: 4, y: 8 }, { x: 22, y: 8 }, { x: 26, y: 8 },
    ],
    unlockRequirements: [
      { type: 'level_complete', levelId: 'level-007' },
    ],
    contentVersion: 1,
  },
  {
    // 17단계 (신규 징검다리 9: 높이가 다른 계단식 폭포 단차 교각 + 5칸 제한)
    id: 'level-021',
    title: '계단 폭포 철교',
    description:
      '폭포 위 절벽에서 아래쪽 강기슭으로 내려가는 물길이에요. 높이가 서로 다른 두 바위 교각을 5칸 이하 막대로 이어 단단한 폭포 철교를 세우세요.',
    difficulty: 4,
    budget: 50000,
    unitCost: 500,
    maxMemberLength: 5,
    gridConfig: {
      width: 25,
      height: 15,
      cellSize: 40,
    },
    terrain: [
      // 좌측 폭포 위 절벽 (y=7)
      { x: 0, y: 7 }, { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 },
      // 1단 상류 바위 교각 (y=10)
      { x: 8, y: 10 }, { x: 9, y: 10 }, { x: 10, y: 10 },
      // 2단 하류 바위 교각 (y=12)
      { x: 14, y: 12 }, { x: 15, y: 12 }, { x: 16, y: 12 },
      // 우측 강기슭 (y=9)
      { x: 20, y: 9 }, { x: 21, y: 9 }, { x: 22, y: 9 }, { x: 23, y: 9 },
      { x: 24, y: 9 }, { x: 25, y: 9 },
      // 폭포 바닥 (y=15)
      { x: 5, y: 15 }, { x: 6, y: 15 }, { x: 7, y: 15 },
      { x: 11, y: 15 }, { x: 12, y: 15 }, { x: 13, y: 15 },
      { x: 17, y: 15 }, { x: 18, y: 15 }, { x: 19, y: 15 },
    ],
    anchors: [
      { id: 'anchor-left', x: 4, y: 7, type: 'fixed' },
      { id: 'anchor-right', x: 20, y: 9, type: 'fixed' },
      { id: 'anchor-step-pier-1', x: 9, y: 10, type: 'fixed' },
      { id: 'anchor-step-pier-2', x: 15, y: 12, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 6 }, { x: 4, y: 6 }, { x: 20, y: 8 }, { x: 25, y: 8 },
    ],
    unlockRequirements: [
      { type: 'level_complete', levelId: 'level-008' },
    ],
    contentVersion: 1,
  },

  // ─── 4장: 마스터 협곡 (18~22단계) ───
  {
    // 18단계
    id: 'level-009',
    title: '알뜰살뜰 예산 시험',
    description:
      '이번 다리는 쓸 수 있는 돈이 아주 빠듯해요! 군더더기 막대 없이 꼭 필요한 삼각형만으로 가장 알뜰한 다리를 설계해보세요.',
    difficulty: 4,
    budget: 23000,
    unitCost: 500,
    maxMemberLength: 6,
    gridConfig: {
      width: 20,
      height: 14,
      cellSize: 40,
    },
    terrain: [
      // 좌측 지면 (y=9)
      { x: 0, y: 9 }, { x: 1, y: 9 }, { x: 2, y: 9 }, { x: 3, y: 9 }, { x: 4, y: 9 },
      // 우측 지면 (y=9)
      { x: 16, y: 9 }, { x: 17, y: 9 }, { x: 18, y: 9 }, { x: 19, y: 9 }, { x: 20, y: 9 },
      // 계곡 바닥 (y=14)
      { x: 5, y: 14 }, { x: 6, y: 14 }, { x: 7, y: 14 }, { x: 8, y: 14 },
      { x: 9, y: 14 }, { x: 10, y: 14 }, { x: 11, y: 14 }, { x: 12, y: 14 },
      { x: 13, y: 14 }, { x: 14, y: 14 }, { x: 15, y: 14 },
    ],
    anchors: [
      { id: 'anchor-left', x: 4, y: 9, type: 'fixed' },
      { id: 'anchor-right', x: 16, y: 9, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 8 }, { x: 4, y: 8 }, { x: 16, y: 8 }, { x: 20, y: 8 },
    ],
    unlockRequirements: [
      { type: 'level_complete', levelId: 'level-021' },
    ],
    contentVersion: 1,
  },
  {
    // 19단계
    id: 'level-010',
    title: '가파른 산악 철교',
    description:
      '높은 산봉우리에서 아랫마을 기슭까지 크게 내려가는 산악 협곡이에요. 막대 5칸 제한을 지키며 절벽 턱과 바위봉우리를 이어보세요.',
    difficulty: 4,
    budget: 46000,
    unitCost: 500,
    maxMemberLength: 5,
    gridConfig: {
      width: 24,
      height: 16,
      cellSize: 40,
    },
    terrain: [
      // 좌측 높은 산봉우리 (y=6) 및 암벽 턱 (y=9)
      { x: 0, y: 6 }, { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 },
      { x: 4, y: 6 }, { x: 5, y: 6 },
      { x: 5, y: 9 }, { x: 6, y: 9 },
      // 중앙 바위봉우리 (y=13)
      { x: 12, y: 13 }, { x: 13, y: 13 }, { x: 14, y: 13 },
      // 우측 산기슭 (y=10)
      { x: 19, y: 10 }, { x: 20, y: 10 }, { x: 21, y: 10 }, { x: 22, y: 10 },
      { x: 23, y: 10 }, { x: 24, y: 10 },
      // 산악 협곡 바닥 (y=16)
      { x: 7, y: 16 }, { x: 8, y: 16 }, { x: 9, y: 16 }, { x: 10, y: 16 },
      { x: 11, y: 16 },
      { x: 15, y: 16 }, { x: 16, y: 16 }, { x: 17, y: 16 }, { x: 18, y: 16 },
    ],
    anchors: [
      { id: 'anchor-left', x: 5, y: 6, type: 'fixed' },
      { id: 'anchor-right', x: 19, y: 10, type: 'fixed' },
      { id: 'anchor-cliff-left', x: 6, y: 9, type: 'fixed' },
      { id: 'anchor-mid-peak', x: 13, y: 13, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 5 }, { x: 5, y: 5 }, { x: 19, y: 9 }, { x: 24, y: 9 },
    ],
    unlockRequirements: [
      { type: 'level_complete', levelId: 'level-009' },
    ],
    contentVersion: 1,
  },
  {
    // 20단계
    id: 'level-011',
    title: '구름 위 심연 협곡',
    description:
      '협곡 한가운데에는 기둥을 세울 곳이 전혀 없어요! 양쪽 절벽 위아래 고정 핀에서 팔을 뻗어 허공에서 만나는 외팔보 대교에 도전하세요.',
    difficulty: 5,
    budget: 50000,
    unitCost: 500,
    maxMemberLength: 6,
    gridConfig: {
      width: 26,
      height: 16,
      cellSize: 40,
    },
    terrain: [
      // 좌측 상단 절벽 (y=8) 및 암벽 받침턱 (y=11)
      { x: 0, y: 8 }, { x: 1, y: 8 }, { x: 2, y: 8 }, { x: 3, y: 8 },
      { x: 4, y: 8 }, { x: 5, y: 8 },
      { x: 5, y: 11 }, { x: 6, y: 11 },
      // 우측 암벽 받침턱 (y=11) 및 상단 절벽 (y=8)
      { x: 20, y: 11 }, { x: 21, y: 11 },
      { x: 21, y: 8 }, { x: 22, y: 8 }, { x: 23, y: 8 }, { x: 24, y: 8 },
      { x: 25, y: 8 }, { x: 26, y: 8 },
      // 심연 바닥 (y=16)
      { x: 7, y: 16 }, { x: 8, y: 16 }, { x: 9, y: 16 }, { x: 10, y: 16 },
      { x: 11, y: 16 }, { x: 12, y: 16 }, { x: 13, y: 16 }, { x: 14, y: 16 },
      { x: 15, y: 16 }, { x: 16, y: 16 }, { x: 17, y: 16 }, { x: 18, y: 16 },
      { x: 19, y: 16 },
    ],
    anchors: [
      { id: 'anchor-left', x: 5, y: 8, type: 'fixed' },
      { id: 'anchor-right', x: 21, y: 8, type: 'fixed' },
      { id: 'anchor-wall-left', x: 6, y: 11, type: 'fixed' },
      { id: 'anchor-wall-right', x: 20, y: 11, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 7 }, { x: 5, y: 7 }, { x: 21, y: 7 }, { x: 26, y: 7 },
    ],
    unlockRequirements: [
      { type: 'level_complete', levelId: 'level-010' },
    ],
    contentVersion: 1,
  },
  {
    // 21단계 (신규 징검다리 10: 최종 관문 직전 18칸 고산 오르막 + 암벽턱 & 바위탑 + 5칸 제한)
    id: 'level-022',
    title: '안개 낀 고산 협곡',
    description:
      '전설의 대교 바로 앞에 놓인 18칸 고산 협곡이에요! 5칸 이하 막대로 양쪽 암벽 받침턱과 중앙 바위탑을 엮어 오르막 대교를 세워보세요.',
    difficulty: 5,
    budget: 58000,
    unitCost: 500,
    maxMemberLength: 5,
    gridConfig: {
      width: 26,
      height: 16,
      cellSize: 40,
    },
    terrain: [
      // 좌측 고산 기슭 (y=9) 및 암벽 받침턱 (y=12)
      { x: 0, y: 9 }, { x: 1, y: 9 }, { x: 2, y: 9 }, { x: 3, y: 9 }, { x: 4, y: 9 },
      { x: 4, y: 12 }, { x: 5, y: 12 },
      // 중앙 바위탑 (y=12)
      { x: 12, y: 12 }, { x: 13, y: 12 }, { x: 14, y: 12 },
      // 우측 암벽 받침턱 (y=11) 및 정상 언덕 (y=8)
      { x: 21, y: 11 }, { x: 22, y: 11 },
      { x: 22, y: 8 }, { x: 23, y: 8 }, { x: 24, y: 8 }, { x: 25, y: 8 }, { x: 26, y: 8 },
      // 고산 협곡 바닥 (y=16)
      { x: 6, y: 16 }, { x: 7, y: 16 }, { x: 8, y: 16 },
      { x: 9, y: 16 }, { x: 10, y: 16 }, { x: 11, y: 16 },
      { x: 15, y: 16 }, { x: 16, y: 16 }, { x: 17, y: 16 },
      { x: 18, y: 16 }, { x: 19, y: 16 }, { x: 20, y: 16 },
    ],
    anchors: [
      { id: 'anchor-left', x: 4, y: 9, type: 'fixed' },
      { id: 'anchor-right', x: 22, y: 8, type: 'fixed' },
      { id: 'anchor-wall-left', x: 5, y: 12, type: 'fixed' },
      { id: 'anchor-spire', x: 13, y: 12, type: 'fixed' },
      { id: 'anchor-wall-right', x: 21, y: 11, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 8 }, { x: 4, y: 8 }, { x: 13, y: 8 }, { x: 22, y: 7 }, { x: 26, y: 7 },
    ],
    unlockRequirements: [
      { type: 'level_complete', levelId: 'level-011' },
    ],
    contentVersion: 1,
  },
  {
    // 22단계 (최종 관문 — 라인바운드 대교 그대로 유지)
    id: 'level-012',
    title: '라인바운드 대교',
    description:
      '모든 기술을 총동원하는 최종 관문이에요! 20칸 대협곡의 양쪽 암벽 턱과 중앙 바위탑을 5칸 이하 막대로 엮어 전설의 대교를 완성하세요.',
    difficulty: 5,
    budget: 65000,
    unitCost: 500,
    maxMemberLength: 5,
    gridConfig: {
      width: 28,
      height: 16,
      cellSize: 40,
    },
    terrain: [
      // 좌측 언덕 (y=8) 및 암벽 턱 (y=11)
      { x: 0, y: 8 }, { x: 1, y: 8 }, { x: 2, y: 8 }, { x: 3, y: 8 }, { x: 4, y: 8 },
      { x: 4, y: 11 }, { x: 5, y: 11 },
      // 중앙 바위탑 (y=12)
      { x: 13, y: 12 }, { x: 14, y: 12 }, { x: 15, y: 12 },
      // 우측 암벽 턱 (y=12) 및 언덕 (y=9)
      { x: 23, y: 12 }, { x: 24, y: 12 },
      { x: 24, y: 9 }, { x: 25, y: 9 }, { x: 26, y: 9 }, { x: 27, y: 9 }, { x: 28, y: 9 },
      // 대협곡 바닥 (y=16)
      { x: 6, y: 16 }, { x: 7, y: 16 }, { x: 8, y: 16 }, { x: 9, y: 16 },
      { x: 10, y: 16 }, { x: 11, y: 16 }, { x: 12, y: 16 },
      { x: 16, y: 16 }, { x: 17, y: 16 }, { x: 18, y: 16 }, { x: 19, y: 16 },
      { x: 20, y: 16 }, { x: 21, y: 16 }, { x: 22, y: 16 },
    ],
    anchors: [
      { id: 'anchor-left', x: 4, y: 8, type: 'fixed' },
      { id: 'anchor-right', x: 24, y: 9, type: 'fixed' },
      { id: 'anchor-wall-left', x: 5, y: 11, type: 'fixed' },
      { id: 'anchor-center-tower', x: 14, y: 12, type: 'fixed' },
      { id: 'anchor-wall-right', x: 23, y: 12, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 7 }, { x: 4, y: 7 }, { x: 14, y: 8 }, { x: 24, y: 8 }, { x: 28, y: 8 },
    ],
    unlockRequirements: [
      { type: 'level_complete', levelId: 'level-022' },
    ],
    contentVersion: 1,
  },
];

/** 샌드박스 기본 환경 */
export const SANDBOX_DEFAULT: LevelDefinition = {
  id: 'sandbox-default',
  title: '샌드박스',
  description: '자유롭게 건설하세요.',
  difficulty: 0,
  budget: Infinity,
  unitCost: 500,
  maxMemberLength: 6,
  gridConfig: {
    width: 30,
    height: 20,
    cellSize: 40,
  },
  terrain: [
    // 좌측 지면
    { x: 0, y: 15 }, { x: 1, y: 15 }, { x: 2, y: 15 }, { x: 3, y: 15 },
    { x: 4, y: 15 }, { x: 5, y: 15 },
    // 우측 지면
    { x: 24, y: 15 }, { x: 25, y: 15 }, { x: 26, y: 15 }, { x: 27, y: 15 },
    { x: 28, y: 15 }, { x: 29, y: 15 }, { x: 30, y: 15 },
  ],
  anchors: [
    { id: 'anchor-left', x: 5, y: 15, type: 'fixed' },
    { id: 'anchor-right', x: 24, y: 15, type: 'fixed' },
  ],
  truckPath: [
    { x: 0, y: 14 }, { x: 5, y: 14 }, { x: 24, y: 14 }, { x: 30, y: 14 },
  ],
  unlockRequirements: [],
  contentVersion: 1,
};

/** ID로 레벨 찾기 */
export function getLevelById(id: string): LevelDefinition | undefined {
  return LEVELS.find((level) => level.id === id);
}

/** 해금 조건 확인 (이미 클리어한 스테이지도 해금 유지) */
export function isLevelUnlocked(
  levelId: string,
  completedLevelIds: Set<string>,
): boolean {
  const level = getLevelById(levelId);
  if (!level) return false;
  if (completedLevelIds.has(levelId)) return true;

  return level.unlockRequirements.every((req) => {
    if (req.type === 'level_complete') {
      return completedLevelIds.has(req.levelId);
    }
    return false;
  });
}
