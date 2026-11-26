import type { BridgeDesign } from '@cozybridge/domain';
import { BridgeHubModal } from './BridgeHubModal';

interface MyDesignsModalProps {
  isOpen: boolean;
  onSelectDesign: (design: BridgeDesign) => void;
  onClose: () => void;
}

/**
 * 내 다리 보관함 모달 (BridgeHubModal 'designs' 탭 위임)
 */
export function MyDesignsModal({
  isOpen,
  onSelectDesign,
  onClose,
}: MyDesignsModalProps) {
  return (
    <BridgeHubModal
      isOpen={isOpen}
      initialTab="designs"
      onSelectDesign={onSelectDesign}
      onClose={onClose}
    />
  );
}
