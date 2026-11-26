import type { BridgeDesign } from '@linebound/domain';
import type { LevelDefinition } from '@linebound/content';

/**
 * 스테이지 지형 단면 프리뷰 (섹션 2-3 우측 대형 스테이지 프리뷰 & 4-2 모눈 스케치북 톤 통일)
 */
export function StageTerrainPreviewSvg({
  level,
  className = '',
}: {
  level: LevelDefinition;
  className?: string;
}) {
  const { width, height } = level.gridConfig;
  const pad = 1.5;
  const vbW = (width + pad * 2) * 10;
  const vbH = (height + pad * 2) * 10;

  const toX = (gx: number) => (gx + pad) * 10;
  const toY = (gy: number) => (gy + pad) * 10;

  // 좌·우 지형 시작/끝 높이 찾기 (x축 정렬 양끝 고정 핀 기준)
  const sortedAnchors = [...level.anchors].sort((a, b) => a.x - b.x);
  const leftAnchor = sortedAnchors[0];
  const rightAnchor = sortedAnchors[sortedAnchors.length - 1] ?? leftAnchor;
  const gapCells =
    leftAnchor && rightAnchor ? Math.abs(rightAnchor.x - leftAnchor.x) : 0;

  // 모눈선 배열 생성
  const vLines: number[] = [];
  for (let x = 0; x <= width; x++) vLines.push(x);
  const hLines: number[] = [];
  for (let y = 0; y <= height; y++) hLines.push(y);

  return (
    <div
      className={`relative rounded-[14px] border border-craft-border bg-craft-paper overflow-hidden ${className}`}
    >
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="w-full h-full block"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 모눈 스케치북 격자 */}
        {vLines.map((gx) => (
          <line
            key={`vx-${gx}`}
            x1={toX(gx)}
            y1={toY(0)}
            x2={toX(gx)}
            y2={toY(height)}
            stroke="var(--lb-canvas-grid)"
            strokeWidth={gx % 5 === 0 ? 0.9 : 0.45}
          />
        ))}
        {hLines.map((gy) => (
          <line
            key={`hy-${gy}`}
            x1={toX(0)}
            y1={toY(gy)}
            x2={toX(width)}
            y2={toY(gy)}
            stroke="var(--lb-canvas-grid)"
            strokeWidth={gy % 5 === 0 ? 0.9 : 0.45}
          />
        ))}

        {/* 지형 블록 */}
        {level.terrain.map((tile, idx) => (
          <g key={`tile-${idx}`}>
            <rect
              x={toX(tile.x) - 5}
              y={toY(tile.y)}
              width={10.4}
              height={vbH - toY(tile.y)}
              fill="var(--lb-subtle)"
            />
            <line
              x1={toX(tile.x) - 5}
              y1={toY(tile.y)}
              x2={toX(tile.x) + 5.2}
              y2={toY(tile.y)}
              stroke="var(--lb-ink)"
              strokeWidth={1.6}
            />
          </g>
        ))}

        {/* 출발 미니 트럭 & 도착 깃발 */}
        {leftAnchor && (
          <g transform={`translate(${toX(Math.max(1.5, leftAnchor.x - 2.6))}, ${toY(leftAnchor.y) - 6.5})`}>
            <rect x="0" y="0" width="14" height="6" rx="1.5" fill="var(--lb-primary)" />
            <rect x="9" y="-3.5" width="5" height="4" rx="1" fill="var(--lb-primary)" />
            <circle cx="3.5" cy="6.5" r="1.8" fill="var(--lb-ink)" />
            <circle cx="10.5" cy="6.5" r="1.8" fill="var(--lb-ink)" />
          </g>
        )}

        {rightAnchor && (
          <g transform={`translate(${toX(Math.min(width - 1.5, rightAnchor.x + 2.2))}, ${toY(rightAnchor.y) - 13})`}>
            <line x1="0" y1="0" x2="0" y2="13" stroke="var(--lb-ink)" strokeWidth="1.4" />
            <polygon points="0,0 10,3.5 0,7" fill="var(--lb-sage)" />
          </g>
        )}

        {/* 고정 핀 (앵커) 강조 */}
        {level.anchors.map((anchor) => (
          <g key={anchor.id}>
            <circle
              cx={toX(anchor.x)}
              cy={toY(anchor.y)}
              r={3.8}
              fill="var(--lb-amber)"
              stroke="var(--lb-surface)"
              strokeWidth={1.4}
            />
          </g>
        ))}
      </svg>

      {/* 거리 안내 캡슐 */}
      {gapCells > 0 && (
        <div className="absolute bottom-3 left-3 rounded-full bg-craft-surface/95 border border-craft-border px-3 py-1 text-xs font-bold text-craft-ink shadow-xs">
          연결 거리 {gapCells}칸 · 고정 핀 {level.anchors.length}곳
        </div>
      )}
    </div>
  );
}

/**
 * 저장된 다리 도면 미니 모양 썸네일 (섹션 6-2 통합 탭 보관함 카드용)
 */
export function MiniBridgeThumbSvg({
  design,
  className = '',
}: {
  design: Pick<BridgeDesign, 'nodes' | 'members'>;
  className?: string;
}) {
  const nodes = Array.from(design.nodes?.values?.() ?? []);
  const members = Array.from(design.members?.values?.() ?? []);

  if (nodes.length === 0 || members.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-[10px] border border-craft-border bg-craft-paper text-xs font-semibold text-craft-muted ${className}`}
      >
        빈 도면
      </div>
    );
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  }

  const spanX = Math.max(maxX - minX, 4);
  const spanY = Math.max(maxY - minY, 3);
  const pad = 1.6;
  const vbW = (spanX + pad * 2) * 10;
  const vbH = (spanY + pad * 2) * 10;

  const mapX = (x: number) => (x - minX + pad) * 10;
  const mapY = (y: number) => (y - minY + pad) * 10;

  return (
    <div
      className={`rounded-[10px] border border-craft-border bg-craft-paper overflow-hidden ${className}`}
    >
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="w-full h-full block"
        preserveAspectRatio="xMidYMid meet"
      >
        {members.map((m) => {
          const s = design.nodes.get(m.startNodeId);
          const e = design.nodes.get(m.endNodeId);
          if (!s || !e) return null;
          return (
            <line
              key={m.id}
              x1={mapX(s.x)}
              y1={mapY(s.y)}
              x2={mapX(e.x)}
              y2={mapY(e.y)}
              stroke="var(--lb-ink)"
              strokeWidth={2.4}
              strokeLinecap="round"
            />
          );
        })}
        {nodes.map((n) => (
          <circle
            key={n.id}
            cx={mapX(n.x)}
            cy={mapY(n.y)}
            r={n.nodeType === 'anchor' ? 3 : 2.1}
            fill={
              n.nodeType === 'anchor' ? 'var(--lb-amber)' : 'var(--lb-primary)'
            }
          />
        ))}
      </svg>
    </div>
  );
}
