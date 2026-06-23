import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

function captureScreenshot({ demoFile, outputFile, viewport }) {
  const demoPath = path.join(root, "..", "docs", demoFile);
  const outputPath = path.join(root, "..", "docs", "images", outputFile);
  const demoUrl = `file:///${demoPath.replace(/\\/g, "/")}`;

  execFileSync(
    "npx",
    [
      "--yes",
      "playwright@1.51.0",
      "screenshot",
      demoUrl,
      outputPath,
      `--viewport-size=${viewport}`,
      "--full-page",
    ],
    { stdio: "inherit", shell: true },
  );

  console.log(`Saved ${outputPath}`);
}

captureScreenshot({
  demoFile: "screenshot-demo.html",
  outputFile: "example-search.png",
  viewport: "1440,1500",
});

captureScreenshot({
  demoFile: "screenshot-demo-auto.html",
  outputFile: "example-auto.png",
  viewport: "1280,1400",
});
