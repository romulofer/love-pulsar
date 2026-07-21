"use strict";
// Launches and manages a LOVE process. The spawn function is injected so the
// pure launch logic (project-root discovery, binary defaults, command building)
// and lifecycle handling are testable without actually starting a process. The
// Pulsar adapter injects a real child_process.spawn.
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoveRunner = void 0;
exports.findProjectRoot = findProjectRoot;
exports.defaultLoveBinary = defaultLoveBinary;
exports.buildRunCommand = buildRunCommand;
const fs_1 = require("fs");
const path_1 = require("path");
// Walks up from startDir to the nearest ancestor containing main.lua.
function findProjectRoot(startDir) {
    let dir = startDir;
    for (;;) {
        if ((0, fs_1.existsSync)((0, path_1.join)(dir, "main.lua")))
            return dir;
        const parent = (0, path_1.dirname)(dir);
        if (parent === dir)
            return null; // reached the filesystem root
        dir = parent;
    }
}
// Sensible per-platform default for the LOVE binary. Overridable via settings.
function defaultLoveBinary(platform) {
    switch (platform) {
        case "darwin":
            return "/Applications/love.app/Contents/MacOS/love";
        case "win32":
            return "love.exe";
        default:
            return "love"; // resolved from PATH on Linux and others
    }
}
function buildRunCommand(binary, projectRoot) {
    return { command: binary, args: [projectRoot] };
}
class LoveRunner {
    constructor(spawnFn, notifier) {
        this.spawnFn = spawnFn;
        this.notifier = notifier;
        this.child = null;
    }
    run(binary, projectRoot) {
        const { command, args } = buildRunCommand(binary, projectRoot);
        const child = this.spawnFn(command, args);
        child.on("error", (arg) => {
            const err = arg;
            if (err?.code === "ENOENT") {
                this.notifier.error(`love-pulsar: LOVE binary not found at "${command}". Set the path in settings.`);
            }
            else {
                this.notifier.error(`love-pulsar: failed to launch LOVE: ${err?.message ?? String(arg)}`);
            }
            this.child = null;
        });
        child.on("exit", () => {
            this.child = null;
        });
        this.child = child;
    }
    stop() {
        this.child?.kill();
        this.child = null;
    }
    get running() {
        return this.child !== null;
    }
}
exports.LoveRunner = LoveRunner;
//# sourceMappingURL=runner.js.map