import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MainMenu } from '../screens/MainMenu';
import { ThemeProvider } from '../styles/ThemeContext';

describe('MainMenu 컴포넌트 (1-1 리뉴얼 & 실시간 멀티 테마)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('게임 타이틀과 히어로 시작 버튼, 2×2 메뉴 타일을 올바르게 렌더링한다', () => {
    const handleNavigate = vi.fn();
    const handleSelectDesign = vi.fn();
    render(
      <ThemeProvider>
        <MainMenu
          onNavigate={handleNavigate}
          onSelectDesign={handleSelectDesign}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Cozybridge')).toBeDefined();
    expect(screen.getByText('Cozybridge 작업실')).toBeDefined();
    expect(screen.getByText('v1.0.0')).toBeDefined();
    expect(screen.getByText('바로 다리 짓기 시작!')).toBeDefined();
    expect(screen.getByText('단계별 도전')).toBeDefined();
    expect(screen.getByText('자유 만들기')).toBeDefined();
    expect(screen.getByText('내 다리 보관함')).toBeDefined();
    expect(screen.getByText('다리 광장')).toBeDefined();
  });

  it('히어로 시작 버튼 클릭 시 추천 단계 건설 화면으로 바로 이동한다', () => {
    const handleNavigate = vi.fn();
    render(
      <ThemeProvider>
        <MainMenu onNavigate={handleNavigate} onSelectDesign={vi.fn()} />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByText('바로 다리 짓기 시작!'));
    expect(handleNavigate).toHaveBeenCalledWith('build', 'level-001');
  });

  it('단계별 도전, 다리 교실(수업 모드), 자유 만들기 클릭 시 각각 해당 화면으로 이동한다', () => {
    const handleNavigate = vi.fn();
    render(
      <ThemeProvider>
        <MainMenu onNavigate={handleNavigate} onSelectDesign={vi.fn()} />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByText('다리 교실 (수업 모드)'));
    expect(handleNavigate).toHaveBeenCalledWith('lesson-select');

    fireEvent.click(screen.getByText('단계별 도전'));
    expect(handleNavigate).toHaveBeenCalledWith('stage-select');

    fireEvent.click(screen.getByText('자유 만들기'));
    expect(handleNavigate).toHaveBeenCalledWith('sandbox');
  });

  it('테마 스위처에서 다른 테마를 선택하면 data-theme과 로컬 저장소가 즉시 변경된다', () => {
    render(
      <ThemeProvider>
        <MainMenu onNavigate={vi.fn()} onSelectDesign={vi.fn()} />
      </ThemeProvider>,
    );

    expect(document.documentElement.dataset.theme).toBe('craft');

    // 테마 팝오버 열기
    const switcherBtn = screen.getByTitle('화면 테마 바꾸기');
    fireEvent.click(switcherBtn);

    // 나이트 스케치북 테마 선택
    const nightOption = screen.getByText('나이트 스케치북');
    fireEvent.click(nightOption);

    expect(document.documentElement.dataset.theme).toBe('night');
    expect(window.localStorage.getItem('cozybridge-ui-theme')).toBe('night');
  });
});
