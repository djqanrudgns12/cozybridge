import { describe, it, expect } from 'vitest';
import { LEVELS, getHintsByLevelId, isLevelUnlocked } from '@cozybridge/content';
import type { BridgeDesign, BridgeNode, LevelDefinition } from '@cozybridge/domain';
import { MatterBridgeEngine } from '../matter-bridge-engine.js';

type Segment = [{ x: number; y: number }, { x: number; y: number }];

function createDesign(level: LevelDefinition, segments: Segment[]): {
  design: BridgeDesign;
  totalCost: number;
  maxBarLength: number;
} {
  const nodesMap = new Map<string, BridgeNode>();

  for (const a of level.anchors) {
    const id = `node-${a.x}-${a.y}`;
    nodesMap.set(id, {
      id,
      x: a.x,
      y: a.y,
      nodeType: 'anchor',
      anchorId: a.id,
    });
  }

  const membersMap = new Map<
    string,
    {
      id: string;
      startNodeId: string;
      endNodeId: string;
      materialType: 'standard';
      cost: number;
    }
  >();

  let totalCost = 0;
  let maxBarLength = 0;

  segments.forEach(([s, e], idx) => {
    // 실제 게임 에디터(BuildScene)와 동일하게 정수 격자 좌표만 허용되는지 검증
    expect(Number.isInteger(s.x)).toBe(true);
    expect(Number.isInteger(s.y)).toBe(true);
    expect(Number.isInteger(e.x)).toBe(true);
    expect(Number.isInteger(e.y)).toBe(true);

    const sid = `node-${s.x}-${s.y}`;
    const eid = `node-${e.x}-${e.y}`;

    if (!nodesMap.has(sid)) {
      const anchor = level.anchors.find((a) => a.x === s.x && a.y === s.y);
      nodesMap.set(sid, {
        id: sid,
        x: s.x,
        y: s.y,
        nodeType: anchor ? 'anchor' : 'free',
        ...(anchor ? { anchorId: anchor.id } : {}),
      });
    }

    if (!nodesMap.has(eid)) {
      const anchor = level.anchors.find((a) => a.x === e.x && a.y === e.y);
      nodesMap.set(eid, {
        id: eid,
        x: e.x,
        y: e.y,
        nodeType: anchor ? 'anchor' : 'free',
        ...(anchor ? { anchorId: anchor.id } : {}),
      });
    }

    const len = Math.hypot(e.x - s.x, e.y - s.y);
    if (len > maxBarLength) maxBarLength = len;
    const cost = len * level.unitCost;
    totalCost += cost;

    membersMap.set(`m-${idx}`, {
      id: `m-${idx}`,
      startNodeId: sid,
      endNodeId: eid,
      materialType: 'standard',
      cost,
    });
  });

  return {
    design: {
      id: `campaign-test-${level.id}`,
      ownerId: 'tester',
      title: `${level.title} 검증 설계`,
      description: '',
      mode: 'stage',
      levelId: level.id,
      visibility: 'private',
      currentVersionId: 'v1',
      nodes: nodesMap,
      members: membersMap,
      createdAt: 0,
      updatedAt: 0,
      syncStatus: 'synced',
      schemaVersion: 1,
    },
    totalCost,
    maxBarLength,
  };
}

function runStageSim(level: LevelDefinition, segments: Segment[]) {
  const { design, totalCost, maxBarLength } = createDesign(level, segments);
  const engine = new MatterBridgeEngine();
  engine.initialize(design, level);

  for (let step = 0; step < 1200; step++) {
    engine.step(1 / 60);
    if (engine.getStatus() !== 'running') {
      break;
    }
  }

  const status = engine.getStatus();
  const report = engine.getFailureReport();
  engine.dispose();
  return { status, report, totalCost, maxBarLength };
}

describe('12단계 확장 캠페인 데이터 무결성 및 물리 클리어 검증', () => {
  it('총 12개 스테이지가 순차 해금 체인과 전용 비법 노트(각 2개)를 갖추고 있다', () => {
    expect(LEVELS.length).toBe(12);

    const completed = new Set<string>();
    LEVELS.forEach((lvl, idx) => {
      const expectedId = `level-${String(idx + 1).padStart(3, '0')}`;
      expect(lvl.id).toBe(expectedId);

      // 첫 단계만 즉시 해금, 이후 단계는 직전 단계 완료 시 해금
      if (idx === 0) {
        expect(isLevelUnlocked(lvl.id, completed)).toBe(true);
      } else {
        expect(isLevelUnlocked(lvl.id, completed)).toBe(false);
        completed.add(LEVELS[idx - 1]!.id);
        expect(isLevelUnlocked(lvl.id, completed)).toBe(true);
      }

      // 좌·우 도로 고정 핀 정렬 무결성 (anchors[0] = 최소 x, anchors[1] = 최대 x)
      expect(lvl.anchors.length).toBeGreaterThanOrEqual(2);
      const leftA = lvl.anchors[0]!;
      const rightA = lvl.anchors[1]!;
      expect(leftA.x).toBeLessThan(rightA.x);
      for (let i = 2; i < lvl.anchors.length; i++) {
        const extra = lvl.anchors[i]!;
        expect(extra.x).toBeGreaterThan(leftA.x);
        expect(extra.x).toBeLessThan(rightA.x);
      }

      // 모든 스테이지별 맞춤 비법 노트 2개씩 존재
      const hints = getHintsByLevelId(lvl.id);
      expect(hints.length).toBe(2);
    });
  });

  const stageSolutions: Record<
    string,
    { unbracedDeck: Segment[]; validBridge: Segment[] }
  > = {
    'level-004': {
      unbracedDeck: [
        [{ x: 4, y: 9 }, { x: 8, y: 9 }],
        [{ x: 8, y: 9 }, { x: 12, y: 9 }],
        [{ x: 12, y: 9 }, { x: 16, y: 9 }],
        [{ x: 16, y: 9 }, { x: 20, y: 9 }],
      ],
      validBridge: [
        [{ x: 4, y: 9 }, { x: 8, y: 9 }],
        [{ x: 8, y: 9 }, { x: 12, y: 9 }],
        [{ x: 12, y: 9 }, { x: 16, y: 9 }],
        [{ x: 16, y: 9 }, { x: 20, y: 9 }],
        // 수중 바위섬(12,11) 기둥 + 좌·우 하부 트러스
        [{ x: 4, y: 9 }, { x: 8, y: 11 }],
        [{ x: 8, y: 9 }, { x: 8, y: 11 }],
        [{ x: 8, y: 11 }, { x: 12, y: 9 }],
        [{ x: 8, y: 11 }, { x: 12, y: 11 }],
        [{ x: 12, y: 9 }, { x: 12, y: 11 }],
        [{ x: 12, y: 9 }, { x: 16, y: 11 }],
        [{ x: 12, y: 11 }, { x: 16, y: 11 }],
        [{ x: 16, y: 9 }, { x: 16, y: 11 }],
        [{ x: 16, y: 11 }, { x: 20, y: 9 }],
      ],
    },
    'level-005': {
      unbracedDeck: [
        [{ x: 5, y: 10 }, { x: 9, y: 9 }],
        [{ x: 9, y: 9 }, { x: 13, y: 9 }],
        [{ x: 13, y: 9 }, { x: 16, y: 8 }],
      ],
      validBridge: [
        [{ x: 5, y: 10 }, { x: 9, y: 9 }],
        [{ x: 9, y: 9 }, { x: 13, y: 9 }],
        [{ x: 13, y: 9 }, { x: 16, y: 8 }],
        [{ x: 5, y: 10 }, { x: 9, y: 11 }],
        [{ x: 9, y: 9 }, { x: 9, y: 11 }],
        [{ x: 9, y: 11 }, { x: 13, y: 9 }],
        [{ x: 9, y: 11 }, { x: 13, y: 11 }],
        [{ x: 13, y: 9 }, { x: 13, y: 11 }],
        [{ x: 13, y: 11 }, { x: 16, y: 8 }],
      ],
    },
    'level-006': {
      unbracedDeck: [
        [{ x: 5, y: 9 }, { x: 8, y: 9 }],
        [{ x: 8, y: 9 }, { x: 10, y: 9 }],
        [{ x: 10, y: 9 }, { x: 12, y: 9 }],
        [{ x: 12, y: 9 }, { x: 15, y: 9 }],
      ],
      validBridge: [
        [{ x: 5, y: 9 }, { x: 8, y: 9 }],
        [{ x: 8, y: 9 }, { x: 10, y: 9 }],
        [{ x: 10, y: 9 }, { x: 12, y: 9 }],
        [{ x: 12, y: 9 }, { x: 15, y: 9 }],
        // 모든 부재 <= 3.61칸 (최대 4칸 제한 준수)
        [{ x: 5, y: 9 }, { x: 8, y: 11 }],
        [{ x: 8, y: 9 }, { x: 8, y: 11 }],
        [{ x: 8, y: 11 }, { x: 10, y: 9 }],
        [{ x: 8, y: 11 }, { x: 10, y: 11 }],
        [{ x: 10, y: 9 }, { x: 10, y: 11 }],
        [{ x: 10, y: 11 }, { x: 12, y: 9 }],
        [{ x: 10, y: 11 }, { x: 12, y: 11 }],
        [{ x: 12, y: 9 }, { x: 12, y: 11 }],
        [{ x: 12, y: 11 }, { x: 15, y: 9 }],
      ],
    },
    'level-007': {
      unbracedDeck: [
        [{ x: 5, y: 8 }, { x: 9, y: 8 }],
        [{ x: 9, y: 8 }, { x: 12, y: 8 }],
        [{ x: 12, y: 8 }, { x: 15, y: 8 }],
        [{ x: 15, y: 8 }, { x: 19, y: 8 }],
      ],
      validBridge: [
        [{ x: 5, y: 8 }, { x: 9, y: 8 }],
        [{ x: 9, y: 8 }, { x: 12, y: 8 }],
        [{ x: 12, y: 8 }, { x: 15, y: 8 }],
        [{ x: 15, y: 8 }, { x: 19, y: 8 }],
        // 양쪽 절벽 하단 아치 핀 (6,11), (18,11) 활용 아치교
        [{ x: 6, y: 11 }, { x: 9, y: 8 }],
        [{ x: 6, y: 11 }, { x: 10, y: 10 }],
        [{ x: 9, y: 8 }, { x: 10, y: 10 }],
        [{ x: 10, y: 10 }, { x: 12, y: 8 }],
        [{ x: 10, y: 10 }, { x: 14, y: 10 }],
        [{ x: 14, y: 10 }, { x: 12, y: 8 }],
        [{ x: 14, y: 10 }, { x: 15, y: 8 }],
        [{ x: 18, y: 11 }, { x: 14, y: 10 }],
        [{ x: 18, y: 11 }, { x: 15, y: 8 }],
      ],
    },
    'level-008': {
      unbracedDeck: [
        [{ x: 4, y: 9 }, { x: 7, y: 9 }],
        [{ x: 7, y: 9 }, { x: 10, y: 9 }],
        [{ x: 10, y: 9 }, { x: 13, y: 9 }],
        [{ x: 13, y: 9 }, { x: 16, y: 9 }],
        [{ x: 16, y: 9 }, { x: 19, y: 9 }],
        [{ x: 19, y: 9 }, { x: 22, y: 9 }],
      ],
      validBridge: [
        [{ x: 4, y: 9 }, { x: 7, y: 9 }],
        [{ x: 7, y: 9 }, { x: 10, y: 9 }],
        [{ x: 10, y: 9 }, { x: 13, y: 9 }],
        [{ x: 13, y: 9 }, { x: 16, y: 9 }],
        [{ x: 16, y: 9 }, { x: 19, y: 9 }],
        [{ x: 19, y: 9 }, { x: 22, y: 9 }],
        // 쌍둥이 수중 교각 (10,12), (16,12) 3경간 지지
        [{ x: 4, y: 9 }, { x: 7, y: 11 }],
        [{ x: 7, y: 9 }, { x: 7, y: 11 }],
        [{ x: 7, y: 11 }, { x: 10, y: 9 }],
        [{ x: 7, y: 11 }, { x: 10, y: 12 }],
        [{ x: 10, y: 9 }, { x: 10, y: 12 }],
        [{ x: 10, y: 12 }, { x: 13, y: 9 }],
        [{ x: 10, y: 9 }, { x: 13, y: 11 }],
        [{ x: 13, y: 9 }, { x: 13, y: 11 }],
        [{ x: 13, y: 11 }, { x: 16, y: 9 }],
        [{ x: 13, y: 11 }, { x: 16, y: 12 }],
        [{ x: 16, y: 9 }, { x: 16, y: 12 }],
        [{ x: 16, y: 12 }, { x: 19, y: 11 }],
        [{ x: 16, y: 9 }, { x: 19, y: 11 }],
        [{ x: 19, y: 9 }, { x: 19, y: 11 }],
        [{ x: 19, y: 11 }, { x: 22, y: 9 }],
      ],
    },
    'level-009': {
      unbracedDeck: [
        [{ x: 4, y: 9 }, { x: 8, y: 9 }],
        [{ x: 8, y: 9 }, { x: 12, y: 9 }],
        [{ x: 12, y: 9 }, { x: 16, y: 9 }],
      ],
      validBridge: [
        [{ x: 4, y: 9 }, { x: 8, y: 9 }],
        [{ x: 8, y: 9 }, { x: 12, y: 9 }],
        [{ x: 12, y: 9 }, { x: 16, y: 9 }],
        // 군더더기 없는 고효율 하부 트러스 (₩16,708 <= 예산 ₩23,000의 75% 3스타!)
        [{ x: 4, y: 9 }, { x: 8, y: 11 }],
        [{ x: 8, y: 9 }, { x: 8, y: 11 }],
        [{ x: 8, y: 11 }, { x: 12, y: 9 }],
        [{ x: 8, y: 11 }, { x: 12, y: 11 }],
        [{ x: 12, y: 9 }, { x: 12, y: 11 }],
        [{ x: 12, y: 11 }, { x: 16, y: 9 }],
      ],
    },
    'level-010': {
      unbracedDeck: [
        [{ x: 5, y: 6 }, { x: 8, y: 7 }],
        [{ x: 8, y: 7 }, { x: 12, y: 8 }],
        [{ x: 12, y: 8 }, { x: 16, y: 9 }],
        [{ x: 16, y: 9 }, { x: 19, y: 10 }],
      ],
      validBridge: [
        [{ x: 5, y: 6 }, { x: 8, y: 7 }],
        [{ x: 8, y: 7 }, { x: 12, y: 8 }],
        [{ x: 12, y: 8 }, { x: 16, y: 9 }],
        [{ x: 16, y: 9 }, { x: 19, y: 10 }],
        // 산악 암벽 핀(6,9) + 중앙 봉우리 핀(13,13), 모든 부재 <= 5칸 제한 준수
        [{ x: 6, y: 9 }, { x: 8, y: 7 }],
        [{ x: 6, y: 9 }, { x: 9, y: 10 }],
        [{ x: 8, y: 7 }, { x: 9, y: 10 }],
        [{ x: 9, y: 10 }, { x: 12, y: 8 }],
        [{ x: 9, y: 10 }, { x: 13, y: 10 }],
        [{ x: 12, y: 8 }, { x: 13, y: 10 }],
        [{ x: 13, y: 13 }, { x: 9, y: 10 }],
        [{ x: 13, y: 13 }, { x: 13, y: 10 }],
        [{ x: 13, y: 10 }, { x: 16, y: 9 }],
        [{ x: 13, y: 13 }, { x: 16, y: 11 }],
        [{ x: 13, y: 10 }, { x: 16, y: 11 }],
        [{ x: 16, y: 9 }, { x: 16, y: 11 }],
        [{ x: 16, y: 11 }, { x: 19, y: 10 }],
      ],
    },
    'level-011': {
      unbracedDeck: [
        [{ x: 5, y: 8 }, { x: 9, y: 8 }],
        [{ x: 9, y: 8 }, { x: 13, y: 8 }],
        [{ x: 13, y: 8 }, { x: 17, y: 8 }],
        [{ x: 17, y: 8 }, { x: 21, y: 8 }],
      ],
      validBridge: [
        [{ x: 5, y: 8 }, { x: 9, y: 8 }],
        [{ x: 9, y: 8 }, { x: 13, y: 8 }],
        [{ x: 13, y: 8 }, { x: 17, y: 8 }],
        [{ x: 17, y: 8 }, { x: 21, y: 8 }],
        // 무교각 심연 외팔보(캔틸레버) 아치 트러스: 양벽 (6,11) ~ (20,11)
        [{ x: 6, y: 11 }, { x: 9, y: 8 }],
        [{ x: 6, y: 11 }, { x: 10, y: 11 }],
        [{ x: 9, y: 8 }, { x: 10, y: 11 }],
        [{ x: 10, y: 11 }, { x: 13, y: 8 }],
        [{ x: 10, y: 11 }, { x: 13, y: 11 }],
        [{ x: 13, y: 8 }, { x: 13, y: 11 }],
        [{ x: 13, y: 8 }, { x: 16, y: 11 }],
        [{ x: 13, y: 11 }, { x: 16, y: 11 }],
        [{ x: 16, y: 11 }, { x: 17, y: 8 }],
        [{ x: 16, y: 11 }, { x: 20, y: 11 }],
        [{ x: 20, y: 11 }, { x: 17, y: 8 }],
      ],
    },
    'level-012': {
      unbracedDeck: [
        [{ x: 4, y: 8 }, { x: 8, y: 8 }],
        [{ x: 8, y: 8 }, { x: 11, y: 8 }],
        [{ x: 11, y: 8 }, { x: 14, y: 9 }],
        [{ x: 14, y: 9 }, { x: 18, y: 9 }],
        [{ x: 18, y: 9 }, { x: 21, y: 9 }],
        [{ x: 21, y: 9 }, { x: 24, y: 9 }],
      ],
      validBridge: [
        [{ x: 4, y: 8 }, { x: 8, y: 8 }],
        [{ x: 8, y: 8 }, { x: 11, y: 8 }],
        [{ x: 11, y: 8 }, { x: 14, y: 9 }],
        [{ x: 14, y: 9 }, { x: 18, y: 9 }],
        [{ x: 18, y: 9 }, { x: 21, y: 9 }],
        [{ x: 21, y: 9 }, { x: 24, y: 9 }],
        // 좌측 구간 (암벽 5,11 ~ 중앙 바위탑 14,12)
        [{ x: 5, y: 11 }, { x: 8, y: 8 }],
        [{ x: 5, y: 11 }, { x: 8, y: 11 }],
        [{ x: 8, y: 8 }, { x: 8, y: 11 }],
        [{ x: 8, y: 11 }, { x: 11, y: 8 }],
        [{ x: 8, y: 11 }, { x: 11, y: 11 }],
        [{ x: 11, y: 8 }, { x: 11, y: 11 }],
        [{ x: 11, y: 11 }, { x: 14, y: 9 }],
        [{ x: 11, y: 11 }, { x: 14, y: 12 }],
        [{ x: 14, y: 9 }, { x: 14, y: 12 }],
        // 우측 구간 (중앙 바위탑 14,12 ~ 우측 암벽 23,12)
        [{ x: 14, y: 12 }, { x: 18, y: 9 }],
        [{ x: 14, y: 12 }, { x: 18, y: 12 }],
        [{ x: 18, y: 9 }, { x: 18, y: 12 }],
        [{ x: 18, y: 12 }, { x: 21, y: 9 }],
        [{ x: 18, y: 12 }, { x: 21, y: 12 }],
        [{ x: 21, y: 9 }, { x: 21, y: 12 }],
        [{ x: 21, y: 12 }, { x: 24, y: 9 }],
        [{ x: 21, y: 12 }, { x: 23, y: 12 }],
        [{ x: 23, y: 12 }, { x: 21, y: 9 }],
      ],
    },
  };

  for (const [levelId, cases] of Object.entries(stageSolutions)) {
    it(`${levelId}: 무보강 외줄 상판은 붕괴(failure)하고, 정석 구조 설계는 길이·예산 제약(3스타 기준) 안에서 무사히 통과(success)한다`, () => {
      const level = LEVELS.find((l) => l.id === levelId)!;
      expect(level).toBeDefined();
      const maxAllowed = level.maxMemberLength ?? 6;

      // 1. 무보강 단순 상판은 반드시 실패
      const failRun = runStageSim(level, cases.unbracedDeck);
      expect(failRun.maxBarLength).toBeLessThanOrEqual(maxAllowed + 1e-6);
      expect(failRun.status).toBe('failure');

      // 2. 보강된 정석 다리는 길이 제한 및 3스타 예산(<= 75%) 이내로 성공
      const passRun = runStageSim(level, cases.validBridge);
      expect(passRun.maxBarLength).toBeLessThanOrEqual(maxAllowed + 1e-6);
      expect(passRun.totalCost).toBeLessThanOrEqual(level.budget * 0.75);
      expect(passRun.status).toBe('success');
      expect(passRun.report).toBeNull();
    });
  }
});
