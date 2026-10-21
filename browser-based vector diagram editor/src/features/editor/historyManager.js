export class Command {
  constructor(name = 'Action') {
    this.name = name;
  }
  execute() {}
  undo() {}
}

export class CustomCommand extends Command {
  constructor(name, executeFn, undoFn) {
    super(name);
    this.executeFn = executeFn;
    this.undoFn = undoFn;
  }

  execute() {
    if (this.executeFn) this.executeFn();
  }

  undo() {
    if (this.undoFn) this.undoFn();
  }
}

export class CreateShapesCommand extends Command {
  constructor(shapes, addShapesFn, removeShapesFn) {
    super('Add Shape');
    this.shapes = JSON.parse(JSON.stringify(shapes));
    this.addShapesFn = addShapesFn;
    this.removeShapesFn = removeShapesFn;
  }

  execute() {
    this.addShapesFn(this.shapes);
  }

  undo() {
    this.removeShapesFn(this.shapes.map(s => s.id));
  }
}

export class DeleteShapesCommand extends Command {
  constructor(shapes, addShapesFn, removeShapesFn) {
    super('Delete Shape');
    this.shapes = JSON.parse(JSON.stringify(shapes));
    this.addShapesFn = addShapesFn;
    this.removeShapesFn = removeShapesFn;
  }

  execute() {
    this.removeShapesFn(this.shapes.map(s => s.id));
  }

  undo() {
    this.addShapesFn(this.shapes);
  }
}

export class TransformShapesCommand extends Command {
  constructor(name = 'Transform Shapes', beforeStates, afterStates, applyFn) {
    super(name);
    
    this.beforeStates = JSON.parse(JSON.stringify(beforeStates));
    this.afterStates = JSON.parse(JSON.stringify(afterStates));
    this.applyFn = applyFn;
  }

  execute() {
    this.applyFn(this.afterStates);
  }

  undo() {
    this.applyFn(this.beforeStates);
  }
}

export class HistoryManager {
  constructor(maxSize = 50) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxSize = maxSize;
  }

  push(command) {
    if (!command) return;
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo() {
    if (!this.canUndo()) return null;
    const command = this.undoStack.pop();
    command.undo();
    this.redoStack.push(command);
    return command;
  }

  redo() {
    if (!this.canRedo()) return null;
    const command = this.redoStack.pop();
    command.execute();
    this.undoStack.push(command);
    return command;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }

  getLastCommandName() {
    return this.undoStack.length > 0
      ? this.undoStack[this.undoStack.length - 1].name
      : null;
  }
}
