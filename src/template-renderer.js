const templateTag = /^<\s*(\/?)\s*template\b/i;
const rawTextTags = new Set(["script", "style", "textarea", "title"]);

function readTag(source, start) {
    let quote = "";
    for (let index = start + 1; index < source.length; index++) {
        const character = source[index];
        if (quote) {
            if (character === quote) quote = "";
        } else if (character === "\"" || character === "'") {
            quote = character;
        } else if (character === ">") {
            return { end: index + 1, value: source.slice(start, index + 1) };
        }
    }
    return null;
}

function parseAttributes(openTag) {
    const attributes = {};
    const body = openTag.replace(/^<\s*template\b/i, "").replace(/\s*\/?\s*>$/, "");
    const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let match;
    while ((match = pattern.exec(body))) {
        attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
    }
    return attributes;
}

function findTemplateRoots(source) {
    const roots = [];
    const stack = [];
    let index = 0;
    let rawTextTag = "";

    while (index < source.length) {
        if (rawTextTag) {
            const close = new RegExp(`</\\s*${rawTextTag}\\s*>`, "ig");
            close.lastIndex = index;
            const match = close.exec(source);
            if (!match) break;
            index = match.index + match[0].length;
            rawTextTag = "";
            continue;
        }

        const start = source.indexOf("<", index);
        if (start < 0) break;
        if (source.startsWith("<!--", start)) {
            const close = source.indexOf("-->", start + 4);
            index = close < 0 ? source.length : close + 3;
            continue;
        }

        const tag = readTag(source, start);
        if (!tag) break;
        const match = templateTag.exec(tag.value);
        if (match) {
            if (match[1]) {
                const node = stack.pop();
                if (node) {
                    node.closeStart = start;
                    node.end = tag.end;
                }
            } else {
                const node = {
                    start,
                    openEnd: tag.end,
                    attributes: parseAttributes(tag.value),
                    children: [],
                    closeStart: null,
                    end: null
                };
                if (stack.length) stack[stack.length - 1].children.push(node);
                else roots.push(node);
                stack.push(node);
            }
        } else {
            const name = /^<\s*([a-z][\w:-]*)/i.exec(tag.value)?.[1]?.toLowerCase();
            if (name && rawTextTags.has(name) && !/^<\s*\//.test(tag.value)) rawTextTag = name;
        }
        index = tag.end;
    }

    return roots.filter(node => node.end !== null);
}

function resolvePath(data, path) {
    const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
    let value = data;
    for (const part of parts) {
        if (value === null || value === undefined ||
            (typeof value !== "object" && typeof value !== "function") ||
            !Object.prototype.hasOwnProperty.call(value, part)) return undefined;
        value = value[part];
    }
    return value;
}

function stringify(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

function escapeHTML(value) {
    return stringify(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function interpolate(source, data) {
    return source.replace(/\{\{\s*([\w$.[\]-]+)\s*\}\}/g, (placeholder, path) => {
        const value = resolvePath(data, path);
        return value === undefined ? placeholder : escapeHTML(value);
    });
}

function renderRegion(source, data) {
    const roots = findTemplateRoots(source);
    let output = "";
    let cursor = 0;

    for (const template of roots) {
        output += interpolate(source.slice(cursor, template.start), data);
        const renderPath = template.attributes.render;
        if (!renderPath) {
            output += source.slice(template.start, template.end);
            cursor = template.end;
            continue;
        }

        const renderAs = template.attributes["render-as"] || renderPath.split(".").at(-1);
        const value = resolvePath(data, renderPath);
        const items = Array.isArray(value) ? value
            : value === undefined || value === null ? [] : [value];
        const body = source.slice(template.openEnd, template.closeStart);

        for (const item of items) {
            const scope = { ...data, [renderAs]: item };
            output += renderRegion(body, scope);
        }

        // Keep the native template as an inert source reference in the output.
        output += source.slice(template.start, template.end);
        cursor = template.end;
    }

    return output + interpolate(source.slice(cursor), data);
}

/** Render double-curly paths and native <template render="path"> repeats. */
function renderTemplate(template, data = {}) {
    if (typeof template !== "string") throw new TypeError("Template must be an HTML string.");
    if (data === null || typeof data !== "object" || Array.isArray(data))
        throw new TypeError("Render data must be an object.");
    return renderRegion(template, data);
}

module.exports = renderTemplate;
module.exports.resolvePath = resolvePath;
