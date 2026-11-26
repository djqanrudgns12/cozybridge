import { useState, useEffect } from 'react';
import type { BridgeDesign } from '@cozybridge/domain';
import type { UserSession } from '@cozybridge/infrastructure';
import { MainMenu } from '../screens/MainMenu';
import { StageSelectScreen } from '../screens/StageSelectScreen';
import { LessonSelectScreen } from '../screens/LessonSelectScreen';
import { BuildScreen } from '../screens/BuildScreen';
import { appAuthUseCase } from '../utils/auth-client';
import {
  resolveEffectiveStorageScope,
  resolveEffectiveUserId,
} from '../utils/user-storage';

/** 앱 화면 상태 */
export type AppScreen =
  | 'main-menu'
  | 'stage-select'
  | 'lesson-select'
  | 'lesson'
  | 'build'
  | 'sandbox';

export function App() {
  const [screen, setScreen] = useState<AppScreen>('main-menu');
  const [session, setSession] = useState<UserSession | null>(() =>
    appAuthUseCase.getActiveSessionSync(),
  );
  const [currentLevelId, setCurrentLevelId] = useState<string | null>(
    'level-001',
  );
  const [currentLessonId, setCurrentLessonId] = useState<string>('lesson-001');
  const [loadedDesign, setLoadedDesign] = useState<BridgeDesign | null>(null);

  useEffect(() => {
    void appAuthUseCase.getCurrentSession().then((s) => {
      setSession(s);
    });
  }, []);

  const activeUserId = resolveEffectiveUserId(session?.userId);
  const activeScope = resolveEffectiveStorageScope(session?.userId);
  const activeUserName = session?.displayName ?? '게스트 엔지니어';

  const handleSessionChange = (nextSession: UserSession | null) => {
    setSession(nextSession);
    setLoadedDesign(null);
  };

  const handleNavigate = (target: AppScreen, targetId?: string) => {
    if (target === 'lesson' && targetId) {
      setCurrentLessonId(targetId);
    } else if (targetId) {
      setCurrentLevelId(targetId);
    }
    setLoadedDesign(null);
    setScreen(target);
  };

  const handleSelectLoadedDesign = (design: BridgeDesign) => {
    setLoadedDesign(design);
    setCurrentLevelId(design.levelId);
    setScreen(design.mode === 'sandbox' ? 'sandbox' : 'build');
  };

  switch (screen) {
    case 'main-menu':
      return (
        <MainMenu
          session={session}
          onSessionChange={handleSessionChange}
          onNavigate={handleNavigate}
          onSelectDesign={handleSelectLoadedDesign}
        />
      );
    case 'stage-select':
      return (
        <StageSelectScreen
          key={`stages-${activeScope}`}
          currentUserId={activeUserId}
          onSelectLevel={(levelId) => handleNavigate('build', levelId)}
          onBack={() => handleNavigate('main-menu')}
        />
      );
    case 'lesson-select':
      return (
        <LessonSelectScreen
          key={`lessons-${activeScope}`}
          currentUserId={activeUserId}
          onSelectLesson={(lessonId) => handleNavigate('lesson', lessonId)}
          onStartStages={() => handleNavigate('stage-select')}
          onBack={() => handleNavigate('main-menu')}
        />
      );
    case 'lesson':
      return (
        <BuildScreen
          key={`lesson-${activeScope}-${currentLessonId}`}
          levelId={currentLessonId}
          mode="lesson"
          session={session}
          onSessionChange={handleSessionChange}
          currentUserId={activeUserId}
          currentUserName={activeUserName}
          onBack={() => handleNavigate('lesson-select')}
          onSelectNextLevel={(nextLessonId) =>
            handleNavigate('lesson', nextLessonId)
          }
          onFinishAllLessons={() => handleNavigate('stage-select')}
        />
      );
    case 'build':
      return (
        <BuildScreen
          key={`${activeScope}-${currentLevelId ?? 'stage'}-${loadedDesign?.id ?? 'fresh'}`}
          levelId={currentLevelId}
          initialDesign={loadedDesign}
          mode="stage"
          session={session}
          onSessionChange={handleSessionChange}
          currentUserId={activeUserId}
          currentUserName={activeUserName}
          onBack={() => handleNavigate('stage-select')}
          onSelectNextLevel={(nextLevelId) =>
            handleNavigate('build', nextLevelId)
          }
          onOpenLesson={(lessonId) => handleNavigate('lesson', lessonId)}
          onSelectDesign={handleSelectLoadedDesign}
        />
      );
    case 'sandbox':
      return (
        <BuildScreen
          key={`sandbox-${activeScope}-${loadedDesign?.id ?? 'fresh'}`}
          levelId={null}
          initialDesign={loadedDesign}
          mode="sandbox"
          session={session}
          onSessionChange={handleSessionChange}
          currentUserId={activeUserId}
          currentUserName={activeUserName}
          onBack={() => handleNavigate('main-menu')}
          onOpenLesson={(lessonId) => handleNavigate('lesson', lessonId)}
          onSelectDesign={handleSelectLoadedDesign}
        />
      );
    default:
      return (
        <MainMenu
          session={session}
          onSessionChange={handleSessionChange}
          onNavigate={handleNavigate}
          onSelectDesign={handleSelectLoadedDesign}
        />
      );
  }
}
