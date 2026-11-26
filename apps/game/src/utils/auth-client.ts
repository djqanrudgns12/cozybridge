import { AuthUseCase } from '@cozybridge/application';
import { SupabaseAuthService } from '@cozybridge/infrastructure';

const metaEnv = (
  import.meta as ImportMeta & { env?: Record<string, string | undefined> }
).env;
const supabaseUrl = metaEnv?.VITE_SUPABASE_URL;
const supabaseAnonKey = metaEnv?.VITE_SUPABASE_ANON_KEY;

/**
 * 게임 전역에서 공유하는 인증 서비스 및 유스케이스 싱글톤
 * - 화면 전환(메인 메뉴 ↔ 작업실) 및 새로고침 후에도 로그인 세션과 내가 정한 별명을 유지합니다.
 */
export const appAuthService = new SupabaseAuthService(
  supabaseUrl,
  supabaseAnonKey,
  { persistSession: true },
);

export const appAuthUseCase = new AuthUseCase(appAuthService);
