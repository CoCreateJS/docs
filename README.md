# CoCreate-docs

Documentation generator Take it for a spin in our [playground!](https://CoCreateJS.com/docs/docs)

![minified](https://img.badgesize.io/https://cdn.CoCreateJS.com/docs/latest/CoCreate-docs.min.js?style=flat-square&label=minified&color=orange)
![gzip](https://img.badgesize.io/https://cdn.CoCreateJS.com/docs/latest/CoCreate-docs.min.js?compression=gzip&style=flat-square&label=gzip&color=yellow)
![brotli](https://img.badgesize.io/https://cdn.CoCreateJS.com/docs/latest/CoCreate-docs.min.js?compression=brotli&style=flat-square&label=brotli)
![GitHub latest release](https://img.shields.io/github/v/release/CoCreate-app/CoCreate-docs?style=flat-square)
![License](https://img.shields.io/github/license/CoCreate-app/CoCreate-docs?style=flat-square)
![Hiring](https://img.shields.io/static/v1?style=flat-square&label=&message=Hiring&color=blueviolet)

![CoCreate-docs](https://cdn.CoCreateJS.com/docs/CoCreate-docs.gif)

## [Docs & Demo](https://CoCreateJS.com/docs/docs)

For a complete guide and working demo refer to the [doumentation](https://CoCreateJS.com/docs/docs)

## CDN

```html
<script src="https://cdn.CoCreateJS.com/docs/latest/CoCreate-docs.min.js"></script>
```

```html
<script src="https://cdn.CoCreateJS.com/docs/latest/CoCreate-docs.min.css"></script>
```

## NPM

```shell
$ npm i @cocreate/docs
```

## yarn

```shell
$ yarn install @cocreate/docs
```

## Parse JSDoc

The CommonJS export keeps `CoCreateExtract` as the default function and exposes
`parseJSDoc` for structured JSDoc parsing. It returns documented JSDoc doclets.
`renderDocumentation` consumes the CLI's documentation dataset and writes an
index page plus one page per module from CoCreate HTML templates.

```js
const CoCreateDocs = require("@cocreate/docs");

const doclets = CoCreateDocs.parseJSDoc("./src", {
	recurse: true,
	private: false,
	onDiagnostic: (message) => console.warn(message)
});
```

Templates are files in the configured `documentation.template` directory. The
CLI resolves `documentation.template`, `documentation.output`, and target paths
relative to the active `CoCreate.config.js`. Data is rendered into static HTML;
no standalone JSON manifest is written.

The returned dataset is the CoCreate data object itself, with `type`,
`schemaVersion`, `errors`, and `modules` at its top level. Each module record
keeps its metadata flat and contains its JSDoc `doclets` and parser
`diagnostics`. The renderer adds slugs, display titles, and doclet anchors. It
renders the dataset in the index; each module page also receives that page's
current module as a `module` render scope. There is no project-name field.

The standalone `renderTemplate(template, data, renderValue)` helper delegates
value and AST interpolation to the named `renderValue` export from
`@cocreate/utils`, while Docs handles nested native
`<template render="path" render-as="name">` repeats. It returns an HTML string
and preserves native template elements as inert source references. The helper
returns a promise, escapes final values for HTML output, and only renders the
supplied data; it does not fetch CRUD data or track live items.

The generator takes a `targets` array. Each target names a template and output
path; `data` optionally selects an object in the dataset, and `each` plus `as`
can render one output per array entry. This lets a project generate shared
partials such as a menu alongside its index and module pages:

```js
documentation: {
	output: "./src/docs",
	template: "./src/apps/docs/templates",
	targets: [
		{ template: "menu.html", output: "menu.html" },
		{ template: "index.html", output: "index.html" },
		{
			template: "page.html",
			output: "{{module.slug}}/index.html",
			each: "modules",
			as: "module"
		}
	]
}
```

```js
async function generateDocumentation(dataset) {
	const { renderValue } = await import("@cocreate/utils");
	return CoCreateDocs.renderDocumentation(dataset, {
		template: "./src/apps/docs/templates",
		output: "./src/docs",
		renderValue,
		targets: [
			{ template: "menu.html", output: "menu.html" },
			{ template: "index.html", output: "index.html" },
			{
				template: "page.html",
				output: "{{module.slug}}/index.html",
				each: "modules",
				as: "module"
			}
		]
	});
}
```

`onDiagnostic` receives JSDoc warnings and errors. If JSDoc can still produce
JSON, valid doclets are still returned so one malformed tag does not discard
the module's other documentation.

# Table of Contents

-   [Table of Contents](#table-of-contents)
-   [Announcements](#announcements)
-   [Roadmap](#roadmap)
-   [How to Contribute](#how-to-contribute)
-   [About](#about)
-   [License](#license)

<a name="announcements"></a>

# Announcements

All updates to this library are documented in our [CHANGELOG](https://github.com/CoCreateJS/CoCreate-docs/blob/master/CHANGELOG.md) and [releases](https://github.com/CoCreateJS/CoCreate-docs/releases). You may also subscribe to email for releases and breaking changes.

<a name="roadmap"></a>

# Roadmap

If you are interested in the future direction of this project, please take a look at our open [issues](https://github.com/CoCreateJS/CoCreate-docs/issues) and [pull requests](https://github.com/CoCreateJS/CoCreate-docs/pulls). We would love to hear your feedback.

<a name="about"></a>

# About

CoCreate-docs is guided and supported by the CoCreate Developer Experience Team.

Please Email the Developer Experience Team [here](mailto:develop@CoCreateJS.com) in case of any queries.

CoCreate-docs is maintained and funded by CoCreate. The names and logos for CoCreate are trademarks of CoCreate, LLC.

<a name="contribute"></a>

# How to Contribute

We encourage contribution to our libraries (you might even score some nifty swag), please see our [CONTRIBUTING](https://github.com/CoCreateJS/CoCreate-docs/blob/master/CONTRIBUTING.md) guide for details.

We want this library to be community-driven, and CoCreate led. We need your help to realize this goal. To help make sure we are building the right things in the right order, we ask that you create [issues](https://github.com/CoCreateJS/CoCreate-docs/issues) and [pull requests](https://github.com/CoCreateJS/CoCreate-docs/pulls) or merely upvote or comment on existing issues or pull requests.

We appreciate your continued support, thank you!

<a name="license"></a>

# License

[The MIT License (MIT)](https://github.com/CoCreateJS/CoCreate-docs/blob/master/LICENSE)
