import { describe, it, expect } from 'vitest';
import { LESSONS, type LessonDefinition } from '@cozybridge/content';
import type { BridgeDesign, BridgeNode } from '@cozybridge/domain';
import { MatterBridgeEngine } from '../matter-bridge-engine.js';

type Segment = [{ x: number; y: number }, { x: number; y: number }];

function sameSegment(a: Segment, b: Segment): boolean {
  const forward =
    a[0].x === b[0].x &&
    a[0].y === b[0].y &&
    a[1].x === b[1].x &&
    a[1].y === b[1].y;
  const reverse =
    a[0].x === b[1].x &&
    a[0].y === b[1].y &&
    a[1].x === b[0].x &&
    a[1].y === b[0].y;
  return forward || reverse;
}

function getInitialSegments(lesson: LessonDefinition): Segment[] {
  return lesson.initialMembers.map((m) => [
    { x: m.startX, y: m.startY },
    { x: m.endX, y: m.endY },
  ]);
}

function getCompletedSegments(lesson: LessonDefinition): Segment[] {
  let segments = getInitialSegments(lesson);
  for (const guide of lesson.guideSegments) {
    const gSeg: Segment = [
      { x: guide.startX, y: guide.startY },
      { x: guide.endX, y: guide.endY },
    ];
    if (guide.action === 'erase') {
      segments = segments.filter((seg) => !sameSegment(seg, gSeg));
    } else if (guide.action === 'add') {
      if (!segments.some((seg) => sameSegment(seg, gSeg))) {
        segments.push(gSeg);
      }
    }
  }
  return segments;
}

function buildLessonDesign(lesson: LessonDefinition, segments: Segment[]): BridgeDesign {
  const { level } = lesson;
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

  segments.forEach(([s, e], idx) => {
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
    membersMap.set(`m-${idx}`, {
      id: `m-${idx}`,
      startNodeId: sid,
      endNodeId: eid,
      materialType: 'standard',
      cost: Math.round(len * level.unitCost),
    });
  });

  return {
    id: `lesson-test-${lesson.id}`,
    ownerId: 'user-1',
    title: lesson.title,
    description: lesson.subtitle,
    mode: 'lesson',
    levelId: level.id,
    visibility: 'private',
    currentVersionId: 'v1',
    nodes: nodesMap,
    members: membersMap,
    createdAt: 0,
    updatedAt: 0,
    syncStatus: 'synced',
    schemaVersion: 1,
  };
}

function runLessonSim(lesson: LessonDefinition, segments: Segment[]) {
  const engine = new MatterBridgeEngine();
  const design = buildLessonDesign(lesson, segments);
  const totalCost = Array.from(design.members.values()).reduce((sum, m) => sum + m.cost, 0);

  engine.initialize(design, lesson.level);
  for (let step = 0; step < 900; step++) {
    engine.step(1 / 60);
    if (engine.getStatus() !== 'running') {
      break;
    }
  }
  const status = engine.getStatus();
  const report = engine.getFailureReport();
  engine.dispose();
  return { status, report, totalCost };
}

describe('초등 3학년 다리 교실(수업 모드) 8단계 물리 검증', () => {
  it('총 8교시가 순서대로 정의되어 있으며 모든 가이드 선분이 최대 길이 제한 이내이다', () => {
    expect(LESSONS).toHaveLength(8);
    for (const lesson of LESSONS) {
      for (const guide of lesson.guideSegments) {
        const len = Math.hypot(guide.endX - guide.startX, guide.endY - guide.startY);
        expect(len, `${lesson.id} 가이드 길이 초과`).toBeLessThanOrEqual(
          lesson.level.maxMemberLength ?? 6,
        );
      }
    }
  });

  it('1~7교시 초기 상태는 의도한 원인으로 실패하고, 8교시 초기 상태는 예산을 초과한다', () => {
    for (const lesson of LESSONS) {
      const initialResult = runLessonSim(lesson, getInitialSegments(lesson));
      if (lesson.id === 'lesson-008') {
        expect(initialResult.totalCost).toBeGreaterThan(lesson.level.budget);
      } else {
        expect(initialResult.status, `${lesson.id} 초기 상태가 실패해야 함`).toBe('failure');
        if (lesson.id === 'lesson-003') {
          expect(initialResult.report?.category).toBe('road_blocked');
        }
      }
    }
  });

  it('1~8교시 모두 점선 가이드를 따라 완성하면 예산 이내로 트럭이 안전하게 통과(success)한다', () => {
    for (const lesson of LESSONS) {
      const completedResult = runLessonSim(lesson, getCompletedSegments(lesson));
      expect(
        completedResult.totalCost,
        `${lesson.id} 완성 비용(${completedResult.totalCost})이 예산(${lesson.level.budget}) 이내여야 함`,
      ).toBeLessThanOrEqual(lesson.level.budget);
      expect(
        completedResult.status,
        `${lesson.id} 완성 시 통과해야 함 (실제: ${completedResult.status}, 사유: ${completedResult.report?.category})`,
      ).toBe('success');
    }
  });

  it('5교시(네모 상자 잠그기)는 반대 방향 대각선(11,8 -> 8,10)을 그어도 똑같이 통과(success)한다', () => {
    const lesson5 = LESSONS.find((l) => l.id === 'lesson-005')!;
    const altSegments: Segment[] = [
      ...getInitialSegments(lesson5),
      [{ x: 11, y: 8 }, { x: 8, y: 10 }],
    ];
    const altResult = runLessonSim(lesson5, altSegments);
    expect(altResult.status).toBe('success');
  });
});
