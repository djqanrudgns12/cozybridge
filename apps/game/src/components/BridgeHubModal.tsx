import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from '@headlessui/react';
import type {
  BridgeDesign,
  BridgeVersion,
  PublicDesignItem,
  ReactionType,
} from '@cozybridge/domain';
import { getLevelById } from '@cozybridge/content';
import {
  LoadBridgeDesignUseCase,
  CreateBridgeVersionUseCase,
  RestoreBridgeVersionUseCase,
  CommunityUseCase,
} from '@cozybridge/application';
import {
  CozybridgeDatabase,
  IndexedDbDesignRepository,
  CommunityRepository,
} from '@cozybridge/infrastructure';
import {
  getUserDatabase,
  resolveEffectiveStorageScope,
  resolveEffectiveUserId,
} from '../utils/user-storage';
import { MiniBridgeThumbSvg } from './ui/BridgePreviewSvg';
import {
  BulbIcon,
  CloseIcon,
  CopyWorkspaceIcon,
  FolderIcon,
  HeartIcon,
  HistoryIcon,
  SaveCheckIcon,
  TrashIcon,
} from './ui/Icons';

export type BridgeHubTab = 'designs' | 'versions' | 'explore';

export interface BridgeHubModalProps {
  isOpen: boolean;
  initialTab?: BridgeHubTab;
  /** 작업실에서 열었을 때 현재 편집 중인 다리 도면 */
  currentDesign?: BridgeDesign | null;
  currentUserId?: string;
  currentUserName?: string;
  onSelectDesign: (design: BridgeDesign) => void;
  onClose: () => void;
}

const TAB_INDEX_MAP: Record<BridgeHubTab, number> = {
  designs: 0,
  versions: 1,
  explore: 2,
};

interface ScopedDesignServices {
  designRepo: IndexedDbDesignRepository;
  loadDesignUseCase: LoadBridgeDesignUseCase;
  createVersionUseCase: CreateBridgeVersionUseCase;
  restoreVersionUseCase: RestoreBridgeVersionUseCase;
}

// 개인 도면·버전 기록은 계정 스코프별로 완전히 분리하고, 다리 광장(공개 작품)만 공유 유지
const scopedServicesCache = new Map<string, ScopedDesignServices>();
let sharedCommunityUseCase: CommunityUseCase | null = null;

function getHubServices(userId?: string | null) {
  const scope = resolveEffectiveStorageScope(userId);
  let userServices = scopedServicesCache.get(scope);
  if (!userServices) {
    const userDb = getUserDatabase(userId);
    const designRepo = new IndexedDbDesignRepository(userDb);
    const createVersionUseCase = new CreateBridgeVersionUseCase(designRepo);
    userServices = {
      designRepo,
      loadDesignUseCase: new LoadBridgeDesignUseCase(designRepo),
      createVersionUseCase,
      restoreVersionUseCase: new RestoreBridgeVersionUseCase(
        designRepo,
        createVersionUseCase,
      ),
    };
    scopedServicesCache.set(scope, userServices);
  }

  if (!sharedCommunityUseCase) {
    const publicDb = new CozybridgeDatabase('cozybridge_public_community_db');
    const communityRepo = new CommunityRepository(publicDb);
    sharedCommunityUseCase = new CommunityUseCase(communityRepo);
  }

  return {
    ...userServices,
    communityUseCase: sharedCommunityUseCase,
  };
}

function formatFriendlyTime(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStageBadgeText(mode: string, levelId: string): string {
  if (mode === 'sandbox' || levelId === 'sandbox-default') {
    return '자유 만들기';
  }
  const found = getLevelById(levelId);
  return found ? found.title : levelId;
}

/**
 * 섹션 6-2 Headless UI TabGroup 기반 통합 다리 보관함 · 저장 기록 · 다리 광장 모달
 */
export function BridgeHubModal({
  isOpen,
  initialTab = 'designs',
  currentDesign = null,
  currentUserId,
  currentUserName = '게스트 엔지니어',
  onSelectDesign,
  onClose,
}: BridgeHubModalProps) {
  const effectiveUserId = resolveEffectiveUserId(currentUserId);
  const [selectedIndex, setSelectedIndex] = useState<number>(
    TAB_INDEX_MAP[initialTab],
  );
  const [designs, setDesigns] = useState<BridgeDesign[]>([]);
  const [versions, setVersions] = useState<BridgeVersion[]>([]);
  const [publicItems, setPublicItems] = useState<PublicDesignItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 인라인 삭제 확인 대상 ID (브라우저 confirm 대체)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // 방금 광장에 올린 설계 ID 피드백
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());
  // 안내 토스트 문구
  const [noticeText, setNoticeText] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNoticeText(msg);
    window.setTimeout(() => {
      setNoticeText((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const svc = getHubServices(effectiveUserId);
      const [savedList, pubList] = await Promise.all([
        svc.loadDesignUseCase.getAllDesigns(),
        svc.communityUseCase.getPublicDesigns(),
      ]);
      setDesigns(savedList);
      setPublicItems(pubList);

      if (currentDesign) {
        const verList = await svc.restoreVersionUseCase.getVersions(
          currentDesign.id,
        );
        setVersions(verList);
      } else {
        setVersions([]);
      }
    } catch (err) {
      console.error('보관함 데이터 불러오기 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDesign, effectiveUserId]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(TAB_INDEX_MAP[initialTab]);
      setConfirmDeleteId(null);
      setNoticeText(null);
      void refreshAll();
    }
  }, [isOpen, initialTab, refreshAll]);

  const handleDeleteDesign = async (designId: string) => {
    const svc = getHubServices(effectiveUserId);
    await svc.designRepo.delete(designId);
    setConfirmDeleteId(null);
    await refreshAll();
    showNotice('선택한 다리 도면을 정리했어요.');
  };

  const handlePublishDesign = async (design: BridgeDesign) => {
    const svc = getHubServices(effectiveUserId);
    await svc.communityUseCase.publishDesign(design, currentUserName);
    setPublishedIds((prev) => new Set([...prev, design.id]));
    await refreshAll();
    showNotice('다리 광장에 내 작품을 올렸어요!');
  };

  const handleCreateSnapshot = async () => {
    if (!currentDesign) return;
    if (currentDesign.members.size === 0) {
      showNotice('막대를 1개 이상 연결한 뒤에 기록할 수 있어요.');
      return;
    }
    const svc = getHubServices(effectiveUserId);
    await svc.createVersionUseCase.execute(currentDesign);
    const verList = await svc.restoreVersionUseCase.getVersions(
      currentDesign.id,
    );
    setVersions(verList);
    showNotice(`기록 #${verList.length} 저장 완료!`);
  };

  const handleRestoreSnapshot = async (versionId: string) => {
    if (!currentDesign) return;
    const svc = getHubServices(effectiveUserId);
    const restored = await svc.restoreVersionUseCase.execute(
      currentDesign.id,
      versionId,
    );
    onSelectDesign(restored);
    onClose();
  };

  const handleClonePublic = async (item: PublicDesignItem) => {
    try {
      const svc = getHubServices(effectiveUserId);
      const cloned = await svc.communityUseCase.cloneDesign(
        item.id,
        effectiveUserId,
      );
      await svc.designRepo.save(cloned);
      onSelectDesign(cloned);
      onClose();
    } catch (err) {
      console.error('작품 복사 실패:', err);
      showNotice('작품을 복사하는 중 문제가 생겼어요.');
    }
  };

  const handleToggleReaction = async (
    itemId: string,
    reaction: ReactionType,
  ) => {
    const svc = getHubServices(effectiveUserId);
    await svc.communityUseCase.toggleReaction(itemId, effectiveUserId, reaction);
    const pubList = await svc.communityUseCase.getPublicDesigns();
    setPublicItems(pubList);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div
        className="fixed inset-0 backdrop-blur-[2px] transition-opacity"
        style={{ backgroundColor: 'var(--cb-backdrop)' }}
      />

      <div className="fixed inset-0 flex items-center justify-center p-5">
        <DialogPanel className="flex flex-col w-full max-w-2xl max-h-[85vh] rounded-[20px] bg-craft-surface border-[1.5px] border-craft-border p-6 shadow-2xl text-craft-ink overflow-hidden">
          {/* 상단 제목 바 */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-craft-border shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-craft-subtle text-craft-ink border border-craft-border">
                <FolderIcon size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg font-extrabold text-craft-ink truncate">
                    다리 보관함 · 광장
                  </DialogTitle>
                  <span className="rounded-full bg-craft-bg border border-craft-border px-2.5 py-0.5 text-[11px] font-bold text-craft-ink">
                    내 별명: {currentUserName}
                  </span>
                </div>
                <p className="text-xs text-craft-muted">
                  내가 만든 다리를 불러오거나 친구들의 작품을 구경해 보세요
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-craft-muted hover:bg-craft-subtle hover:text-craft-ink transition-colors cursor-pointer"
              title="닫기"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          {/* 상단 인라인 알림 배너 */}
          {noticeText && (
            <div className="mt-3 rounded-[12px] bg-craft-sage-soft border border-craft-sage/30 px-4 py-2.5 text-xs font-bold text-craft-sage shrink-0">
              {noticeText}
            </div>
          )}

          {/* Headless UI TabGroup */}
          <TabGroup
            selectedIndex={selectedIndex}
            onChange={setSelectedIndex}
            className="flex flex-col flex-1 min-h-0 pt-4"
          >
            <TabList className="grid grid-cols-3 gap-1.5 rounded-[14px] bg-craft-bg border border-craft-border p-1.5 shrink-0">
              <Tab className="rounded-[10px] px-4 py-2.5 text-xs font-extrabold text-craft-muted data-selected:bg-craft-surface data-selected:text-craft-ink data-selected:shadow-xs data-selected:border data-selected:border-craft-border hover:text-craft-ink focus:outline-none transition-all cursor-pointer">
                내 다리 ({designs.length})
              </Tab>
              <Tab className="rounded-[10px] px-4 py-2.5 text-xs font-extrabold text-craft-muted data-selected:bg-craft-surface data-selected:text-craft-ink data-selected:shadow-xs data-selected:border data-selected:border-craft-border hover:text-craft-ink focus:outline-none transition-all cursor-pointer">
                저장 기록 {currentDesign ? `(${versions.length})` : ''}
              </Tab>
              <Tab className="rounded-[10px] px-4 py-2.5 text-xs font-extrabold text-craft-muted data-selected:bg-craft-surface data-selected:text-craft-ink data-selected:shadow-xs data-selected:border data-selected:border-craft-border hover:text-craft-ink focus:outline-none transition-all cursor-pointer">
                다리 광장 ({publicItems.length})
              </Tab>
            </TabList>

            <TabPanels className="flex-1 min-h-0 overflow-y-auto pt-4 pr-1">
              {/* ─── 탭 1: 내 다리 ─── */}
              <TabPanel className="flex flex-col gap-3 focus:outline-none">
                {loading ? (
                  <div className="py-12 text-center text-sm font-semibold text-craft-muted">
                    보관함을 여는 중이에요...
                  </div>
                ) : designs.length === 0 ? (
                  <div className="rounded-[16px] bg-craft-bg border border-craft-border p-8 text-center">
                    <p className="text-sm font-bold text-craft-ink">
                      아직 저장한 다리가 없어요
                    </p>
                    <p className="mt-1.5 text-xs text-craft-muted">
                      작업실에서 다리를 만들고 [저장하기]를 누르면 이곳에 차곡차곡 모입니다.
                    </p>
                  </div>
                ) : (
                  designs.map((design) => {
                    const isConfirmingDelete = confirmDeleteId === design.id;
                    const isPublished = publishedIds.has(design.id);

                    return (
                      <div
                        key={design.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[16px] bg-craft-bg border-[1.5px] border-craft-border hover:border-craft-border-strong p-4 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <MiniBridgeThumbSvg
                            design={design}
                            className="w-24 h-16 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-extrabold text-craft-ink truncate">
                                {design.title}
                              </span>
                              <span className="rounded-full bg-craft-surface border border-craft-border px-2.5 py-0.5 text-xs font-bold text-craft-muted">
                                {getStageBadgeText(design.mode, design.levelId)}
                              </span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-craft-muted">
                              <span>막대 {design.members.size}개</span>
                              <span>·</span>
                              <span>{formatFriendlyTime(design.updatedAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 shrink-0">
                          {isConfirmingDelete ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-[10px] bg-craft-surface border border-craft-border px-3 py-2 text-xs font-bold text-craft-ink hover:bg-craft-subtle cursor-pointer"
                              >
                                취소
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteDesign(design.id)}
                                className="rounded-[10px] bg-craft-danger px-3 py-2 text-xs font-extrabold text-white cursor-pointer"
                              >
                                정말 지우기
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(design.id)}
                                className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-craft-surface border border-craft-border text-craft-muted hover:text-craft-danger hover:border-craft-danger/40 transition-colors cursor-pointer"
                                title="도면 지우기"
                              >
                                <TrashIcon size={16} />
                              </button>
                              {design.members.size > 0 && (
                                <button
                                  type="button"
                                  disabled={isPublished}
                                  onClick={() => void handlePublishDesign(design)}
                                  className="rounded-[10px] bg-craft-surface border border-craft-border-strong px-3 py-2 text-xs font-bold text-craft-ink hover:bg-craft-subtle disabled:opacity-60 transition-colors cursor-pointer"
                                >
                                  {isPublished ? '자랑 완료' : '광장에 자랑'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectDesign(design);
                                  onClose();
                                }}
                                className="rounded-[10px] bg-craft-primary hover:bg-craft-primary-hover px-4 py-2 text-xs font-extrabold text-white shadow-[0_2px_0_var(--cb-primary-shadow)] active:translate-y-0.5 transition-all cursor-pointer"
                              >
                                불러오기
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </TabPanel>

              {/* ─── 탭 2: 저장 기록 (버전 스냅샷) ─── */}
              <TabPanel className="flex flex-col gap-3 focus:outline-none">
                {!currentDesign ? (
                  <div className="rounded-[16px] bg-craft-bg border border-craft-border p-8 text-center">
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-[12px] bg-craft-surface border border-craft-border text-craft-muted">
                      <HistoryIcon size={20} />
                    </div>
                    <p className="text-sm font-bold text-craft-ink">
                      다리 작업실에서 사용할 수 있어요
                    </p>
                    <p className="mt-1.5 text-xs text-craft-muted leading-relaxed">
                      다리를 짓는 도중 마음에 드는 모습을 기록해 두면, 언제든 그 순간으로 되돌아갈 수 있어요.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[16px] bg-craft-bg border border-craft-border p-4">
                      <div>
                        <div className="text-sm font-extrabold text-craft-ink">
                          지금 만들고 있는 다리 모습 남기기
                        </div>
                        <p className="text-xs text-craft-muted mt-0.5">
                          실수해도 걱정 없도록 현재 다리 모양을 새 기록으로 남겨 둡니다.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleCreateSnapshot()}
                        className="flex items-center justify-center gap-1.5 rounded-[12px] bg-craft-sage px-4 py-2.5 text-xs font-extrabold text-white hover:opacity-95 shrink-0 cursor-pointer"
                      >
                        <SaveCheckIcon size={16} />
                        <span>새 기록 남기기</span>
                      </button>
                    </div>

                    {versions.length === 0 ? (
                      <div className="rounded-[16px] bg-craft-bg border border-craft-border p-7 text-center text-xs text-craft-muted">
                        아직 남겨 둔 기록이 없어요. 위의 [새 기록 남기기] 버튼을 눌러 보세요!
                      </div>
                    ) : (
                      versions
                        .slice()
                        .reverse()
                        .map((ver) => (
                          <div
                            key={ver.id}
                            className="flex items-center justify-between gap-4 rounded-[16px] bg-craft-bg border-[1.5px] border-craft-border p-4"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <MiniBridgeThumbSvg
                                design={ver.snapshot}
                                className="w-24 h-16 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-extrabold text-craft-ink">
                                  기록 #{ver.versionNumber}
                                </div>
                                <div className="mt-1 text-xs text-craft-muted">
                                  막대 {ver.snapshot.members.size}개 ·{' '}
                                  {formatFriendlyTime(ver.createdAt)}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => void handleRestoreSnapshot(ver.id)}
                              className="rounded-[10px] bg-craft-surface border-[1.5px] border-craft-border-strong px-3.5 py-2 text-xs font-extrabold text-craft-ink hover:bg-craft-subtle shrink-0 cursor-pointer"
                            >
                              이 모습으로 열기
                            </button>
                          </div>
                        ))
                    )}
                  </>
                )}
              </TabPanel>

              {/* ─── 탭 3: 다리 광장 (공개 작품 탐색 & 복제) ─── */}
              <TabPanel className="flex flex-col gap-3 focus:outline-none">
                {publicItems.length === 0 ? (
                  <div className="rounded-[16px] bg-craft-bg border border-craft-border p-8 text-center text-sm text-craft-muted">
                    아직 다리 광장에 올라온 작품이 없어요.
                  </div>
                ) : (
                  publicItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3.5 rounded-[16px] bg-craft-bg border-[1.5px] border-craft-border p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <MiniBridgeThumbSvg
                            design={item.snapshot}
                            className="w-28 h-18 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-base font-extrabold text-craft-ink truncate">
                                {item.title}
                              </span>
                              <span className="rounded-full bg-craft-surface border border-craft-border px-2.5 py-0.5 text-xs font-bold text-craft-primary">
                                {getStageBadgeText('stage', item.levelId)}
                              </span>
                            </div>
                            {item.description && (
                              <p className="mt-1 text-xs text-craft-muted line-clamp-2 leading-relaxed">
                                {item.description}
                              </p>
                            )}
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-craft-muted">
                              <span>
                                만든이 <b className="text-craft-ink">{item.authorName}</b>
                              </span>
                              <span>·</span>
                              <span>막대 {item.memberCount}개</span>
                              <span>·</span>
                              <span>₩{Math.round(item.buildCost).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleClonePublic(item)}
                          className="flex items-center justify-center gap-1.5 rounded-[12px] bg-craft-primary hover:bg-craft-primary-hover px-4 py-2.5 text-xs font-extrabold text-white shadow-[0_2px_0_var(--cb-primary-shadow)] active:translate-y-0.5 shrink-0 transition-all cursor-pointer"
                        >
                          <CopyWorkspaceIcon size={15} />
                          <span>내 작업실로 복사</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-craft-border/70">
                        <button
                          type="button"
                          onClick={() => void handleToggleReaction(item.id, 'like')}
                          className="flex items-center gap-1.5 rounded-[10px] bg-craft-surface border border-craft-border px-3 py-1.5 text-xs font-bold text-craft-ink hover:border-craft-danger hover:text-craft-danger transition-colors cursor-pointer"
                        >
                          <HeartIcon size={14} />
                          <span>멋져요 {item.reactionCounts.like}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleToggleReaction(item.id, 'creative')
                          }
                          className="flex items-center gap-1.5 rounded-[10px] bg-craft-surface border border-craft-border px-3 py-1.5 text-xs font-bold text-craft-ink hover:border-craft-amber hover:text-craft-amber transition-colors cursor-pointer"
                        >
                          <BulbIcon size={14} />
                          <span>기발해요 {item.reactionCounts.creative}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </TabPanel>
            </TabPanels>
          </TabGroup>

          {/* 하단 닫기 버튼 */}
          <div className="mt-4 pt-3 border-t border-craft-border flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[12px] bg-craft-bg border-[1.5px] border-craft-border-strong px-5 py-2.5 text-xs font-extrabold text-craft-ink hover:bg-craft-subtle transition-colors cursor-pointer"
            >
              닫기
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
