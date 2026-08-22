import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const screensPath = join(root, "src/domain/screens.ts");
const forbiddenRouteFiles = new Set([
	"src/routes/__root.tsx",
	"src/routes/index.tsx",
]);

function field(block, name) {
	const match = block.match(new RegExp(`${name}:\\s*"([^"]*)"`));
	if (!match) {
		throw new Error(`generate-screen-routes: missing ${name} in ${block}`);
	}
	return match[1];
}

function isDirectoryIndex(routeFile) {
	return routeFile.endsWith("/index.tsx");
}

function isFlatIndex(routeFile) {
	return routeFile.endsWith(".index.tsx") && !isDirectoryIndex(routeFile);
}

function isIndexRouteFile(routeFile) {
	return isDirectoryIndex(routeFile) || isFlatIndex(routeFile);
}

function layoutPathOf(path) {
	return path.endsWith("/") ? path.slice(0, -1) : path;
}

function layoutRouteFileOf(routeFile) {
	if (!isFlatIndex(routeFile)) {
		throw new Error(
			`generate-screen-routes: cannot derive layout file from ${routeFile}`,
		);
	}
	return `${routeFile.slice(0, -".index.tsx".length)}.tsx`;
}

function parseScreens(source) {
	const start = source.indexOf("export const screens = [");
	const end = source.indexOf("] as const", start);
	if (start === -1 || end === -1) {
		throw new Error("generate-screen-routes: could not find screens array");
	}
	const body = source.slice(start, end);
	const blocks = [...body.matchAll(/\{[^}]+\}/g)].map((match) => match[0]);
	const parsed = blocks.map((block) => ({
		id: field(block, "id"),
		path: field(block, "path"),
		samplePath: field(block, "samplePath"),
		title: field(block, "title"),
		routeFile: field(block, "routeFile"),
	}));
	if (parsed.length === 0) {
		throw new Error("generate-screen-routes: parsed 0 screens from screens.ts");
	}
	const quotedIds = [...source.matchAll(/\bid:\s*"/g)].length;
	if (parsed.length !== quotedIds) {
		throw new Error(
			`generate-screen-routes: parsed ${parsed.length} screens but found ${quotedIds} id fields`,
		);
	}
	const ids = new Set();
	const routeFiles = new Set();
	for (const screen of parsed) {
		if (ids.has(screen.id)) {
			throw new Error(`generate-screen-routes: duplicate id ${screen.id}`);
		}
		if (routeFiles.has(screen.routeFile)) {
			throw new Error(
				`generate-screen-routes: duplicate routeFile ${screen.routeFile}`,
			);
		}
		if (
			!screen.routeFile.startsWith("src/routes/") ||
			screen.routeFile.includes("..")
		) {
			throw new Error(
				`generate-screen-routes: refusing to write ${screen.routeFile}`,
			);
		}
		if (forbiddenRouteFiles.has(screen.routeFile)) {
			throw new Error(
				`generate-screen-routes: refusing to overwrite ${screen.routeFile}`,
			);
		}
		if (isIndexRouteFile(screen.routeFile) && !screen.path.endsWith("/")) {
			throw new Error(
				`generate-screen-routes: ${screen.routeFile} needs a trailing slash path, got ${screen.path}`,
			);
		}
		ids.add(screen.id);
		routeFiles.add(screen.routeFile);
	}
	return parsed;
}

function pascal(id) {
	return id
		.split("-")
		.map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
		.join("");
}

function layoutComponentName(layoutFile) {
	const stem = layoutFile
		.replace(/^src\/routes\//, "")
		.replace(/\.tsx$/, "")
		.replaceAll("$", "")
		.replaceAll("/", "-")
		.replaceAll(".", "-");
	return `${pascal(stem)}Layout`;
}

function hasNestedScreen(screen, screens) {
	if (isDirectoryIndex(screen.routeFile)) {
		return false;
	}
	const prefix = `${layoutPathOf(screen.path)}/`;
	return screens.some(
		(other) => other.id !== screen.id && other.path.startsWith(prefix),
	);
}

function screenSource(screen) {
	const name = `${pascal(screen.id)}Screen`;
	const pathLiteral = JSON.stringify(screen.path);
	const idLiteral = JSON.stringify(screen.id);
	const titleLiteral = JSON.stringify(screen.title);
	return `import { createFileRoute } from "@tanstack/react-router";

import { Screen } from "@/components/screen/Screen";

export const Route = createFileRoute(${pathLiteral})({
	component: ${name},
});

function ${name}() {
	return <Screen id=${idLiteral} title=${titleLiteral} />;
}
`;
}

function layoutSource(layoutPath, layoutFile) {
	const name = layoutComponentName(layoutFile);
	const pathLiteral = JSON.stringify(layoutPath);
	return `import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(${pathLiteral})({
	component: ${name},
});

function ${name}() {
	return <Outlet />;
}
`;
}

function assertNoEffects(routeFile, body) {
	if (body.includes("useEffect")) {
		throw new Error(`generate-screen-routes: useEffect in ${routeFile}`);
	}
}

function writeRouteFile(routeFile, source) {
	if (forbiddenRouteFiles.has(routeFile)) {
		throw new Error(
			`generate-screen-routes: refusing to overwrite ${routeFile}`,
		);
	}
	if (!routeFile.startsWith("src/routes/") || routeFile.includes("..")) {
		throw new Error(`generate-screen-routes: refusing to write ${routeFile}`);
	}
	const abs = join(root, routeFile);
	mkdirSync(dirname(abs), { recursive: true });
	writeFileSync(abs, source);
}

const screens = parseScreens(readFileSync(screensPath, "utf8"));
const parents = screens.filter((screen) => hasNestedScreen(screen, screens));
const layoutFiles = new Set();

for (const screen of parents) {
	if (!isFlatIndex(screen.routeFile)) {
		throw new Error(
			`generate-screen-routes: ${screen.id} has nested screens so routeFile must be a flat index (*.index.tsx), got ${screen.routeFile}`,
		);
	}
	const layoutFile = layoutRouteFileOf(screen.routeFile);
	if (screens.some((other) => other.routeFile === layoutFile)) {
		throw new Error(
			`generate-screen-routes: layout ${layoutFile} collides with a screen routeFile`,
		);
	}
	if (layoutFiles.has(layoutFile)) {
		throw new Error(
			`generate-screen-routes: duplicate layout file ${layoutFile}`,
		);
	}
	layoutFiles.add(layoutFile);
	writeRouteFile(
		layoutFile,
		layoutSource(layoutPathOf(screen.path), layoutFile),
	);
}

for (const screen of screens) {
	writeRouteFile(screen.routeFile, screenSource(screen));
}

for (const screen of screens) {
	const abs = join(root, screen.routeFile);
	if (!existsSync(abs)) {
		throw new Error(`generate-screen-routes: missing ${screen.routeFile}`);
	}
	const body = readFileSync(abs, "utf8");
	if (!body.includes(`createFileRoute(${JSON.stringify(screen.path)})`)) {
		throw new Error(
			`generate-screen-routes: path mismatch in ${screen.routeFile}`,
		);
	}
	if (!body.includes("<Screen")) {
		throw new Error(
			`generate-screen-routes: missing Screen in ${screen.routeFile}`,
		);
	}
	assertNoEffects(screen.routeFile, body);
}

for (const screen of parents) {
	const layoutFile = layoutRouteFileOf(screen.routeFile);
	const abs = join(root, layoutFile);
	if (!existsSync(abs)) {
		throw new Error(`generate-screen-routes: missing layout ${layoutFile}`);
	}
	const body = readFileSync(abs, "utf8");
	if (
		!body.includes(
			`createFileRoute(${JSON.stringify(layoutPathOf(screen.path))})`,
		)
	) {
		throw new Error(`generate-screen-routes: path mismatch in ${layoutFile}`);
	}
	if (!body.includes("<Outlet")) {
		throw new Error(`generate-screen-routes: missing Outlet in ${layoutFile}`);
	}
	if (body.includes("<Screen")) {
		throw new Error(
			`generate-screen-routes: layout ${layoutFile} must not render Screen`,
		);
	}
	assertNoEffects(layoutFile, body);
}

console.log(
	`wrote ${screens.length} screen routes and ${parents.length} layouts from screens.ts`,
);
