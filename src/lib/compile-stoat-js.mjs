import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const pkg = join(root, "node_modules/stoat.js");
const libEntry = join(pkg, "lib/index.js");

if (!existsSync(pkg)) {
	console.warn("stoat.js is not installed; skip compile");
	process.exit(0);
}

if (existsSync(libEntry)) {
	process.exit(0);
}

const tarball =
	"https://codeload.github.com/viniciuslrangel/javascript-client-sdk/tar.gz/f8addfb7dad7d9f5671dd6fc98a80aa0a09dd1cc";
const tmp = join(tmpdir(), `stoat-js-src-${process.pid}`);
mkdirSync(tmp, { recursive: true });
execSync(
	`curl -fsSL ${JSON.stringify(tarball)} | tar -xz -C ${JSON.stringify(tmp)} --strip-components=1`,
	{
		stdio: "inherit",
	},
);

const src = join(tmp, "src");
if (!existsSync(src)) {
	throw new Error("Fork tarball has no src/");
}

const destSrc = join(pkg, "src");
rmSync(destSrc, { recursive: true, force: true });
execSync(`cp -R ${JSON.stringify(src)} ${JSON.stringify(destSrc)}`);

const tsconfig = join(tmp, "tsconfig.json");
if (existsSync(tsconfig)) {
	execSync(
		`cp ${JSON.stringify(tsconfig)} ${JSON.stringify(join(pkg, "tsconfig.json"))}`,
	);
}

const storeModules = join(pkg, "..");
const pkgModules = join(pkg, "node_modules");
mkdirSync(pkgModules, { recursive: true });
for (const dep of [
	"stoat-api",
	"solid-js",
	"ulid",
	"json-with-bigint",
	"@vladfrangu",
	"@solid-primitives",
]) {
	const from = join(storeModules, dep);
	const to = join(pkgModules, dep);
	if (existsSync(from) && !existsSync(to)) {
		symlinkSync(from, to, "dir");
	}
}

const typesDir = join(pkgModules, "@types");
mkdirSync(typesDir, { recursive: true });
const nodeTypes = join(root, "node_modules/@types/node");
const nodeTypesLink = join(typesDir, "node");
if (existsSync(nodeTypes) && !existsSync(nodeTypesLink)) {
	symlinkSync(nodeTypes, nodeTypesLink, "dir");
}

execSync(
	`pnpm exec tsc -p tsconfig.json --outDir lib --rootDir src --skipLibCheck --types node`,
	{ cwd: pkg, stdio: "inherit" },
);

if (!existsSync(libEntry)) {
	throw new Error("stoat.js compile did not produce lib/index.js");
}
