import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '../styles/ThemeContext';
import { StageSelectScreen } from '../screens/StageSelectScreen';
import { HintModal } from '../components/HintModal';

describe('22단계 스테이지 확장 및 챕터 탭 UI 검증', () => {
  it('StageSelectScreen: 총 22개 단계(66별 만점)와 Headless UI 5개 챕터 필터 탭이 렌더링되고 전환된다', async () => {
    const handleSelectLevel = vi.fn();

    render(
      <ThemeProvider>
        <StageSelectScreen
          onSelectLevel={handleSelectLevel}
          onBack={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(await screen.findByText('모은 별 0 / 66')).toBeDefined();
    expect(screen.getByText('통과 0 / 22단계')).toBeDefined();

    // 챕터 필터 탭 확인
    expect(screen.getByText('전체 22단계')).toBeDefined();
    expect(screen.getByText('1장 · 입문 계곡 (1~5)')).toBeDefined();
    expect(screen.getByText('2장 · 강물과 언덕 (6~11)')).toBeDefined();
    expect(screen.getByText('3장 · 절벽과 통나무 (12~17)')).toBeDefined();
    expect(screen.getByText('4장 · 마스터 협곡 (18~22)')).toBeDefined();

    // 1단계 즉시 시작 가능
    fireEvent.click(screen.getByText('이 단계 다리 짓기'));
    expect(handleSelectLevel).toHaveBeenCalledWith('level-001');

    // 4장 탭 클릭 시 18~22단계가 표시되고 18단계 미리보기로 전환됨
    fireEvent.click(screen.getByText('4장 · 마스터 협곡 (18~22)'));
    expect(await screen.findByText('코지브릿지 대교')).toBeDefined();
    expect(screen.getAllByText('알뜰살뜰 예산 시험').length).toBeGreaterThanOrEqual(1);

    // 22단계 클릭 시 우측 상세 카드가 22단계 정보로 전환됨
    fireEvent.click(screen.getByText('코지브릿지 대교'));
    expect(screen.getByText('22단계')).toBeDefined();
    expect(screen.getByText('앞 단계를 먼저 통과하면 열려요!')).toBeDefined();
  });

  it('HintModal: 새로 추가된 아치 협곡(level-007) 및 최종 대교(level-012) 비법 노트가 정상 표시된다', async () => {
    const { unmount } = render(
      <ThemeProvider>
        <HintModal isOpen levelId="level-007" onClose={vi.fn()} />
      </ThemeProvider>,
    );

    expect(
      await screen.findByText('양쪽 절벽 아래 턱의 고정 핀을 활용하세요!'),
    ).toBeDefined();
    expect(
      screen.getByText('양쪽 절벽 아래 핀에서 아치 버팀대 연결!'),
    ).toBeDefined();

    fireEvent.click(screen.getByText('다음 비법'));
    expect(
      screen.getByText('무지개 모양 아치 받침대로 힘을 모아요'),
    ).toBeDefined();
    unmount();

    render(
      <ThemeProvider>
        <HintModal isOpen levelId="level-012" onClose={vi.fn()} />
      </ThemeProvider>,
    );

    expect(
      await screen.findByText(
        '중앙 바위탑을 기준으로 왼쪽·오른쪽을 나누어 공략해요!',
      ),
    ).toBeDefined();
    expect(
      screen.getByText('바위섬·바닥 고정 핀에서 기둥 올리기!'),
    ).toBeDefined();
  });
});
