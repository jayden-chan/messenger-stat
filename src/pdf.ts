import * as child from "child_process";

export function compileReport(tmpDir: string): void {
  try {
    console.log(child.execSync(`convert ${tmpDir}/*.png report.pdf`));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
