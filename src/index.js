const extract = require('extract-comments');
const fs = require('fs');
const path = require("path")
const glob = require('glob');
const parseHtmlComments = require('parse-html-comments')
/**
 *
 * @public
 * @environment server
 */
const parseJSDoc = require("./jsdoc");
/**
 *
 * @public
 * @environment server
 */
const renderDocumentation = require("./render");

/**
 * 	"extract": {
        "directory": "./src/",
        "extensions": [
            "js",
            "css",
            "html"
        ],
        "ignores": [
            "node_modules",
            "vendor",
            "bower_components",
            "archive"
        ]
    }

 */
class ExtractComment {
    constructor() {

    }

    run(filePath, array, key) {
        let content = fs.readFileSync(filePath, 'utf8');
        let extension = path.extname(filePath)

        let comments = [];
        let docItems = [];

        if (extension == '.html') {
            comments = this.extractHtml(content)
        } else {
            comments = extract(content)
        }

        comments.forEach(({ value }) => {
            let ret_value = this.extractValue(value)
            if (ret_value) {
                docItems.push({
                    array,
                    object: {
                        [key]: ret_value,
                        extension,
                        file_path: filePath
                    },
                    metaData: filePath
                })
            }
        })
        return docItems;
    }

    extractValue(valueStr) {
        var regResult = /@value_start(?<value>.*?)@value_end/gs.exec(valueStr);
        if (regResult) {
            return regResult.groups.value.trim()
        } else {
            return null
        }
    }

    extractHtml(content) {
        let htmlComments = parseHtmlComments(content)
        let result_comment = [];

        htmlComments.matches.forEach(({ groups }) => {
            let comment_value = groups.commentOnly;
            comment_value = comment_value.replace(/<!--|-->/gs, '');

            result_comment.push({
                value: comment_value
            })
        })
        return result_comment;
    }
}

const extractInstance = new ExtractComment()

/**
 *
 * @public
 * @environment server
 */
function CoCreateExtract(directory, ignoreFolders, extensions) {
    let extensionsStr = "*";
    let ignoreFolderStr = "";

    if (extensions && extensions.length > 0) {
        extensionsStr = extensions.join(',');
    }

    if (ignoreFolders && ignoreFolders.length > 0) {
        ignoreFolderStr = ignoreFolders.join('|');
    }

    let result = [];

    if (!directory) {
        directory = ".";
    }

    const files = glob.sync(directory + `/**/*.{${extensionsStr}}`, {});

    files.forEach((file) => {
        var regex = new RegExp(ignoreFolderStr, 'g');
        if (!regex.test(file)) {
            const docData = extractInstance.run(file, 'docs', 'description');
            if (docData.length > 0) {
                const fileName = path.basename(file);
                result.push(docData)
            }
        }
    })

    return result;
}



// Keep the existing extractor as the default export while exposing JSDoc
// parsing as the structured documentation API.
CoCreateExtract.parseJSDoc = parseJSDoc;
CoCreateExtract.renderDocumentation = renderDocumentation;
/**
 *
 * @public
 * @environment server
 */
CoCreateExtract.prepareDataset = renderDocumentation.prepareDataset;
/**
 *
 * @public
 * @environment server
 */
CoCreateExtract.renderTemplate = renderDocumentation.renderTemplate;
/**
 *
 * @public
 * @environment server
 */
CoCreateExtract.renderTargets = renderDocumentation.renderTargets;

module.exports = CoCreateExtract;


/**
 * Documentation generator
 *
 * @module docs
 * @environment server
 */

/**
 * Default export contract for this module.
 *
 * @name api-default-export
 * @kind member
 * @default-export
 * @environment server
 * @example
 * ```json
 * "CommonJS constructor"
 * ```
 */
