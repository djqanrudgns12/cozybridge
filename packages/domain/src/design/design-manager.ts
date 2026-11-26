// ──────────────────────────────────────────────
// 설계 관리자 — 불변 패턴
// ──────────────────────────────────────────────

import type {
  BridgeDesign,
  BridgeMember,
  BridgeNode,
  NodeType,
} from '../types/bridge.js';
import type { LevelDefinition } from '../types/level.js';
import type { EntityId, GameMode, GridPoint, Visibility } from '../types/common.js';
import { calculateDistance } from '../grid/grid-math.js';
import {
  validateConnection,
  type ValidationResult,
} from '../validation/connection-validator.js';

// ── 설계 생성 파라미터 ──────────────────────

export interface CreateDesignParams {
  ownerId: EntityId;
  title: string;
  description?: string;
  mode: GameMode;
  levelId: EntityId;
  visibility?: Visibility;
}

// ── 반환 타입 ───────────────────────────────

export interface AddNodeResult {
  design: BridgeDesign;
  nodeId: EntityId;
}

export interface RemoveNodeResult {
  design: BridgeDesign;
  removedMemberIds: EntityId[];
}

export type AddMemberResult =
  | { success: true; design: BridgeDesign; memberId: EntityId }
  | { success: false; validation: ValidationResult };

// ── 함수 ────────────────────────────────────

/**
 * 새 설계를 생성한다.
 */
export function createDesign(params: CreateDesignParams): BridgeDesign {
  const now = Date.now();
  const designId = crypto.randomUUID();
  const versionId = crypto.randomUUID();

  return {
    id: designId,
    ownerId: params.ownerId,
    title: params.title,
    description: params.description ?? '',
    mode: params.mode,
    levelId: params.levelId,
    visibility: params.visibility ?? 'private',
    currentVersionId: versionId,
    nodes: new Map(),
    members: new Map(),
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
    schemaVersion: 1,
  };
}

/**
 * 노드를 추가한다.
 * 이미 같은 좌표에 노드가 있으면 에러를 던지지 않고 새 노드를 생성한다.
 * 좌표 기반 중복 방지는 getOrCreateNode를 사용할 것.
 */
export function addNode(
  design: BridgeDesign,
  point: GridPoint,
  nodeType: NodeType,
): AddNodeResult {
  const nodeId = crypto.randomUUID();
  const node: BridgeNode = {
    id: nodeId,
    x: point.x,
    y: point.y,
    nodeType,
  };

  const newNodes = new Map(design.nodes);
  newNodes.set(nodeId, node);

  return {
    design: {
      ...design,
      nodes: newNodes,
      updatedAt: Date.now(),
    },
    nodeId,
  };
}

/**
 * 노드를 제거한다.
 * 해당 노드에 연결된 모든 부재도 함께 제거한다.
 */
export function removeNode(
  design: BridgeDesign,
  nodeId: EntityId,
): RemoveNodeResult {
  const removedMemberIds: EntityId[] = [];
  const newMembers = new Map(design.members);

  // 연결된 부재 찾아서 제거
  for (const [memberId, member] of design.members) {
    if (member.startNodeId === nodeId || member.endNodeId === nodeId) {
      removedMemberIds.push(memberId);
      newMembers.delete(memberId);
    }
  }

  const newNodes = new Map(design.nodes);
  newNodes.delete(nodeId);

  return {
    design: {
      ...design,
      nodes: newNodes,
      members: newMembers,
      updatedAt: Date.now(),
    },
    removedMemberIds,
  };
}

/**
 * 부재를 추가한다.
 * 연결 검증을 통과해야 추가된다.
 * 비용은 자동 계산된다.
 */
export function addMember(
  design: BridgeDesign,
  startNodeId: EntityId,
  endNodeId: EntityId,
  level: LevelDefinition,
): AddMemberResult {
  // 검증
  const validation = validateConnection(startNodeId, endNodeId, design, level);
  if (!validation.valid) {
    return { success: false, validation };
  }

  const startNode = design.nodes.get(startNodeId)!;
  const endNode = design.nodes.get(endNodeId)!;
  const length = calculateDistance(startNode, endNode);
  const cost = length * level.unitCost;

  const memberId = crypto.randomUUID();
  const member: BridgeMember = {
    id: memberId,
    startNodeId,
    endNodeId,
    materialType: 'standard',
    cost,
  };

  const newMembers = new Map(design.members);
  newMembers.set(memberId, member);

  return {
    success: true,
    design: {
      ...design,
      members: newMembers,
      updatedAt: Date.now(),
    },
    memberId,
  };
}

/**
 * 부재를 제거한다.
 */
export function removeMember(
  design: BridgeDesign,
  memberId: EntityId,
): BridgeDesign {
  const newMembers = new Map(design.members);
  newMembers.delete(memberId);

  return {
    ...design,
    members: newMembers,
    updatedAt: Date.now(),
  };
}

/**
 * 이미 존재하는 좌표에 노드가 있으면 재사용하고,
 * 없으면 새 노드를 생성한다.
 */
export function getOrCreateNode(
  design: BridgeDesign,
  point: GridPoint,
  nodeType: NodeType = 'free',
): AddNodeResult {
  // 같은 좌표의 기존 노드 검색
  for (const [id, node] of design.nodes) {
    if (node.x === point.x && node.y === point.y) {
      return { design, nodeId: id };
    }
  }

  // 없으면 새로 생성
  return addNode(design, point, nodeType);
}
