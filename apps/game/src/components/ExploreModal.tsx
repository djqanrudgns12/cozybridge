import type { BridgeDesign } from '@cozybridge/domain';
import { BridgeHubModal } from './BridgeHubModal';

interface ExploreModalProps {
  isOpen: boolean;
  currentUserId?: string;
  onOpenClonedDesign: (design: BridgeDesign) => void;
  onClose: () => void;
}

/**
 * 다리 광장 모달 (BridgeHubModal 'explore' 탭 위임)
 */
export function ExploreModal({
  isOpen,
  currentUserId = 'local-user',
  onOpenClonedDesign,
  onClose,
}: ExploreModalProps) {
  return (
    <BridgeHubModal
      isOpen={isOpen}
      initialTab="explore"
      currentUserId={currentUserId}
      onSelectDesign={onOpenClonedDesign}
      onClose={onClose}
    />
  );
}
