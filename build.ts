import * as ejs from "ejs";
import * as path from "node:path";
import * as fs from "node:fs";
import * as url from "node:url";
import * as esbuild from "esbuild";
import sass from "sass";
import { sassPlugin } from "esbuild-sass-plugin";
import * as prettier from "prettier";
import crypto from "node:crypto";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const BASE_HREF = process.env.BASE_HREF || "";

const Paths = {
  Index: path.join(__dirname, "src", "index.tsx"),
  Vendor: path.join(__dirname, "src", "vendor"),
  Static: path.join(__dirname, "src", "static"),
  Robots: path.join(__dirname, "src", "robots.txt"),
  Styles: path.join(__dirname, "src", "index.scss"),
  Output: path.join(__dirname, "dist"),
  OutputVendor: path.join(__dirname, "dist", "vendor"),
  OutputStatic: path.join(__dirname, "dist", "static"),
  OutputRobots: path.join(__dirname, "dist", "robots.txt"),
};

fs.rmSync(Paths.Output, { recursive: true, force: true });
fs.mkdirSync(Paths.Output, { recursive: true });
fs.mkdirSync(Paths.OutputVendor, { recursive: true });

// const stylesCode = fs.readFileSync(Paths.Styles, 'utf8')
// const stylesResults = await sass.compileStringAsync(stylesCode, {
//     url: url.pathToFileURL(Paths.Styles),
// })

const report = await esbuild.build({
  entryPoints: [Paths.Index],
  minify: true,
  metafile: true,
  format: "esm",
  bundle: true,
  define: {
    BASE_HREF: JSON.stringify(BASE_HREF),
  },
  sourcemap: "external",
  outdir: Paths.Output,
  write: false,
  plugins: [sassPlugin()],
  alias: {
    react: "preact/compat",
    "react-dom": "preact/compat",
  },
});

const scripts = new Map<string, string>();
const styles = new Map<string, string>();
const outputs = new Map<string, Uint8Array>();
const outputMap = new Map<string, string>();

for (const outputFile of report.outputFiles) {
  if (outputFile.path.endsWith(".map")) {
    continue;
  }
  const { name, ext, base } = path.parse(outputFile.path);
  const hash = (await sha1(outputFile.contents)).substring(0, 10);
  const fileName = `${name}.${hash}${ext}`;
  outputs.set(fileName, outputFile.contents);
  outputMap.set(base, fileName);
  if (ext === ".js") {
    scripts.set(base, fileName);
  }
  if (ext === ".css") {
    styles.set(base, fileName);
  }
}

for (const outputFile of report.outputFiles) {
  if (!outputFile.path.endsWith(".map")) {
    continue;
  }
  const nameWithoutMap = outputFile.path.substring(
    0,
    outputFile.path.length - 4
  );
  const { base } = path.parse(nameWithoutMap);
  const relatedName = outputMap.get(base);
  if (!relatedName) throw new Error("Unable to find map for file");
  const fileName = `${relatedName}.map`;
  outputs.set(fileName, outputFile.contents);
}

for (const [fileName, bytes] of [...outputs.entries()]) {
  fs.writeFileSync(path.join(Paths.Output, fileName), bytes);
}
fs.writeFileSync(path.join(Paths.Output, 'meta.json'), JSON.stringify(report.metafile))
fs.cpSync(Paths.Vendor, Paths.OutputVendor, { recursive: true });
fs.cpSync(Paths.Static, Paths.OutputStatic, { recursive: true });
fs.cpSync(Paths.Robots, Paths.OutputRobots, { recursive: true });

const ctx = {
  scripts,
  styles,
  base_href: BASE_HREF,
  get ctx() {
    return this;
  },
};

const entryEjs = path.join(__dirname, "src", "index.ejs");
const ejsCode = fs.readFileSync(entryEjs, "utf8");
let result = await ejs.render(ejsCode, ctx, {
  async: true,
  cache: false,
  filename: entryEjs,
});

const prettyResult = await prettier.format(result, { parser: "html" });
fs.writeFileSync(path.join(Paths.Output, "index.html"), prettyResult, "utf8");
fs.writeFileSync(path.join(Paths.Output, "404.html"), prettyResult, "utf8");

export async function sha1(input: any): Promise<string> {
  return crypto.createHash("sha1").update(input).digest("hex");
}

export async function build(
  entries: string[],
  define: Record<string, string> = {}
) {
  return {
    scripts,
    styles,
    outputs,
  };
}
