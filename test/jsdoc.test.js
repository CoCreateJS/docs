const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const CoCreateDocs = require("../src");
const parseJSDoc = CoCreateDocs.parseJSDoc;

test("parseJSDoc returns structured documented symbols and examples", () => {
    const source = path.join(__dirname, "..", "fixtures", "jsdoc-sample.js");
    const diagnostics = [];
    const doclets = parseJSDoc(source, {
        onDiagnostic: (diagnostic) => diagnostics.push(diagnostic)
    });

    assert.equal(doclets.length, 2);
    assert.equal(doclets[0].name, "createRecord");
    assert.equal(doclets[0].kind, "function");
    assert.equal(doclets[0].description, "Creates a record from the supplied fields.");
    assert.equal(doclets[0].params[0].name, "fields");
    assert.deepEqual(doclets[0].params[0].type.names, ["Object"]);
    assert.deepEqual(doclets[0].returns[0].type.names, ["Object"]);
    assert.match(doclets[0].examples[0], /createRecord\(\{ name: "Example" \}\)/);
    assert.match(doclets[0].examples[1], /```json[\s\S]*\{"name":"Example"\}[\s\S]*```/);
    assert.equal(doclets[0].meta.filename, "jsdoc-sample.js");
    assert.equal(doclets[1].name, "sampleWithLegacyType");
    assert.ok(diagnostics.some((diagnostic) => diagnostic.includes("Unable to parse a tag's type expression")));
});

test("parseJSDoc validates its source paths", () => {
    assert.throws(() => parseJSDoc([]), /non-empty array/);
    assert.throws(() => parseJSDoc("missing-file.js"), /does not exist/);
});
