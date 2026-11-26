import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  DEFAULT_MAX_MEMBER_LENGTH,
  type EntityId,
  type GameMode,
  type GridPoint,
  type BridgeDesign,
  type FailureReport,
  type SimulationFrame,
} from '@cozybridge/domain';
import {
  LEVELS,
  LESSONS,
  getLevelById,
  getLessonById,
  getRecommendedLessonIdForFailure,
  SANDBOX_DEFAULT,
  type LevelDefinition,
} from '@cozybridge/content';
import { MatterBridgeEngine } from '@cozybridge/simulation';
import {
  SaveBridgeDesignUseCase,
  LevelProgressUseCase,
  SyncUseCase,
} from '@cozybridge/application';
import {
  IndexedDbDesignRepository,
  IndexedDbLevelProgressRepository,
  IndexedDbSyncQueueRepository,
  SyncManager,
  type UserSession,
} from '@cozybridge/infrastructure';

import { GameCanvas, type GameCanvasHandle } from '../game-canvas';
import {
  CommandHistory,
  type EditCommand,
  type MemberData,
} from '../game-canvas/command-history';
import { AuthModal } from '../components/AuthModal';
import { SimulationResultModal } from '../components/SimulationResultModal';
import { HintModal } from '../components/HintModal';
import {
  LessonCoachBar,
  type LessonCoachPhase,
} from '../components/LessonCoachBar';
import {
  BridgeHubModal,
  type BridgeHubTab,
} from '../components/BridgeHubModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ThemeSwitcher } from '../components/ui/ThemeSwitcher';
import { appAuthService, appAuthUseCase } from '../utils/auth-client';
import { markLessonCompleted } from '../utils/lesson-progress';
import {
  getUserDatabase,
  resolveEffectiveStorageScope,
  resolveEffectiveUserId,
} from '../utils/user-storage';
import {
  ArrowLeftIcon,
  BeamToolIcon,
  BulbIcon,
  EditPenIcon,
  EraserToolIcon,
  HistoryIcon,
  PlayIcon,
  RedoIcon,
  SaveCheckIcon,
  SchoolBookIcon,
  StopIcon,
  TrashIcon,
  UndoIcon,
  UserIcon,
} from '../components/ui/Icons';

interface BuildScreenProps {
  levelId: string | null;
  initialDesign?: BridgeDesign | null;
  mode: GameMode;
  session?: UserSession | null;
  onSessionChange?: (session: UserSession | null) => void;
  currentUserId?: string | null;
  currentUserName?: string;
  onBack: () => void;
  onSelectNextLevel?: (nextLevelId: string) => void;
  onOpenLesson?: (lessonId: string) => void;
  onFinishAllLessons?: () => void;
  onSelectDesign?: (design: BridgeDesign) => void;
}

type ActiveBuildTool = 'build' | 'delete';

function hasMatchingSegment(
  members: readonly MemberData[],
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): boolean {
  return members.some(
    (m) =>
      (m.startX === startX &&
        m.startY === startY &&
        m.endX === endX &&
        m.endY === endY) ||
      (m.startX === endX &&
        m.startY === endY &&
        m.endX === startX &&
        m.endY === startY),
  );
}

function computeMembersCost(members: readonly MemberData[], unitCost: number): number {
  const safeUnit = Number(unitCost) || 500;
  let sum = 0;
  for (const m of members) {
    const len = Math.hypot(
      Number(m.endX) - Number(m.startX),
      Number(m.endY) - Number(m.startY),
    );
    if (Number.isFinite(len)) sum += len * safeUnit;
  }
  return Math.round(sum);
}

function interpolateSimulationFrame(
  prev: SimulationFrame,
  curr: SimulationFrame,
  alpha: number,
): SimulationFrame {
  if (prev === curr || alpha >= 1) return curr;
  if (alpha <= 0) return prev;

  const nodePositions = new Map<EntityId, GridPoint>();
  for (const [id, currPos] of curr.nodePositions.entries()) {
    const prevPos = prev.nodePositions.get(id);
    if (prevPos) {
      nodePositions.set(id, {
        x: prevPos.x + (currPos.x - prevPos.x) * alpha,
        y: prevPos.y + (currPos.y - prevPos.y) * alpha,
      });
    } else {
      nodePositions.set(id, currPos);
    }
  }

  const memberStresses = new Map<EntityId, number>();
  for (const [id, currStress] of curr.memberStresses.entries()) {
    const prevStress = prev.memberStresses.get(id);
    memberStresses.set(
      id,
      prevStress !== undefined
        ? prevStress + (currStress - prevStress) * alpha
        : currStress,
    );
  }

  const prevAngle = prev.truckAngle ?? 0;
  const currAngle = curr.truckAngle ?? 0;

  return {
    time: prev.time + (curr.time - prev.time) * alpha,
    nodePositions,
    memberStresses,
    truckPosition: {
      x: prev.truckPosition.x + (curr.truckPosition.x - prev.truckPosition.x) * alpha,
      y: prev.truckPosition.y + (curr.truckPosition.y - prev.truckPosition.y) * alpha,
    },
    truckAngle: prevAngle + (currAngle - prevAngle) * alpha,
    brokenMemberIds: curr.brokenMemberIds,
  };
}

/**
 * 섹션 3-2 건설 작업실 HUD (스테이지 · 자유 만들기 · 다리 교실 수업 모드 통합)
 */
export function BuildScreen({
  levelId,
  initialDesign,
  mode,
  session: controlledSession,
  onSessionChange,
  currentUserId,
  currentUserName,
  onBack,
  onSelectNextLevel,
  onOpenLesson,
  onFinishAllLessons,
  onSelectDesign,
}: BuildScreenProps) {
  const canvasRef = useRef<GameCanvasHandle>(null);
  const engineRef = useRef<MatterBridgeEngine | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const commandHistoryRef = useRef<CommandHistory>(new CommandHistory());

  const currentLesson = useMemo(
    () =>
      mode === 'lesson'
        ? getLessonById(levelId ?? 'lesson-001') ?? LESSONS[0]
        : undefined,
    [levelId, mode],
  );

  const currentLevel: LevelDefinition = useMemo(() => {
    if (currentLesson) return currentLesson.level;
    if (mode === 'sandbox') return SANDBOX_DEFAULT;
    return getLevelById(levelId ?? 'level-001') ?? SANDBOX_DEFAULT;
  }, [currentLesson, levelId, mode]);

  const initialLessonMembers: MemberData[] = useMemo(() => {
    if (!currentLesson) return [];
    return currentLesson.initialMembers.map((m) => ({
      id: m.id,
      startX: m.startX,
      startY: m.startY,
      endX: m.endX,
      endY: m.endY,
    }));
  }, [currentLesson]);

  const lockedMemberIds: ReadonlySet<string> = useMemo(() => {
    if (!currentLesson) return new Set<string>();
    return new Set(
      currentLesson.initialMembers
        .filter((m) => m.locked)
        .map((m) => m.id),
    );
  }, [currentLesson]);

  const [currentDesignId, setCurrentDesignId] = useState<string>(
    initialDesign?.id ?? `design-${levelId ?? 'sandbox'}-${Date.now()}`,
  );
  const [activeTool, setActiveTool] = useState<ActiveBuildTool>(
    currentLesson?.recommendedTool ?? 'build',
  );
  const [liveMembers, setLiveMembers] = useState<MemberData[]>(initialLessonMembers);
  const [totalCost, setTotalCost] = useState<number>(() =>
    computeMembersCost(initialLessonMembers, currentLevel.unitCost),
  );
  const [memberCount, setMemberCount] = useState<number>(
    initialLessonMembers.length,
  );
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [saveStatusText, setSaveStatusText] = useState(
    mode === 'lesson' ? '연습 모드' : '자동 저장 켜짐',
  );
  const [showLessonGuide, setShowLessonGuide] = useState(true);

  // 시뮬레이션 상태
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStatus, setSimStatus] = useState<'success' | 'failure' | null>(
    null,
  );
  const [failureReport, setFailureReport] = useState<FailureReport | null>(
    null,
  );
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  // 모달 상태들
  const [internalSession, setInternalSession] = useState<UserSession | null>(
    () => appAuthUseCase.getActiveSessionSync(),
  );
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isHintModalOpen, setIsHintModalOpen] = useState(false);
  const [hubModalTab, setHubModalTab] = useState<BridgeHubTab | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [noticeModal, setNoticeModal] = useState<{
    title: string;
    description: string;
  } | null>(null);

  // 연속 실패 카운터
  const [failCount, setFailCount] = useState(0);

  const budget = currentLevel.budget;
  const isUnlimitedBudget = !Number.isFinite(budget);
  const remainingBudget = isUnlimitedBudget ? Infinity : budget - totalCost;
  const isOverBudget = !isUnlimitedBudget && remainingBudget < -1e-6;
  const maxMemberLength =
    currentLevel.maxMemberLength ?? DEFAULT_MAX_MEMBER_LENGTH;

  const remainingRatio = isUnlimitedBudget
    ? 100
    : Math.max(
        0,
        Math.min(100, Math.round((remainingBudget / Math.max(budget, 1)) * 100)),
      );

  const currentLevelIndex =
    mode === 'stage'
      ? LEVELS.findIndex((l) => l.id === currentLevel.id)
      : -1;
  const nextLevel =
    currentLevelIndex >= 0 && currentLevelIndex + 1 < LEVELS.length
      ? LEVELS[currentLevelIndex + 1]
      : undefined;

  const currentLessonIndex = currentLesson
    ? LESSONS.findIndex((l) => l.id === currentLesson.id)
    : -1;
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex + 1 < LESSONS.length
      ? LESSONS[currentLessonIndex + 1]
      : undefined;

  // 수업 모드 남은 가이드 단계 계산 (5교시는 반대쪽 대각선도 인정)
  const remainingLessonStepCount = useMemo(() => {
    if (!currentLesson) return 0;
    let remaining = 0;
    for (const seg of currentLesson.guideSegments) {
      const exists = hasMatchingSegment(
        liveMembers,
        seg.startX,
        seg.startY,
        seg.endX,
        seg.endY,
      );
      const isLesson5Alt =
        currentLesson.id === 'lesson-005' &&
        seg.action === 'add' &&
        hasMatchingSegment(liveMembers, 11, 8, 8, 10);

      if (seg.action === 'add' && !exists && !isLesson5Alt) {
        remaining++;
      } else if (seg.action === 'erase' && exists) {
        remaining++;
      }
    }
    return remaining;
  }, [currentLesson, liveMembers]);

  const lessonCoachPhase: LessonCoachPhase = useMemo(() => {
    if (simStatus === 'success') return 'succeeded';
    if (remainingLessonStepCount === 0 && !isOverBudget) return 'ready';
    if (failCount > 0) return 'failed';
    return 'intro';
  }, [failCount, isOverBudget, remainingLessonStepCount, simStatus]);

  const session =
    controlledSession !== undefined ? controlledSession : internalSession;

  const updateSession = useCallback(
    (next: UserSession | null) => {
      setInternalSession(next);
      onSessionChange?.(next);
    },
    [onSessionChange],
  );

  const effectiveUserId = resolveEffectiveUserId(
    currentUserId !== undefined ? currentUserId : session?.userId,
  );
  const effectiveScope = resolveEffectiveStorageScope(effectiveUserId);
  const effectiveUserName =
    currentUserName ?? session?.displayName ?? '게스트 엔지니어';

  // 계정 스코프별 DB 및 UseCase 인스턴스
  const { saveUseCase, progressUseCase, syncUseCase } = useMemo(() => {
    const db = getUserDatabase(effectiveUserId);
    const designRepo = new IndexedDbDesignRepository(db);
    const progressRepo = new IndexedDbLevelProgressRepository(db);
    const syncQueue = new IndexedDbSyncQueueRepository(db);
    const syncManager = new SyncManager(syncQueue, designRepo, appAuthService);
    return {
      saveUseCase: new SaveBridgeDesignUseCase(designRepo),
      progressUseCase: new LevelProgressUseCase(progressRepo),
      syncUseCase: new SyncUseCase(syncQueue, syncManager),
    };
  }, [effectiveScope, effectiveUserId]);

  useEffect(() => {
    if (controlledSession !== undefined) return;
    void appAuthUseCase.getCurrentSession().then((s) => {
      setInternalSession(s);
    });
  }, [controlledSession]);

  const syncHistoryFlags = useCallback(() => {
    setCanUndo(commandHistoryRef.current.canUndo());
    setCanRedo(commandHistoryRef.current.canRedo());
  }, []);

  const recomputeStatsFromMembers = useCallback(
    (members: MemberData[]) => {
      setLiveMembers([...members]);
      setTotalCost(computeMembersCost(members, currentLevel.unitCost));
      setMemberCount(members.length);
    },
    [currentLevel.unitCost],
  );

  // 캔버스의 실제 부재 목록으로 비용/개수를 다시 계산
  const syncStatsFromScene = useCallback(() => {
    window.setTimeout(() => {
      const data = canvasRef.current?.getScene()?.getCurrentDesignData();
      if (data) recomputeStatsFromMembers(data.members);
    }, 0);
  }, [recomputeStatsFromMembers]);

  const loadMembersIntoScene = useCallback(
    (members: MemberData[]) => {
      const nodeSet = new Map<string, { x: number; y: number }>();
      for (const a of currentLevel.anchors) {
        nodeSet.set(`${a.x},${a.y}`, { x: a.x, y: a.y });
      }
      for (const m of members) {
        nodeSet.set(`${m.startX},${m.startY}`, { x: m.startX, y: m.startY });
        nodeSet.set(`${m.endX},${m.endY}`, { x: m.endX, y: m.endY });
      }
      canvasRef.current?.loadDesignData(Array.from(nodeSet.values()), members);
      recomputeStatsFromMembers(members);
    },
    [currentLevel.anchors, recomputeStatsFromMembers],
  );

  const applyDesignToCanvas = useCallback(
    (design: BridgeDesign) => {
      const nodes = Array.from(design.nodes.values()).map((n) => ({
        x: n.x,
        y: n.y,
      }));
      const members: MemberData[] = [];
      for (const m of design.members.values()) {
        const s = design.nodes.get(m.startNodeId);
        const e = design.nodes.get(m.endNodeId);
        if (s && e) {
          members.push({
            id: m.id,
            startX: s.x,
            startY: s.y,
            endX: e.x,
            endY: e.y,
          });
        }
      }
      canvasRef.current?.loadDesignData(nodes, members);
      recomputeStatsFromMembers(members);
      setCurrentDesignId(design.id);
      commandHistoryRef.current.clear();
      syncHistoryFlags();
    },
    [recomputeStatsFromMembers, syncHistoryFlags],
  );

  // 도구 변경
  const handleToolChange = useCallback((tool: ActiveBuildTool) => {
    setActiveTool(tool);
    canvasRef.current?.setActiveTool(tool);
  }, []);

  // 수업 모드 처음 상태로 되돌리기
  const handleResetLesson = useCallback(() => {
    if (!currentLesson || isSimulating) return;
    loadMembersIntoScene(initialLessonMembers);
    commandHistoryRef.current.clear();
    syncHistoryFlags();
    setSimStatus(null);
    setFailCount(0);
    handleToolChange(currentLesson.recommendedTool);
  }, [
    currentLesson,
    handleToolChange,
    initialLessonMembers,
    isSimulating,
    loadMembersIntoScene,
    syncHistoryFlags,
  ]);

  // 수업 모드 막혔을 때 예시 모양 자동 완성
  const handleAutoCompleteLessonExample = useCallback(() => {
    if (!currentLesson || isSimulating) return;
    let nextMembers = [...initialLessonMembers];

    for (const seg of currentLesson.guideSegments) {
      if (seg.action === 'erase') {
        nextMembers = nextMembers.filter(
          (m) =>
            !(
              (m.startX === seg.startX &&
                m.startY === seg.startY &&
                m.endX === seg.endX &&
                m.endY === seg.endY) ||
              (m.startX === seg.endX &&
                m.startY === seg.endY &&
                m.endX === seg.startX &&
                m.endY === seg.startY)
            ),
        );
      } else if (
        seg.action === 'add' &&
        !hasMatchingSegment(
          nextMembers,
          seg.startX,
          seg.startY,
          seg.endX,
          seg.endY,
        )
      ) {
        nextMembers.push({
          id: `guide-${seg.startX}-${seg.startY}-${seg.endX}-${seg.endY}`,
          startX: seg.startX,
          startY: seg.startY,
          endX: seg.endX,
          endY: seg.endY,
        });
      }
    }

    loadMembersIntoScene(nextMembers);
    commandHistoryRef.current.clear();
    syncHistoryFlags();
    setShowLessonGuide(true);
  }, [
    currentLesson,
    initialLessonMembers,
    isSimulating,
    loadMembersIntoScene,
    syncHistoryFlags,
  ]);

  // 물리 엔진 초기화
  useEffect(() => {
    engineRef.current = new MatterBridgeEngine();
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      engineRef.current?.dispose();
    };
  }, []);

  // initialDesign 로드 (보관함에서 불러온 경우)
  useEffect(() => {
    if (!initialDesign) return;
    const timer = window.setTimeout(() => {
      applyDesignToCanvas(initialDesign);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [initialDesign, applyDesignToCanvas]);

  // 현재 캔버스 도면 → BridgeDesign 변환
  const buildCurrentDesign = useCallback((): BridgeDesign | null => {
    const scene = canvasRef.current?.getScene();
    if (!scene) return null;

    const data = scene.getCurrentDesignData();

    const nodeEntries = data.nodes.map(
      (
        n: { x: number; y: number },
      ): [
        string,
        { id: string; x: number; y: number; nodeType: 'anchor' | 'free' },
      ] => {
        const id = `node-${n.x}-${n.y}`;
        const isAnchor = currentLevel.anchors.some(
          (a) => a.x === n.x && a.y === n.y,
        );
        return [
          id,
          {
            id,
            x: n.x,
            y: n.y,
            nodeType: isAnchor ? 'anchor' : 'free',
          },
        ];
      },
    );

    const memberEntries = data.members.map((m: MemberData) => {
      const cost =
        Math.hypot(m.endX - m.startX, m.endY - m.startY) *
        currentLevel.unitCost;
      return [
        m.id,
        {
          id: m.id,
          startNodeId: `node-${m.startX}-${m.startY}`,
          endNodeId: `node-${m.endX}-${m.endY}`,
          materialType: 'standard' as const,
          cost,
        },
      ] as const;
    });

    return {
      id: currentDesignId,
      ownerId: effectiveUserId,
      title: `${mode === 'sandbox' ? '자유 다리' : currentLevel.title} 도면`,
      description: '',
      mode,
      levelId: currentLevel.id,
      visibility: 'private',
      currentVersionId: 'v1',
      nodes: new Map(nodeEntries),
      members: new Map(memberEntries),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'synced',
      schemaVersion: 1,
    };
  }, [currentDesignId, currentLevel, effectiveUserId, mode]);

  // 로컬 저장 (수업 모드는 임시 연습이므로 개인 보관함을 어지럽히지 않음)
  const handleSave = useCallback(
    async (isManual: boolean = true) => {
      if (mode === 'lesson') return;
      const design = buildCurrentDesign();
      if (!design) return;

      try {
        await saveUseCase.execute(design);
        if (appAuthService.isOnline()) {
          await syncUseCase.queueDesignChange(
            design.id,
            'update',
            JSON.stringify({
              title: design.title,
              updatedAt: design.updatedAt,
            }),
          );
        }
        setSaveStatusText(isManual ? '방금 저장됨' : '자동 저장됨');
      } catch (err) {
        console.error('저장 실패:', err);
        setSaveStatusText('저장 다시 시도 필요');
      }
    },
    [buildCurrentDesign, mode, saveUseCase, syncUseCase],
  );

  // 막대 생성 콜백
  const handleMemberCreated = useCallback(
    (member: MemberData, _cost: number) => {
      syncStatsFromScene();
      commandHistoryRef.current.push({
        type: 'ADD_MEMBER',
        member,
      });
      syncHistoryFlags();
      void handleSave(false);
    },
    [handleSave, syncHistoryFlags, syncStatsFromScene],
  );

  // 막대 삭제 콜백
  const handleMemberDeleted = useCallback(
    (member: MemberData, _cost: number) => {
      syncStatsFromScene();
      commandHistoryRef.current.push({
        type: 'DELETE_MEMBER',
        member,
      });
      syncHistoryFlags();
      void handleSave(false);
    },
    [handleSave, syncHistoryFlags, syncStatsFromScene],
  );

  // CommandHistory 적용 헬퍼 (Undo / Redo 공통)
  const applyHistoryCommand = useCallback(
    (command: EditCommand, isUndo: boolean) => {
      const scene = canvasRef.current?.getScene();
      if (!scene) return;
      const current = scene.getCurrentDesignData();
      let nextMembers = [...current.members];

      if (command.type === 'ADD_MEMBER') {
        if (isUndo) {
          nextMembers = nextMembers.filter((m) => m.id !== command.member.id);
        } else {
          nextMembers.push(command.member);
        }
      } else if (command.type === 'DELETE_MEMBER') {
        if (isUndo) {
          nextMembers.push(command.member);
        } else {
          nextMembers = nextMembers.filter((m) => m.id !== command.member.id);
        }
      } else if (command.type === 'CLEAR_ALL') {
        nextMembers = isUndo
          ? [...command.previousMembers]
          : current.members.filter((m) => lockedMemberIds.has(m.id));
      }

      loadMembersIntoScene(nextMembers);
      void handleSave(false);
    },
    [handleSave, loadMembersIntoScene, lockedMemberIds],
  );

  const handleUndo = useCallback(() => {
    if (isSimulating) return;
    commandHistoryRef.current.undo(applyHistoryCommand);
    syncHistoryFlags();
  }, [applyHistoryCommand, isSimulating, syncHistoryFlags]);

  const handleRedo = useCallback(() => {
    if (isSimulating) return;
    commandHistoryRef.current.redo(applyHistoryCommand);
    syncHistoryFlags();
  }, [applyHistoryCommand, isSimulating, syncHistoryFlags]);

  // 전체 지우기 실행 (수업 모드에서는 보호된 기본 막대 유지)
  const executeClearAll = useCallback(() => {
    const scene = canvasRef.current?.getScene();
    if (!scene) return;
    const prevMembers = scene.getCurrentDesignData().members;
    const erasableCount = prevMembers.filter(
      (m) => !lockedMemberIds.has(m.id),
    ).length;
    if (erasableCount === 0) return;

    commandHistoryRef.current.push({
      type: 'CLEAR_ALL',
      previousMembers: prevMembers,
    });
    scene.clearDesign();
    const afterMembers = scene.getCurrentDesignData().members;
    recomputeStatsFromMembers(afterMembers);
    syncHistoryFlags();
    void handleSave(false);
  }, [handleSave, lockedMemberIds, recomputeStatsFromMembers, syncHistoryFlags]);

  // 시뮬레이션 멈추기 / 편집 복귀
  const handleStopSimulation = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    const scene = canvasRef.current?.getScene();
    scene?.setSimulating(false);
    setIsSimulating(false);
    setIsResultModalOpen(false);
    setSimStatus(null);
  }, []);

  // 트럭 출발 시험
  const handleRunTest = useCallback(() => {
    if (isSimulating) {
      handleStopSimulation();
      return;
    }

    const scene = canvasRef.current?.getScene();
    if (!scene || !engineRef.current) return;

    const design = buildCurrentDesign();
    if (!design || design.members.size === 0) {
      setNoticeModal({
        title: '먼저 다리 막대를 이어 주세요!',
        description:
          '모눈종이 위의 노란 고정 핀을 눌러 반대편까지 막대를 1개 이상 연결해야 트럭이 출발할 수 있어요.',
      });
      return;
    }

    if ((mode === 'stage' || mode === 'lesson') && isOverBudget) {
      setNoticeModal({
        title: '쓸 수 있는 돈을 넘었어요!',
        description:
          '지우개 도구로 불필요한 막대를 줄여서 남은 돈을 0원 이상으로 맞춰 주세요.',
      });
      return;
    }

    engineRef.current.initialize(design, currentLevel);
    setIsSimulating(true);
    scene.setSimulating(true);

    const FIXED_DT = 1 / 60;
    let prevFrame = engineRef.current.getCurrentFrame();
    let currFrame = prevFrame;
    // 출발 버튼 클릭 즉시 t=0 프레임을 그려 대기 트럭과 시뮬레이션 트럭 사이 1프레임 깜빡임 제거
    scene.renderSimulationFrame(currFrame);

    let lastTimestamp = performance.now();
    let accumulator = 0;

    const runSimulationLoop = (timestamp: number) => {
      if (!engineRef.current) return;

      const rawDeltaSec = Math.max(0, (timestamp - lastTimestamp) / 1000);
      lastTimestamp = timestamp;
      accumulator += Math.min(rawDeltaSec, 0.05);

      let terminalStatus: 'success' | 'failure' | null = null;
      while (accumulator >= FIXED_DT) {
        prevFrame = currFrame;
        currFrame = engineRef.current.step(FIXED_DT);
        accumulator -= FIXED_DT;

        const stepStatus = engineRef.current.getStatus();
        if (stepStatus === 'success' || stepStatus === 'failure') {
          terminalStatus = stepStatus;
          break;
        }
      }

      if (terminalStatus === 'success') {
        scene.renderSimulationFrame(currFrame);
        setIsSimulating(false);
        setSimStatus('success');
        setFailureReport(null);
        setIsResultModalOpen(true);
        setFailCount(0);

        if (mode === 'stage') {
          void progressUseCase.completeLevel(
            currentLevel.id,
            totalCost,
            budget,
          );
        } else if (mode === 'lesson' && currentLesson) {
          markLessonCompleted(currentLesson.id, effectiveUserId);
        }
        return;
      }

      if (terminalStatus === 'failure') {
        scene.renderSimulationFrame(currFrame);
        setIsSimulating(false);
        setSimStatus('failure');
        setFailureReport(engineRef.current.getFailureReport());
        setIsResultModalOpen(true);
        setFailCount((prev) => prev + 1);
        return;
      }

      const alpha = accumulator / FIXED_DT;
      scene.renderSimulationFrame(
        interpolateSimulationFrame(prevFrame, currFrame, alpha),
      );

      animFrameIdRef.current = requestAnimationFrame(runSimulationLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(runSimulationLoop);
  }, [
    budget,
    buildCurrentDesign,
    currentLesson,
    currentLevel,
    effectiveUserId,
    handleStopSimulation,
    isOverBudget,
    isSimulating,
    mode,
    progressUseCase,
    totalCost,
  ]);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSave(true);
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'b':
          handleToolChange('build');
          break;
        case 'x':
        case 'e':
          handleToolChange('delete');
          break;
        case ' ':
          e.preventDefault();
          handleRunTest();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRedo, handleRunTest, handleSave, handleToolChange, handleUndo]);

  const recommendedLessonForFailure = useMemo(() => {
    if (mode === 'lesson') return undefined;
    const lessonIdForFail = getRecommendedLessonIdForFailure(
      failureReport?.playerFacingMessageKey,
    );
    return getLessonById(lessonIdForFail);
  }, [failureReport, mode]);

  const nextModalHandler = useMemo(() => {
    if (mode === 'lesson') {
      if (nextLesson && onSelectNextLevel) {
        return () => {
          handleStopSimulation();
          onSelectNextLevel(nextLesson.id);
        };
      }
      if (!nextLesson && onFinishAllLessons) {
        return () => {
          handleStopSimulation();
          onFinishAllLessons();
        };
      }
      return undefined;
    }

    if (nextLevel && onSelectNextLevel) {
      return () => {
        handleStopSimulation();
        onSelectNextLevel(nextLevel.id);
      };
    }
    return undefined;
  }, [
    handleStopSimulation,
    mode,
    nextLesson,
    nextLevel,
    onFinishAllLessons,
    onSelectNextLevel,
  ]);

  const nextModalLabel =
    mode === 'lesson'
      ? nextLesson
        ? `다음 ${nextLesson.order}교시로 출발!`
        : '졸업 완료! 단계별 도전 가기'
      : '다음 단계로 출발!';

  return (
    <div className="flex h-full w-full bg-craft-bg text-craft-ink select-none overflow-hidden">
      {/* ─── 섹션 3-2 좌측 단일 한글 라벨 워크벤치 패널 ─── */}
      <aside className="flex w-64 sm:w-68 shrink-0 flex-col justify-between gap-3.5 border-r-[1.5px] border-craft-border bg-craft-surface p-4 z-10 overflow-y-auto">
        <div className="flex flex-col gap-3.5">
          {/* 1. 상단 나가기 & 테마 전환 + 현재 단계 제목 */}
          <div className="flex flex-col gap-2.5 pb-3 border-b border-craft-border">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 rounded-[10px] bg-craft-bg border border-craft-border-strong px-3 py-1.5 text-xs font-extrabold text-craft-ink hover:bg-craft-subtle transition-colors cursor-pointer"
              >
                <ArrowLeftIcon size={14} />
                <span>{mode === 'lesson' ? '교실 목록' : '나가기'}</span>
              </button>
              <ThemeSwitcher compact />
            </div>

            <div className="px-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-craft-primary">
                  {mode === 'lesson' && currentLesson
                    ? currentLesson.badge
                    : mode === 'sandbox'
                    ? '자유 만들기'
                    : `${currentLevelIndex + 1}단계 도전`}
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-craft-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-craft-sage" />
                  {saveStatusText}
                </span>
              </div>
              <h1 className="mt-0.5 text-base font-extrabold text-craft-ink truncate">
                {mode === 'lesson' && currentLesson
                  ? currentLesson.title
                  : mode === 'sandbox'
                  ? '마음껏 다리 실험실'
                  : currentLevel.title}
              </h1>

              {mode !== 'lesson' && (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="mt-2 flex w-full items-center justify-between gap-2 rounded-[9px] bg-craft-bg border border-craft-border px-2.5 py-1.5 text-[11px] font-bold text-craft-ink hover:border-craft-primary transition-colors cursor-pointer"
                  title="내 별명 바꾸기 또는 계정 설정"
                >
                  <span className="flex items-center gap-1.5 min-w-0 truncate">
                    <UserIcon size={12} className="text-craft-primary shrink-0" />
                    <span className="truncate">
                      {session ? session.displayName : '내 별명 정하기'}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-craft-primary shrink-0">
                    <EditPenIcon size={11} />
                    <span>변경</span>
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* 2. 남은 돈 막대 게이지 & 막대 개수 요약 */}
          <div className="rounded-[15px] bg-craft-bg border-[1.5px] border-craft-border p-3.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-extrabold text-craft-muted">
                남은 돈
              </span>
              <span
                className={`text-lg font-extrabold ${
                  isOverBudget ? 'text-craft-danger' : 'text-craft-ink'
                }`}
              >
                {isUnlimitedBudget
                  ? '무제한'
                  : `₩${Math.round(remainingBudget).toLocaleString()}`}
              </span>
            </div>

            {!isUnlimitedBudget && (
              <div className="mt-2 h-2.5 w-full rounded-full bg-craft-subtle overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isOverBudget
                      ? 'bg-craft-danger'
                      : remainingRatio <= 25
                      ? 'bg-craft-amber'
                      : 'bg-craft-sage'
                  }`}
                  style={{ width: `${remainingRatio}%` }}
                />
              </div>
            )}

            <div className="mt-2.5 pt-2 border-t border-craft-border flex items-center justify-between text-xs font-bold text-craft-muted">
              <span>다리 막대 {memberCount}개</span>
              <span>한 번에 최대 {maxMemberLength}칸</span>
            </div>
          </div>

          {/* 3. 한글 라벨 병기 건설 도구 */}
          <div className="flex flex-col gap-2">
            <span className="px-0.5 text-xs font-extrabold text-craft-muted">
              만들기 도구
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isSimulating}
                onClick={() => handleToolChange('build')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-[14px] px-3 py-3 text-xs font-extrabold border-[1.5px] transition-all cursor-pointer disabled:opacity-45 ${
                  activeTool === 'build'
                    ? 'bg-craft-primary text-white border-craft-primary shadow-[0_2px_0_var(--cb-primary-shadow)]'
                    : 'bg-craft-bg text-craft-ink border-craft-border hover:bg-craft-subtle'
                }`}
              >
                <BeamToolIcon size={19} />
                <span>막대 잇기</span>
              </button>

              <button
                type="button"
                disabled={isSimulating}
                onClick={() => handleToolChange('delete')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-[14px] px-3 py-3 text-xs font-extrabold border-[1.5px] transition-all cursor-pointer disabled:opacity-45 ${
                  activeTool === 'delete'
                    ? 'bg-craft-danger text-white border-craft-danger shadow-[0_2px_0_rgba(0,0,0,0.2)]'
                    : 'bg-craft-bg text-craft-ink border-craft-border hover:bg-craft-subtle'
                }`}
              >
                <EraserToolIcon size={19} />
                <span>지우개</span>
              </button>
            </div>

            {/* 되돌리기 / 다시하기 / 비우기 */}
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              <button
                type="button"
                disabled={isSimulating || !canUndo}
                onClick={handleUndo}
                className="flex flex-col items-center justify-center gap-1 rounded-[12px] bg-craft-bg border border-craft-border px-2 py-2.5 text-xs font-bold text-craft-ink hover:bg-craft-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="방금 한 작업 되돌리기 (Ctrl+Z)"
              >
                <UndoIcon size={16} />
                <span>되돌리기</span>
              </button>

              <button
                type="button"
                disabled={isSimulating || !canRedo}
                onClick={handleRedo}
                className="flex flex-col items-center justify-center gap-1 rounded-[12px] bg-craft-bg border border-craft-border px-2 py-2.5 text-xs font-bold text-craft-ink hover:bg-craft-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="다시 실행하기 (Ctrl+Y)"
              >
                <RedoIcon size={16} />
                <span>다시하기</span>
              </button>

              <button
                type="button"
                disabled={isSimulating || memberCount === 0}
                onClick={() =>
                  mode === 'lesson'
                    ? handleResetLesson()
                    : setIsClearConfirmOpen(true)
                }
                className="flex flex-col items-center justify-center gap-1 rounded-[12px] bg-craft-bg border border-craft-border px-2 py-2.5 text-xs font-bold text-craft-ink hover:text-craft-danger hover:border-craft-danger/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title={
                  mode === 'lesson'
                    ? '이번 교시 처음 상태로 되돌리기'
                    : '모든 막대 지우기'
                }
              >
                <TrashIcon size={16} />
                <span>{mode === 'lesson' ? '처음 상태' : '모두 비우기'}</span>
              </button>
            </div>
          </div>

          {/* 4. 다리 비법 노트 / 다리 교실 이동 & 보관함/저장 */}
          {mode === 'lesson' ? (
            <div className="rounded-[14px] bg-craft-sage-soft/45 border border-craft-sage/35 p-3 text-xs font-semibold text-craft-ink leading-relaxed">
              <div className="flex items-center gap-1.5 font-extrabold text-craft-sage mb-1">
                <SchoolBookIcon size={14} />
                <span>꼭 기억할 약속!</span>
              </div>
              트럭이 달리는 길 위는 비워두고, 받침대는 항상 길 아래쪽(▽)에 달아주세요!
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-1 border-t border-craft-border">
              <button
                type="button"
                onClick={() => setIsHintModalOpen(true)}
                className={`w-full flex items-center justify-center gap-2 rounded-[13px] px-3.5 py-2.5 text-xs font-extrabold border-[1.5px] transition-all cursor-pointer ${
                  failCount >= 2
                    ? 'bg-craft-amber-soft text-craft-amber border-craft-amber animate-pulse'
                    : 'bg-craft-bg text-craft-ink border-craft-border hover:bg-craft-subtle'
                }`}
              >
                <BulbIcon size={16} className="text-craft-amber shrink-0" />
                <span>
                  {failCount >= 2 ? '다리 비법 노트 (추천!)' : '다리 비법 노트'}
                </span>
              </button>

              {onOpenLesson && (
                <button
                  type="button"
                  disabled={isSimulating}
                  onClick={() => onOpenLesson('lesson-004')}
                  className="w-full flex items-center justify-center gap-2 rounded-[12px] bg-craft-bg border border-craft-border px-3 py-2 text-xs font-bold text-craft-ink hover:bg-craft-subtle disabled:opacity-45 transition-colors cursor-pointer"
                >
                  <SchoolBookIcon size={15} className="text-craft-primary" />
                  <span>다리 교실 수업 듣기</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSimulating}
                  onClick={() => void handleSave(true)}
                  className="flex items-center justify-center gap-1.5 rounded-[12px] bg-craft-bg border border-craft-border px-3 py-2.5 text-xs font-bold text-craft-ink hover:bg-craft-subtle disabled:opacity-45 transition-colors cursor-pointer"
                >
                  <SaveCheckIcon size={15} />
                  <span>저장하기</span>
                </button>

                <button
                  type="button"
                  disabled={isSimulating}
                  onClick={() => setHubModalTab('versions')}
                  className="flex items-center justify-center gap-1.5 rounded-[12px] bg-craft-bg border border-craft-border px-3 py-2.5 text-xs font-bold text-craft-ink hover:bg-craft-subtle disabled:opacity-45 transition-colors cursor-pointer"
                >
                  <HistoryIcon size={15} />
                  <span>기록·보관함</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 5. 최하단 풀폭 메인 실행 버튼: [▶ 트럭 출발!] */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleRunTest}
            className={`w-full flex items-center justify-center gap-2.5 rounded-[16px] px-5 py-4 text-base font-extrabold transition-all cursor-pointer ${
              isSimulating
                ? 'bg-craft-ink text-craft-surface hover:opacity-90'
                : mode === 'lesson' && lessonCoachPhase === 'ready'
                ? 'bg-craft-sage hover:opacity-95 text-white shadow-[0_4px_0_rgba(0,0,0,0.2)] active:translate-y-0.5'
                : 'bg-craft-primary hover:bg-craft-primary-hover text-white shadow-[0_4px_0_var(--cb-primary-shadow)] active:translate-y-0.5'
            }`}
          >
            {isSimulating ? (
              <>
                <StopIcon size={16} />
                <span>시험 멈추기</span>
              </>
            ) : (
              <>
                <PlayIcon size={18} />
                <span>트럭 출발!</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ─── 우측 전면 미니멀 모눈 스케치북 캔버스 + 수업 코칭 바 ─── */}
      <main className="relative flex-1 overflow-hidden">
        <GameCanvas
          ref={canvasRef}
          level={currentLevel}
          gridConfig={currentLevel.gridConfig}
          isSimulating={isSimulating}
          initialMembers={mode === 'lesson' ? initialLessonMembers : undefined}
          lockedMemberIds={mode === 'lesson' ? lockedMemberIds : undefined}
          lessonGuides={currentLesson?.guideSegments}
          showLessonGuide={showLessonGuide}
          initialTool={currentLesson?.recommendedTool ?? 'build'}
          onMemberCreated={handleMemberCreated}
          onMemberDeleted={handleMemberDeleted}
        />

        {/* 수업 모드 전용 상단 선생님 코칭 카드 */}
        {mode === 'lesson' && currentLesson && (
          <div className="pointer-events-none absolute top-0 left-0 right-0 z-20">
            <LessonCoachBar
              lesson={currentLesson}
              phase={lessonCoachPhase}
              remainingStepCount={remainingLessonStepCount}
              showGuide={showLessonGuide}
              isSimulating={isSimulating}
              onToggleGuide={setShowLessonGuide}
              onAutoCompleteExample={handleAutoCompleteLessonExample}
              onResetLesson={handleResetLesson}
            />
          </div>
        )}
      </main>

      {/* 시험 결과 & 실패 코칭 모달 (섹션 5-3) */}
      <SimulationResultModal
        isOpen={isResultModalOpen}
        status={simStatus}
        failureReport={failureReport}
        buildCost={totalCost}
        budget={budget}
        memberCount={memberCount}
        lessonSummaryText={currentLesson?.coachOnSuccess}
        nextActionLabel={nextModalLabel}
        recommendedLessonLabel={
          recommendedLessonForFailure
            ? `어렵다면? [${recommendedLessonForFailure.badge}] 1분 연습하기`
            : undefined
        }
        onRetry={handleStopSimulation}
        onOpenHint={
          mode === 'lesson' ? undefined : () => setIsHintModalOpen(true)
        }
        onOpenLesson={
          mode !== 'lesson' && onOpenLesson && recommendedLessonForFailure
            ? () => onOpenLesson(recommendedLessonForFailure.id)
            : undefined
        }
        onNextLevel={nextModalHandler}
        onClose={handleStopSimulation}
      />

      {/* 그림 슬라이드 비법 노트 (섹션 7-3) */}
      <HintModal
        isOpen={isHintModalOpen}
        levelId={currentLevel.id}
        onClose={() => setIsHintModalOpen(false)}
      />

      {/* 통합 보관함 · 저장 기록 · 다리 광장 모달 (섹션 6-2) */}
      {mode !== 'lesson' && (
        <BridgeHubModal
          isOpen={hubModalTab !== null}
          initialTab={hubModalTab ?? 'versions'}
          currentDesign={buildCurrentDesign()}
          currentUserId={effectiveUserId}
          currentUserName={effectiveUserName}
          onSelectDesign={(design) => {
            if (
              design.levelId === currentLevel.id &&
              design.mode === mode
            ) {
              applyDesignToCanvas(design);
            } else if (onSelectDesign) {
              onSelectDesign(design);
            } else {
              applyDesignToCanvas(design);
            }
          }}
          onClose={() => setHubModalTab(null)}
        />
      )}

      {/* 작업실 내 별명 · 계정 설정 모달 */}
      {mode !== 'lesson' && (
        <AuthModal
          isOpen={isAuthModalOpen}
          initialMode={session ? 'rename' : 'auth'}
          currentSession={session}
          onLogout={() => {
            void appAuthUseCase.signOut().then(() => updateSession(null));
          }}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={(newSession) => updateSession(newSession)}
        />
      )}

      {/* 모두 비우기 일러스트 확인창 */}
      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        tone="danger"
        title="놓아둔 막대를 모두 지울까요?"
        description="처음부터 다시 만들고 싶을 때 비워요. 실수로 지워도 [되돌리기] 버튼으로 살릴 수 있어요!"
        confirmLabel="네, 모두 비울래요"
        cancelLabel="그냥 둘래요"
        onConfirm={executeClearAll}
        onClose={() => setIsClearConfirmOpen(false)}
      />

      {/* 출발 안내 알림창 */}
      <ConfirmDialog
        isOpen={noticeModal !== null}
        tone="info"
        hideCancel
        title={noticeModal?.title ?? ''}
        description={noticeModal?.description ?? ''}
        confirmLabel="알겠어요!"
        onConfirm={() => setNoticeModal(null)}
        onClose={() => setNoticeModal(null)}
      />
    </div>
  );
}
