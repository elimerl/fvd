export interface Command<T> {
    do(t: T): void;
    undo(t: T): void;
}

function addCommand<T>(cmds: Command<T>[], command: Command<T>, t: T) {
    cmds.push(command);
    command.do(t);
}
