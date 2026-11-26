import type { SimulationFrame } from '@linebound/domain';

/**
 * 슬로모션 리플레이용 프레임 버퍼 (PRD 5.7)
 *
 * 최근 N초(기본 3초) 간의 시뮬레이션 프레임을 링 버퍼 형태로 저장하여
 * 메모리 무제한 증가를 방지하고 실패 순간의 재생을 보장합니다.
 */
export class ReplayBuffer {
  private readonly capacity: number;
  private readonly buffer: SimulationFrame[];
  private head: number = 0;
  private size: number = 0;

  /**
   * @param maxSeconds - 버퍼링할 최대 시간(초)
   * @param fps - 시뮬레이션 초당 프레임 수
   */
  constructor(maxSeconds: number = 3.0, fps: number = 60) {
    this.capacity = Math.ceil(maxSeconds * fps);
    this.buffer = new Array(this.capacity);
  }

  /**
   * 새 프레임을 기록합니다.
   */
  push(frame: SimulationFrame): void {
    this.buffer[this.head] = frame;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) {
      this.size++;
    }
  }

  /**
   * 시간 순서대로 정렬된 프레임 배열을 반환합니다.
   */
  getFrames(): SimulationFrame[] {
    if (this.size === 0) return [];

    const result: SimulationFrame[] = [];
    const startIndex = this.size < this.capacity ? 0 : this.head;

    for (let i = 0; i < this.size; i++) {
      const index = (startIndex + i) % this.capacity;
      result.push(this.buffer[index]!);
    }

    return result;
  }

  /**
   * 버퍼를 비웁니다.
   */
  clear(): void {
    this.head = 0;
    this.size = 0;
  }
}
