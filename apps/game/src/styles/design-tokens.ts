// Linebound 멀티 테마 디자인 토큰 & 4-2 미니멀 모눈 스케치북 캔버스 팔레트
// 기본 테마: 'craft' (0-C 소프트 크래프트 디오라마)

export type ThemeId = 'craft' | 'tactile' | 'architect' | 'night';

export interface ThemeOptionMeta {
  id: ThemeId;
  name: string;
  desc: string;
  swatchBg: string;
  swatchPrimary: string;
  swatchAccent: string;
}

export const THEME_OPTIONS: readonly ThemeOptionMeta[] = [
  {
    id: 'craft',
    name: '소프트 크래프트',
    desc: '따뜻한 크림 종이와 브릭 코랄 (기본)',
    swatchBg: '#F5F0E6',
    swatchPrimary: '#DE5438',
    swatchAccent: '#2E9E6B',
  },
  {
    id: 'tactile',
    name: '택타일 블록',
    desc: '밝은 오프화이트와 선명한 오렌지 블록',
    swatchBg: '#F7F6F2',
    swatchPrimary: '#F06529',
    swatchAccent: '#2589F5',
  },
  {
    id: 'architect',
    name: '클린 아키텍트',
    desc: '차분한 미스트 그레이와 코발트 블루 도면',
    swatchBg: '#F1F5F9',
    swatchPrimary: '#2563EB',
    swatchAccent: '#059669',
  },
  {
    id: 'night',
    name: '나이트 스케치북',
    desc: '눈이 편안한 밤하늘 다크 모눈 도면',
    swatchBg: '#0F172A',
    swatchPrimary: '#F97316',
    swatchAccent: '#38BDF8',
  },
] as const;

export interface CanvasPalette {
  paperBg: string;
  paperHex: number;
  gridMinor: number;
  gridMajor: number;
  gridDot: number;
  terrainFill: number;
  terrainTopLine: number;
  valleyFloorLine: number;
  memberBase: number;
  memberHighlight: number;
  memberPreview: number;
  memberInvalid: number;
  nodeOuter: number;
  nodeInner: number;
  anchorFill: number;
  anchorStroke: number;
  stressSafe: number;
  stressWarn: number;
  stressDanger: number;
  truckBody: number;
  truckCab: number;
  truckWheel: number;
  truckWindow: number;
  goalFlag: number;
}

/** 섹션 4-2 미니멀 모눈 스케치북 — 테마별 고대비 캔버스 팔레트 */
export const CANVAS_PALETTES: Record<ThemeId, CanvasPalette> = {
  craft: {
    paperBg: '#FAF7F0',
    paperHex: 0xfaf7f0,
    gridMinor: 0xe7dfd1,
    gridMajor: 0xd2c5af,
    gridDot: 0xc5b89f,
    terrainFill: 0xded5c4,
    terrainTopLine: 0x292524,
    valleyFloorLine: 0xc5b89f,
    memberBase: 0x292524,
    memberHighlight: 0x57534e,
    memberPreview: 0xde5438,
    memberInvalid: 0xd9383a,
    nodeOuter: 0xfffdf9,
    nodeInner: 0x292524,
    anchorFill: 0xd97706,
    anchorStroke: 0x292524,
    stressSafe: 0x2e9e6b,
    stressWarn: 0xd97706,
    stressDanger: 0xd9383a,
    truckBody: 0xde5438,
    truckCab: 0xb63d24,
    truckWheel: 0x292524,
    truckWindow: 0xfffdf9,
    goalFlag: 0x2e9e6b,
  },
  tactile: {
    paperBg: '#FCFCFA',
    paperHex: 0xfcfcfa,
    gridMinor: 0xe2e8f0,
    gridMajor: 0xcbd5e1,
    gridDot: 0x94a3b8,
    terrainFill: 0xdce3ec,
    terrainTopLine: 0x182230,
    valleyFloorLine: 0xb6c2d2,
    memberBase: 0x182230,
    memberHighlight: 0x475569,
    memberPreview: 0xf06529,
    memberInvalid: 0xe11d48,
    nodeOuter: 0xffffff,
    nodeInner: 0x182230,
    anchorFill: 0xf59e0b,
    anchorStroke: 0x182230,
    stressSafe: 0x16a34a,
    stressWarn: 0xd97706,
    stressDanger: 0xe11d48,
    truckBody: 0xf06529,
    truckCab: 0xc24613,
    truckWheel: 0x182230,
    truckWindow: 0xffffff,
    goalFlag: 0x16a34a,
  },
  architect: {
    paperBg: '#F8FAFC',
    paperHex: 0xf8fafc,
    gridMinor: 0xe2e8f0,
    gridMajor: 0xcbd5e1,
    gridDot: 0x94a3b8,
    terrainFill: 0xdbe3ee,
    terrainTopLine: 0x0f172a,
    valleyFloorLine: 0x94a3b8,
    memberBase: 0x0f172a,
    memberHighlight: 0x334155,
    memberPreview: 0x2563eb,
    memberInvalid: 0xdc2626,
    nodeOuter: 0xffffff,
    nodeInner: 0x0f172a,
    anchorFill: 0xd97706,
    anchorStroke: 0x0f172a,
    stressSafe: 0x059669,
    stressWarn: 0xd97706,
    stressDanger: 0xdc2626,
    truckBody: 0x2563eb,
    truckCab: 0x1d4ed8,
    truckWheel: 0x0f172a,
    truckWindow: 0xe0f2fe,
    goalFlag: 0x059669,
  },
  night: {
    paperBg: '#131C31',
    paperHex: 0x131c31,
    gridMinor: 0x1e2c47,
    gridMajor: 0x2d4166,
    gridDot: 0x475569,
    terrainFill: 0x1e293b,
    terrainTopLine: 0xe2e8f0,
    valleyFloorLine: 0x334155,
    memberBase: 0xe2e8f0,
    memberHighlight: 0x94a3b8,
    memberPreview: 0xf97316,
    memberInvalid: 0xfb7185,
    nodeOuter: 0x0f172a,
    nodeInner: 0x38bdf8,
    anchorFill: 0xfbbf24,
    anchorStroke: 0x0f172a,
    stressSafe: 0x34d399,
    stressWarn: 0xfbbf24,
    stressDanger: 0xfb7185,
    truckBody: 0xf97316,
    truckCab: 0xea580c,
    truckWheel: 0xf8fafc,
    truckWindow: 0x1e293b,
    goalFlag: 0x34d399,
  },
};

export const DESIGN_TOKENS = {
  colors: {
    bg: '#F5F0E6',
    surface: '#FFFDF9',
    primaryText: '#292524',
    primaryAction: '#DE5438',
    accent: '#2563EB',
    danger: '#D9383A',
    warning: '#D97706',
    success: '#2E9E6B',
  },
  radius: {
    base: 18,
    sm: 12,
    lg: 20,
  },
  spacing: {
    unit: 8,
  },
} as const;
