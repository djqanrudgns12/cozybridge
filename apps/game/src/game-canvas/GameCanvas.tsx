import {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import type { LessonGuideSegment, LevelDefinition } from '@linebound/content';
import { useTheme } from '../styles/ThemeContext';
import {
  createGameCanvas,
  BuildScene,
  type PreviewOverlayInfo,
} from './build-scene';
import type { MemberData } from './command-history';

export interface GameCanvasHandle {
  getScene: () => BuildScene | null;
  loadDesignData: (
    nodes: Array<{ x: number; y: number }>,
    members: MemberData[],
  ) => void;
  setActiveTool: (tool: 'build' | 'delete') => void;
  setLessonGuide: (guides: readonly LessonGuideSegment[], show: boolean) => void;
  setLockedMemberIds: (ids: ReadonlySet<string>) => void;
}

interface GameCanvasProps {
  level?: LevelDefinition;
  gridConfig?: {
    width: number;
    height: number;
    cellSize: number;
  };
  isSimulating?: boolean;
  initialMembers?: MemberData[];
  lockedMemberIds?: ReadonlySet<string>;
  lessonGuides?: readonly LessonGuideSegment[];
  showLessonGuide?: boolean;
  initialTool?: 'build' | 'delete';
  onMemberCreated?: (member: MemberData, cost: number) => void;
  onMemberDeleted?: (member: MemberData, cost: number) => void;
}

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(
  function GameCanvas(
    {
      level,
      gridConfig = { width: 20, height: 12, cellSize: 40 },
      isSimulating = false,
      initialMembers,
      lockedMemberIds,
      lessonGuides,
      showLessonGuide = true,
      initialTool = 'build',
      onMemberCreated,
      onMemberDeleted,
    },
    ref,
  ) {
    const { theme } = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);

    const [preview, setPreview] = useState<PreviewOverlayInfo | null>(null);
    const [warningMsg, setWarningMsg] = useState<string | null>(null);

    // 최신 콜백 참조 유지 (씬 재생성 방지)
    const callbacksRef = useRef({ onMemberCreated, onMemberDeleted });
    callbacksRef.current = { onMemberCreated, onMemberDeleted };

    useImperativeHandle(ref, () => ({
      getScene: () => {
        if (!gameRef.current) return null;
        return gameRef.current.scene.getScene('BuildScene') as BuildScene;
      },
      loadDesignData: (nodes, members) => {
        const scene = gameRef.current?.scene.getScene('BuildScene') as
          | BuildScene
          | undefined;
        scene?.loadDesignData(nodes, members);
      },
      setActiveTool: (tool) => {
        const scene = gameRef.current?.scene.getScene('BuildScene') as
          | BuildScene
          | undefined;
        scene?.setActiveTool(tool);
      },
      setLessonGuide: (guides, show) => {
        const scene = gameRef.current?.scene.getScene('BuildScene') as
          | BuildScene
          | undefined;
        scene?.setLessonGuide(guides, show);
      },
      setLockedMemberIds: (ids) => {
        const scene = gameRef.current?.scene.getScene('BuildScene') as
          | BuildScene
          | undefined;
        scene?.setLockedMemberIds(ids);
      },
    }));

    useEffect(() => {
      if (!containerRef.current) return;

      if (gameRef.current) {
        gameRef.current.destroy(true);
      }

      const game = createGameCanvas({
        parent: containerRef.current,
        level,
        theme,
        grid: gridConfig,
        initialMembers,
        lockedMemberIds,
        lessonGuides,
        showLessonGuide,
        initialTool,
        onMemberCreated: (member, cost) =>
          callbacksRef.current.onMemberCreated?.(member, cost),
        onMemberDeleted: (member, cost) =>
          callbacksRef.current.onMemberDeleted?.(member, cost),
        onPreviewChange: (info) => setPreview(info),
        onBuildWarning: (msg) => {
          setWarningMsg(msg);
          window.setTimeout(() => {
            setWarningMsg((prev) => (prev === msg ? null : prev));
          }, 2200);
        },
      });

      gameRef.current = game;

      return () => {
        game.destroy(true);
        gameRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [level?.id, gridConfig.width, gridConfig.height, gridConfig.cellSize]);

    // 테마 전환 시 기존 건설 데이터를 잃지 않고 모눈 스케치북 색상만 즉시 변경
    useEffect(() => {
      const scene = gameRef.current?.scene.getScene('BuildScene') as
        | BuildScene
        | undefined;
      scene?.setTheme(theme);
    }, [theme]);

    // 수업 모드 가이드 표시 토글 즉시 반영
    useEffect(() => {
      const scene = gameRef.current?.scene.getScene('BuildScene') as
        | BuildScene
        | undefined;
      scene?.setLessonGuide(lessonGuides ?? [], showLessonGuide);
    }, [lessonGuides, showLessonGuide]);

    useEffect(() => {
      if (!lockedMemberIds) return;
      const scene = gameRef.current?.scene.getScene('BuildScene') as
        | BuildScene
        | undefined;
      scene?.setLockedMemberIds(lockedMemberIds);
    }, [lockedMemberIds]);

    return (
      <div className="relative h-full w-full overflow-hidden bg-craft-paper">
        {/* Phaser 캔버스 마운트 영역 */}
        <div
          ref={containerRef}
          className="absolute inset-0"
          style={{ cursor: 'crosshair' }}
        />

        {/* 깨짐 없는 HTML 플로팅 길이 · 비용 미리보기 배지 */}
        {preview?.visible && !isSimulating && (
          <div
            className={`pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-full border px-3 py-1 text-xs font-extrabold shadow-md whitespace-nowrap ${
              preview.isTooLong || preview.isOverBudget
                ? 'bg-craft-danger text-white border-craft-danger'
                : 'bg-craft-surface/95 text-craft-ink border-craft-border-strong'
            }`}
            style={{
              left: Math.max(80, preview.screenX),
              top: Math.max(44, preview.screenY - 14),
            }}
          >
            {preview.isTooLong
              ? `최대 ${preview.maxLength}칸까지만 이을 수 있어요`
              : preview.isOverBudget
              ? '남은 돈이 부족해요'
              : `${preview.lengthCells}칸 · ₩${preview.cost.toLocaleString()}`}
          </div>
        )}

        {/* 상단 중앙 일시 안내 캡슐 */}
        {warningMsg && (
          <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-20 rounded-full bg-craft-danger px-4 py-2 text-xs font-extrabold text-white shadow-lg">
            {warningMsg}
          </div>
        )}

        {/* 좌하단 미니멀 모눈 범례 캡슐 */}
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-3 rounded-full bg-craft-surface/92 border border-craft-border px-4 py-2 text-xs font-bold text-craft-muted shadow-xs">
          <span className="flex items-center gap-1.5 text-craft-ink">
            <span className="h-2.5 w-2.5 rounded-full bg-craft-amber" />
            고정 핀
          </span>
          <span className="text-craft-border-strong">|</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-craft-sage" />
            안전
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-craft-amber" />
            주의
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-craft-danger" />
            위험
          </span>
        </div>
      </div>
    );
  },
);
