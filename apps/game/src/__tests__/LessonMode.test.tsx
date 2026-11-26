import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LESSONS } from '@linebound/content';
import { ThemeProvider } from '../styles/ThemeContext';
import { LessonSelectScreen } from '../screens/LessonSelectScreen';
import { LessonCoachBar } from '../components/LessonCoachBar';
import { SimulationResultModal } from '../components/SimulationResultModal';
import { markLessonCompleted } from '../utils/lesson-progress';

describe('초등 3학년 다리 교실(수업 모드) UI 검증', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('LessonSelectScreen: 8개 교시 목록과 필터 탭이 렌더링되고 교시 선택 후 수업을 시작할 수 있다', () => {
    const handleSelectLesson = vi.fn();
    markLessonCompleted('lesson-001');

    render(
      <ThemeProvider>
        <LessonSelectScreen
          onSelectLesson={handleSelectLesson}
          onStartStages={vi.fn()}
          onBack={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('다리 교실 · 차근차근 수업 모드')).toBeDefined();
    expect(screen.getByText('완료 1 / 8교시')).toBeDefined();

    // 1교시가 완료 상태이므로 미완료 첫 교시인 2교시가 자동 포커스됨
    fireEvent.click(screen.getByText('2교시 수업 시작하기!'));
    expect(handleSelectLesson).toHaveBeenCalledWith('lesson-002');
  });

  it('LessonCoachBar: 점선 힌트 스위치, 예시 모양 보기, 처음 상태로 버튼이 동작한다', () => {
    const lesson4 = LESSONS.find((l) => l.id === 'lesson-004')!;
    const handleToggleGuide = vi.fn();
    const handleAutoComplete = vi.fn();
    const handleReset = vi.fn();

    render(
      <ThemeProvider>
        <LessonCoachBar
          lesson={lesson4}
          phase="intro"
          remainingStepCount={3}
          showGuide
          isSimulating={false}
          onToggleGuide={handleToggleGuide}
          onAutoCompleteExample={handleAutoComplete}
          onResetLesson={handleReset}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('4교시 · 아래쪽 세모(▽)')).toBeDefined();
    expect(screen.getByText('남은 점선 3개')).toBeDefined();

    fireEvent.click(screen.getByText('예시 모양 보기'));
    expect(handleAutoComplete).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('처음 상태로'));
    expect(handleReset).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('점선 힌트 켜기 및 끄기'));
    expect(handleToggleGuide).toHaveBeenCalledWith(false);
  });

  it('SimulationResultModal: 길 위 막대 충돌(road_blocked) 안내와 다리 교실 바로가기 버튼을 표시한다', () => {
    const handleOpenLesson = vi.fn();
    const handleClose = vi.fn();

    render(
      <ThemeProvider>
        <SimulationResultModal
          isOpen
          status="failure"
          failureReport={{
            category: 'road_blocked',
            eventTime: 1.2,
            nodeIds: [],
            memberIds: [],
            severity: 0.85,
            confidence: 0.98,
            playerFacingMessageKey: 'failure.road_blocked',
          }}
          buildCost={8000}
          budget={40000}
          recommendedLessonLabel="어렵다면? [3교시 · 길 비우기] 1분 연습하기"
          onRetry={vi.fn()}
          onOpenLesson={handleOpenLesson}
          onClose={handleClose}
        />
      </ThemeProvider>,
    );

    expect(
      screen.getByText('길 위에 막대가 가로막고 있어요!'),
    ).toBeDefined();
    fireEvent.click(
      screen.getByText('어렵다면? [3교시 · 길 비우기] 1분 연습하기'),
    );
    expect(handleOpenLesson).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
