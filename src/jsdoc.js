const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const jsdocPath = require.resolve("jsdoc/jsdoc.js");

/**
 * Parse JSDoc comments from JavaScript files into JSDoc doclets.
 *
 * @param {string|string[]} sources - JavaScript files or directories to parse.
 * @param {Object} [options] - Parser options.
 * @param {string} [options.cwd=process.cwd()] - Base directory for relative source paths.
 * @param {boolean} [options.recurse=false] - Recursively parse directories.
 * @param {boolean} [options.private=false] - Include symbols marked with @private.
 * @param {boolean} [options.includeUndocumented=false] - Include code symbols without JSDoc comments.
 * @param {Function} [options.onDiagnostic] - Receive JSDoc parser warnings and errors.
 * @returns {Object[]} Parsed JSDoc doclets.
 */
function parseJSDoc(sources, options = {}) {
    const sourceList = Array.isArray(sources) ? sources : [sources];
    if (!sourceList.length || sourceList.some((source) => typeof source !== "string" || !source.trim())) {
        throw new TypeError("JSDoc sources must be a path or a non-empty array of paths.");
    }

    const cwd = path.resolve(options.cwd || process.cwd());
    const sourcePaths = sourceList.map((source) => path.resolve(cwd, source));
    const missingSource = sourcePaths.find((source) => !fs.existsSync(source));
    if (missingSource) {
        throw new Error(`JSDoc source does not exist: ${missingSource}`);
    }

    const args = [jsdocPath, "-X"];
    if (options.recurse) args.push("-r");
    if (options.private) args.push("-p");
    args.push(...sourcePaths);

    const result = spawnSync(process.execPath, args, {
        cwd,
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
        windowsHide: true
    });

    if (result.error) {
        throw new Error(`Could not run JSDoc: ${result.error.message}`);
    }
    let doclets;
    try {
        doclets = JSON.parse(result.stdout || "[]");
    } catch (error) {
        if (result.status !== 0) {
            const detail = (result.stderr || result.stdout || "").trim();
            throw new Error(`JSDoc parsing failed${detail ? `: ${detail}` : "."}`);
        }
        throw new Error(`JSDoc returned invalid JSON: ${error.message}`);
    }
    if (!Array.isArray(doclets)) {
        throw new Error("JSDoc returned an unexpected JSON value.");
    }

    if (result.stderr && typeof options.onDiagnostic === "function") {
        result.stderr
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .forEach(options.onDiagnostic);
    }

    if (options.includeUndocumented) return doclets;

    // JSDoc's explain output includes AST-derived symbols without comments.
    // Keep authored JSDoc entries for the documentation data set.
    return doclets.filter((doclet) =>
        !doclet.undocumented &&
        typeof doclet.comment === "string" &&
        doclet.comment.trim()
    );
}

module.exports = parseJSDoc;
