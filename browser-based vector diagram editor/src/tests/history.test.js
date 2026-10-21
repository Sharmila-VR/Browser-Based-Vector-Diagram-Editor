import { describe, it, expect, vi } from 'vitest';
import {
  HistoryManager,
  CustomCommand,
  CreateShapesCommand,
  DeleteShapesCommand,
  TransformShapesCommand,
} from '../features/editor/historyManager.js';

describe('Undo / Redo History Stack', () => {
  it('manages undo and redo states with commands', () => {
    const history = new HistoryManager(10);
    let count = 0;

    expect(history.getLastCommandName()).toBe(null);

    const cmd = new CustomCommand('Increment', () => count++, () => count--);
    cmd.execute();
    history.push(cmd);

    expect(count).toBe(1);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
    expect(history.getLastCommandName()).toBe('Increment');

    history.undo();
    expect(count).toBe(0);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);

    history.redo();
    expect(count).toBe(1);
  });

  it('prunes history when exceeding maxSize', () => {
    const history = new HistoryManager(3);
    for (let i = 0; i < 5; i++) {
      history.push(new CustomCommand(`Action ${i}`, () => {}, () => {}));
    }
    expect(history.undoStack.length).toBe(3);
    expect(history.undoStack[0].name).toBe('Action 2');
    expect(history.undoStack[2].name).toBe('Action 4');
  });

  it('handles CreateShapesCommand execute and undo', () => {
    const shapes = [{ id: '1', type: 'rect' }];
    const addFn = vi.fn();
    const removeFn = vi.fn();

    const cmd = new CreateShapesCommand(shapes, addFn, removeFn);
    cmd.execute();
    expect(addFn).toHaveBeenCalledWith(shapes);

    cmd.undo();
    expect(removeFn).toHaveBeenCalledWith(['1']);
  });

  it('handles DeleteShapesCommand execute and undo', () => {
    const shapes = [{ id: '1', type: 'rect' }];
    const addFn = vi.fn();
    const removeFn = vi.fn();

    const cmd = new DeleteShapesCommand(shapes, addFn, removeFn);
    cmd.execute();
    expect(removeFn).toHaveBeenCalledWith(['1']);

    cmd.undo();
    expect(addFn).toHaveBeenCalledWith(shapes);
  });

  it('handles TransformShapesCommand for bulk dragged shapes', () => {
    const before = [{ id: 's1', x: 10, y: 10 }, { id: 's2', x: 20, y: 20 }];
    const after = [{ id: 's1', x: 50, y: 50 }, { id: 's2', x: 60, y: 60 }];
    const applyFn = vi.fn();

    const cmd = new TransformShapesCommand('Move Shapes', before, after, applyFn);
    cmd.execute();
    expect(applyFn).toHaveBeenCalledWith(after);

    cmd.undo();
    expect(applyFn).toHaveBeenCalledWith(before);
  });

  it('clears history stack', () => {
    const history = new HistoryManager(10);
    history.push(new CustomCommand('A', () => {}, () => {}));
    expect(history.canUndo()).toBe(true);
    history.clear();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);

    expect(history.undo()).toBe(null);
    expect(history.redo()).toBe(null);
    history.push(null);
  });
});
