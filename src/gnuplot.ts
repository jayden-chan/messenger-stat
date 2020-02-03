import * as child from "child_process";

export function plot(script: string, outDir: string): void {
  try {
    const stdout = child.execSync("gnuplot", {
      input: script,
      cwd: outDir
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
