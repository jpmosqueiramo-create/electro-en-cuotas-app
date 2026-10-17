import { constants, accessSync, statSync } from "node:fs";
import { delimiter, join } from "node:path";

export function resolveChrome(env: Record<string, string | undefined> = process.env, knownPaths = [
  "/usr/bin/google-chrome", "/opt/google/chrome/chrome", "/usr/bin/chromium",
  "/usr/bin/chromium-browser", "/snap/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
]): string {
  const names = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"];
  const candidates = [
    ...(env.CHROME_BIN ? [env.CHROME_BIN] : []),
    ...names.flatMap(name => (env.PATH || "").split(delimiter).filter(Boolean).map(dir => join(dir, name))),
    ...knownPaths,
  ];
  for (const path of candidates) {
    try {
      accessSync(path, constants.X_OK);
      if (statSync(path).isFile()) return path;
    } catch { /* Try next executable. */ }
  }
  throw new Error(`CHROME_NOT_FOUND: tried ${candidates.join(", ")}`);
}
