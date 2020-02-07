import * as child from "child_process";
import { readFileSync, writeFileSync, copyFileSync } from "fs";

export type ReportTemplate = {
  tmpDir: string;
  templateValues: {
    [key: string]: string;
  };
};

export function compile(template: ReportTemplate): void {
  let latexTemplate = readFileSync("templates/template.tex").toString();

  Object.entries(template.templateValues).forEach(([k, v]) => {
    latexTemplate = latexTemplate.replace(`-${k}-`, v);
  });

  const t = template.tmpDir;
  writeFileSync(`${t}/latex.tex`, latexTemplate);

  try {
    child.execSync(`pdflatex -output-directory=${t} ${t}/latex.tex`);
  } catch (e) {
    console.error(e);
    console.error(e.stdout.toString());
    process.exit(1);
  }

  copyFileSync(`${t}/latex.pdf`, "report.pdf");
}
