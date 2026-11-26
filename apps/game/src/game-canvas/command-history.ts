export interface MemberData {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export type EditCommand =
  | { type: 'ADD_MEMBER'; member: MemberData }
  | { type: 'DELETE_MEMBER'; member: MemberData }
  | { type: 'CLEAR_ALL'; previousMembers: MemberData[] };

/**
 * 건설 편집기 Undo / Redo 커맨드 히스토리 (PRD 6.4)
 */
export class CommandHistory {
  private undoStack: EditCommand[] = [];
  private redoStack: EditCommand[] = [];

  push(command: EditCommand): void {
    this.undoStack.push(command);
    this.redoStack = []; // 새 명령이 들어오면 Redo 스택 초기화
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(apply: (command: EditCommand, isUndo: boolean) => void): boolean {
    const command = this.undoStack.pop();
    if (!command) return false;

    apply(command, true);
    this.redoStack.push(command);
    return true;
  }

  redo(apply: (command: EditCommand, isUndo: boolean) => void): boolean {
    const command = this.redoStack.pop();
    if (!command) return false;

    apply(command, false);
    this.undoStack.push(command);
    return true;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
