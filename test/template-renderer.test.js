const assert = require("node:assert/strict");
const test = require("node:test");
const renderTemplate = require("../src/template-renderer");

test("renders nested native templates with their own data scopes", () => {
	const source = [
		"<h1>{{title}}</h1>",
		'<template render="modules" render-as="module">',
			"<section><h2>{{module.name}}</h2>",
			'<template render="module.doclets" render-as="doclet">',
				"<article><p>{{doclet.name}}</p>",
				'<template render="doclet.examples" render-as="example"><pre>{{example}}</pre></template>',
				"</article>",
			"</template></section>",
		"</template>"
	].join("");

	const rendered = renderTemplate(source, {
		title: "API",
		modules: [{
			name: "utils",
			doclets: [{ name: "encode", examples: ['<script>alert("x")</script>'] }]
		}]
	});

	assert.match(rendered, /<h1>API<\/h1>/);
	assert.ok(rendered.includes("<section><h2>utils</h2>"));
	assert.ok(rendered.includes("<article><p>encode</p>"));
	assert.ok(rendered.includes('<pre>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</pre>'));
	assert.ok(rendered.includes('<template render="modules" render-as="module">'));
	assert.ok(rendered.includes('<template render="module.doclets" render-as="doclet">'));
	assert.ok(rendered.includes("{{module.name}}"), "the retained template keeps its source placeholders");
});

test("escapes interpolated attributes and leaves unknown paths available for inspection", () => {
	const rendered = renderTemplate('<a href="{{item.url}}">{{item.label}} {{missing.value}}</a>', {
		item: { url: `/?q=\"<x>&`, label: "<Open>" }
	});

	assert.equal(rendered, '<a href="/?q=&quot;&lt;x&gt;&amp;">&lt;Open&gt; {{missing.value}}</a>');
});

test("validates template and data inputs", () => {
	assert.throws(() => renderTemplate(null, {}), /Template must be an HTML string/);
	assert.throws(() => renderTemplate("<p></p>", []), /Render data must be an object/);
});
