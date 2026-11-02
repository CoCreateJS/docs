const fs = require("node:fs");
const path = require("node:path");
const renderTemplate = require("./template-renderer");

function slugify(value) {
    return String(value || "module")
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "module";
}

function titleize(value) {
    return String(value || "Module")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function prepareDataset(dataset) {
    if (!dataset || !Array.isArray(dataset.modules)) {
        throw new TypeError("Documentation data must include a modules array.");
    }

    const usedSlugs = new Set();
    const modules = dataset.modules.map((module) => {
        const baseSlug = slugify(module.slug || module.name || module.title);
        let slug = baseSlug;
        let suffix = 2;
        while (usedSlugs.has(slug)) slug = `${baseSlug}-${suffix++}`;
        usedSlugs.add(slug);

        const usedAnchors = new Set();
        const doclets = (Array.isArray(module.doclets) ? module.doclets : []).map((doclet) => {
            const normalized = { ...doclet };
            const isAttribute = normalized.kind === "attribute";

            if (isAttribute) {
                delete normalized.memberof;
                if (normalized.name) normalized.longname = normalized.name;
            } else if (typeof normalized.memberof === "string" && normalized.memberof.startsWith("module:")) {
                delete normalized.memberof;
                if (normalized.name) normalized.longname = normalized.name;
            }

            const baseAnchor = slugify(
                normalized.anchor ||
                (normalized.name ? `${normalized.kind}-${normalized.name}` : normalized.longname || normalized.kind)
            );
            let anchor = baseAnchor;
            let anchorSuffix = 2;
            while (usedAnchors.has(anchor)) anchor = `${baseAnchor}-${anchorSuffix++}`;
            usedAnchors.add(anchor);
            return { ...normalized, anchor };
        });

        return {
            ...module,
            slug,
            title: titleize(module.title || module.name || slug),
            doclets,
            api: doclets.filter((doclet) => doclet.kind !== "attribute"),
            declarative: doclets.filter((doclet) => doclet.kind === "attribute"),
            docletCount: doclets.length
        };
    });

    return { ...dataset, modules };
}

async function renderTargets(dataset, options = {}) {
    const { template: templateRoot, output: outputRoot, targets, renderValue } = options;
    if (!templateRoot || !outputRoot) {
        throw new TypeError("Both template and output paths are required to render documentation.");
    }
    if (!Array.isArray(targets) || !targets.length) {
        throw new TypeError("At least one documentation render target is required.");
    }
    if (typeof renderValue !== "function") {
        throw new TypeError("A CoCreate Utils renderValue function is required.");
    }

    const templateDirectory = path.resolve(templateRoot);
    const outputDirectory = path.resolve(outputRoot);
    const written = [];

    for (const [index, target] of targets.entries()) {
        if (!target || typeof target.template !== "string" || typeof target.output !== "string") {
            throw new TypeError(`Render target ${index + 1} requires template and output paths.`);
        }

        const templatePath = path.resolve(templateDirectory, target.template);
        if (!fs.existsSync(templatePath) || !fs.statSync(templatePath).isFile()) {
            throw new Error(`Documentation template not found: ${templatePath}`);
        }
        const template = fs.readFileSync(templatePath, "utf8");
        const dataPath = target.data || ".";
        const baseData = dataPath === "." ? dataset : renderTemplate.resolvePath(dataset, dataPath);
        if (!baseData || typeof baseData !== "object" || Array.isArray(baseData)) {
            throw new TypeError(`Render target ${index + 1} data path must resolve to an object.`);
        }

        let scopes = [baseData];
        if (target.each) {
            const items = renderTemplate.resolvePath(baseData, target.each);
            if (!Array.isArray(items)) {
                throw new TypeError(`Render target ${index + 1} each path must resolve to an array.`);
            }
            const alias = target.as || target.each.split(".").at(-1);
            scopes = items.map(item => ({ ...baseData, [alias]: item }));
        }

        for (const scope of scopes) {
            const relativeOutput = await renderTemplate(target.output, scope, renderValue);
            const outputPath = path.resolve(outputDirectory, relativeOutput);
            const relativeCheck = path.relative(outputDirectory, outputPath);
            if (!relativeCheck || relativeCheck.startsWith(`..${path.sep}`) || relativeCheck === ".." || path.isAbsolute(relativeCheck)) {
                throw new Error(`Render target output must be a file path inside the output directory: ${relativeOutput}`);
            }
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            fs.writeFileSync(outputPath, await renderTemplate(template, scope, renderValue));
            written.push(outputPath);
        }
    }

    return written;
}

/**
 * Render configured documentation files from CoCreate HTML templates.
 *
 * Each target selects a template and output path. Optional `data` selects an
 * object within the dataset; optional `each` renders once per array item and
 * exposes that item under `as` (or the final path segment).
 *
 * @param {Object} dataset - Documentation set returned by the CLI collector.
 * @param {Object} options - Template, output, and render target settings.
 * @param {string} options.template - Directory containing the target templates.
 * @param {string} options.output - Destination directory for generated pages.
 * @param {Object[]} options.targets - Template/output/data scope definitions.
 * @param {Function} options.renderValue - CoCreate Utils named export for value and AST interpolation.
 * @returns {string[]} Paths written by the renderer.
 */
async function renderDocumentation(dataset, options = {}) {
    const data = prepareDataset(dataset);
    return renderTargets(data, options);
}

module.exports = renderDocumentation;
module.exports.slugify = slugify;
module.exports.titleize = titleize;
module.exports.prepareDataset = prepareDataset;
module.exports.renderTemplate = renderTemplate;
module.exports.renderTargets = renderTargets;
