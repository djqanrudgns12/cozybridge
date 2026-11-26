import type { LevelHint } from '@linebound/domain';

export const LEVEL_HINTS: LevelHint[] = [
  // 레벨 1 비법 노트
  {
    id: 'hint-lvl1-1',
    levelId: 'level-001',
    order: 1,
    title: '양쪽 노란 고정 핀을 먼저 이어보세요',
    description:
      '트럭이 달릴 수 있도록 왼쪽 노란 고정 핀부터 오른쪽 고정 핀까지 끊어지지 않게 반듯한 길을 먼저 이어보세요. 한 번에 너무 멀면 중간에 점을 찍어 나누어 이어요!',
    cost: 50,
  },
  {
    id: 'hint-lvl1-2',
    levelId: 'level-001',
    order: 2,
    title: '네모보다 세모가 훨씬 튼튼해요!',
    description:
      '일자 길만 놓으면 트럭 무게 때문에 가운데가 푹 내려앉아요. 트럭이 부딪히지 않도록 길 위는 비워두고, 길 아래쪽에 뒤집어진 세모(▽) 받침대를 만들어 보세요!',
    cost: 100,
  },

  // 레벨 2 비법 노트
  {
    id: 'hint-lvl2-1',
    levelId: 'level-002',
    order: 1,
    title: '짧은 칸으로 나누어 길을 놓으세요',
    description:
      '계곡이 넓어서 긴 막대 하나로는 건널 수 없어요. 3~4칸마다 점을 찍어 징검다리처럼 차근차근 길을 이어 나가세요.',
    cost: 70,
  },
  {
    id: 'hint-lvl2-2',
    levelId: 'level-002',
    order: 2,
    title: '길 아래에 세모 기차를 이어 붙여보세요',
    description:
      '길 아래쪽으로 뒤집어진 세모(▽) 받침대를 여러 개 나란히 달고, 맨 아랫줄 점들끼리도 손잡듯 가로로 연결하면 넓은 계곡도 끄떡없어요!',
    cost: 90,
  },

  // 레벨 3 비법 노트
  {
    id: 'hint-lvl3-1',
    levelId: 'level-003',
    order: 1,
    title: '계곡 바닥의 고정 핀을 찾아보세요',
    description:
      '계곡 한가운데 바닥을 보면 노란 고정 핀이 하나 더 숨어 있어요! 여기서 위로 기둥을 세우면 다리 가운데를 든든히 받쳐 줍니다.',
    cost: 100,
  },
  {
    id: 'hint-lvl3-2',
    levelId: 'level-003',
    order: 2,
    title: '완만한 내리막길 아래를 받쳐주세요',
    description:
      '왼쪽 땅이 오른쪽보다 높아요. 급하게 꺾이지 않도록 부드럽게 내려가는 비탈길을 잇고, 길 아래쪽에서 세모 날개로 보강해보세요.',
    cost: 100,
  },

  // 레벨 4 비법 노트 (징검다리 바위섬)
  {
    id: 'hint-lvl4-1',
    levelId: 'level-004',
    order: 1,
    title: '가운데 바위섬 핀에서 위로 기둥을 올려요!',
    description:
      '강 한가운데 낮은 바위섬에 노란 고정 핀이 있어요! 길을 똑바로 이어 놓은 뒤, 바위섬 고정 핀에서 길 한가운데로 짧은 기둥을 올려 받쳐보세요.',
    cost: 80,
  },
  {
    id: 'hint-lvl4-2',
    levelId: 'level-004',
    order: 2,
    title: '왼쪽 다리 하나, 오른쪽 다리 하나!',
    description:
      '바위섬 기둥을 중심으로 왼쪽 8칸과 오른쪽 8칸을 각각 작은 세모(▽) 받침대로 받쳐주면 긴 강을 반으로 나누어 아주 쉽게 건널 수 있어요!',
    cost: 90,
  },

  // 레벨 5 비법 노트 (오르막 언덕길)
  {
    id: 'hint-lvl5-1',
    levelId: 'level-005',
    order: 1,
    title: '계단처럼 꺾지 말고 완만한 오르막길로!',
    description:
      '오른쪽 땅이 2칸 더 높아요! 길을 갑자기 가파르게 올리면 트럭이 힘겨워해요. 3~4칸마다 조금씩 부드럽게 올라가는 비탈길로 이어보세요.',
    cost: 80,
  },
  {
    id: 'hint-lvl5-2',
    levelId: 'level-005',
    order: 2,
    title: '오르막길 아래에도 세모 받침대를 묶어주세요',
    description:
      '트럭이 언덕을 올라갈 때 다리 바닥을 세게 눌러요. 비탈길 아래쪽에 세모(▽) 기둥들을 달고 아랫줄끼리 단단히 이어 흔들림을 잡아주세요!',
    cost: 100,
  },

  // 레벨 6 비법 노트 (짧은 통나무 다리 · 최대 4칸)
  {
    id: 'hint-lvl6-1',
    levelId: 'level-006',
    order: 1,
    title: '2~3칸 간격으로 촘촘하게 점을 찍어요',
    description:
      '이 단계에서는 막대 하나가 4칸까지만 늘어나요! 상판 길을 2~3칸씩 짧게 나누어 이으면 대각선 막대도 4칸을 넘지 않게 연결할 수 있어요.',
    cost: 90,
  },
  {
    id: 'hint-lvl6-2',
    levelId: 'level-006',
    order: 2,
    title: '높이 2칸짜리 촘촘한 세모 그물을 짜보세요',
    description:
      '길 바로 아래 2칸 높이(y=11)에 점들을 찍고 지그재그 대각선으로 연결해보세요. 가로 3칸·세로 2칸 대각선 길이는 약 3.6칸이라 4칸 제한 안에 쏙 들어와요!',
    cost: 110,
  },

  // 레벨 7 비법 노트 (절벽 아치 협곡)
  {
    id: 'hint-lvl7-1',
    levelId: 'level-007',
    order: 1,
    title: '양쪽 절벽 아래 턱의 고정 핀을 활용하세요!',
    description:
      '바닥은 너무 깊지만 양쪽 절벽 바로 아래 턱에 노란 고정 핀이 하나씩 더 있어요! 여기서 안쪽 대각선으로 막대를 뻗어 다리 배를 떠받쳐 보세요.',
    cost: 100,
  },
  {
    id: 'hint-lvl7-2',
    levelId: 'level-007',
    order: 2,
    title: '무지개 모양 아치 받침대로 힘을 모아요',
    description:
      '왼쪽 절벽 아래 핀과 오른쪽 절벽 아래 핀에서 올라온 버팀대들을 다리 아래에서 가로 막대로 서로 맞잡게 이으면 엄청나게 튼튼한 아치교가 완성돼요!',
    cost: 120,
  },

  // 레벨 8 비법 노트 (쌍둥이 교각 대교)
  {
    id: 'hint-lvl8-1',
    levelId: 'level-008',
    order: 1,
    title: '두 개의 수중 교각 핀 위에 기둥부터 세워요',
    description:
      '강물 속 두 바위 교각에서 위로 기둥과 브이(V)자 날개를 펼쳐 보세요! 18칸의 넓은 강이 6칸씩 세 구간으로 나뉘어 훨씬 짓기 쉬워져요.',
    cost: 100,
  },
  {
    id: 'hint-lvl8-2',
    levelId: 'level-008',
    order: 2,
    title: '두 교각 사이의 가운데 구간도 잊지 마세요',
    description:
      '양옆 구간뿐 아니라 두 바위 교각 사이의 한가운데 길 아래에도 작은 세모 받침대를 달아 두 교각과 연결하면 흔들림 없는 대교가 돼요!',
    cost: 120,
  },

  // 레벨 9 비법 노트 (알뜰살뜰 예산 시험)
  {
    id: 'hint-lvl9-1',
    levelId: 'level-009',
    order: 1,
    title: '딱 4칸씩 세 구간으로 나누면 돈을 아껴요!',
    description:
      '점을 너무 촘촘히 찍으면 기둥 막대가 많아져 돈이 금방 바닥나요. 12칸 거리를 4칸씩 딱 세 구간(x=8, x=12)으로 나누어 상판부터 깔끔하게 이어보세요.',
    cost: 120,
  },
  {
    id: 'hint-lvl9-2',
    levelId: 'level-009',
    order: 2,
    title: '네모 칸에는 대각선 딱 1개면 충분해요!',
    description:
      '가운데 네모 상자에 X자로 대각선을 두 개 다 그을 필요 없어요! 한쪽 대각선 딱 1개만 그어도 세모 두 개로 단단히 잠겨 별 3개까지 노릴 수 있답니다!',
    cost: 140,
  },

  // 레벨 10 비법 노트 (가파른 산악 철교)
  {
    id: 'hint-lvl10-1',
    levelId: 'level-010',
    order: 1,
    title: '한 번에 1칸씩 내려가는 비탈길을 놓으세요',
    description:
      '막대가 5칸까지만 늘어나요! 왼쪽(y=6)에서 시작해 3~4칸 갈 때마다 아래로 1칸씩 내려가면 오른쪽(y=10)까지 부드러운 비탈길이 이어져요.',
    cost: 120,
  },
  {
    id: 'hint-lvl10-2',
    levelId: 'level-010',
    order: 2,
    title: '왼쪽 절벽 턱과 중앙 바위봉우리를 징검다리로!',
    description:
      '왼쪽 절벽 턱 핀(6,9)은 윗구간을 받치고, 중앙 바위봉우리 핀(13,13)에서는 위로 철탑 기둥을 세워 아랫구간 비탈길을 삼각형으로 받쳐주세요!',
    cost: 140,
  },

  // 레벨 11 비법 노트 (구름 위 심연 협곡)
  {
    id: 'hint-lvl11-1',
    levelId: 'level-011',
    order: 1,
    title: '절벽 위·아래 핀으로 든든한 어깨 팔을 만들어요',
    description:
      '바닥에 기둥을 세울 수 없으니 양쪽 절벽 위 핀과 아래 핀에서 동시에 협곡 안쪽으로 삼각형 팔(외팔보)을 뻗어 나가 보세요!',
    cost: 140,
  },
  {
    id: 'hint-lvl11-2',
    levelId: 'level-011',
    order: 2,
    title: '양쪽에서 뻗어 나온 아랫줄을 허공에서 맞잡아요!',
    description:
      '왼쪽 암벽 핀(6,11)에서 시작해 오른쪽 암벽 핀(20,11)까지 다리 아래쪽 아랫줄을 끊김 없이 잇고, 상판과 대각선으로 엮으면 구름 위 심연도 거뜬해요!',
    cost: 160,
  },

  // 레벨 12 비법 노트 (라인바운드 대교)
  {
    id: 'hint-lvl12-1',
    levelId: 'level-012',
    order: 1,
    title: '중앙 바위탑을 기준으로 왼쪽·오른쪽을 나누어 공략해요!',
    description:
      '20칸의 거대한 협곡이지만 한가운데 바위탑(14,12)이 있어요! 먼저 3~4칸 간격으로 길을 이은 뒤, 중앙 바위탑에서 위로 기둥을 올려 중간 지점을 고정하세요.',
    cost: 150,
  },
  {
    id: 'hint-lvl12-2',
    levelId: 'level-012',
    order: 2,
    title: '양쪽 암벽 핀과 중앙 바위탑을 세모 아치로 연결해요',
    description:
      '왼쪽 암벽 핀(5,11) → 중앙 바위탑(14,12) → 오른쪽 암벽 핀(23,12)으로 이어지는 든든한 하부 골조를 만들고 상판과 세모로 엮으면 전설의 대교 완성!',
    cost: 180,
  },
];

export function getHintsByLevelId(levelId: string): LevelHint[] {
  return LEVEL_HINTS.filter((h) => h.levelId === levelId).sort(
    (a, b) => a.order - b.order,
  );
}
