import { ProcessedThread } from "./index";

function getGraphLatex(fileName: string, title?: string): string {
  const latexString = `\\begin{center}
  \\makebox[\\textwidth]{\\includegraphics[width=\\paperwidth]{${fileName}}}
\\end{center}`;
  return title ? `\\subsection*{${title}}\n${latexString}` : latexString;
}

export function getGraphsString(
  tmpDir: string,
  thread: ProcessedThread
): string {
  return (
    `\\subsection*{Yearly Heatmaps}\n` +
    Object.keys(thread.years).reduce((prev, curr) => {
      return prev + getGraphLatex(`${tmpDir}/${curr}.png`);
    }, "") +
    "\\eject \\pdfpagewidth=8.5in \\pdfpageheight=6in" +
    getGraphLatex(`${tmpDir}/times.png`, "Total message count vs time of day") +
    getGraphLatex(`${tmpDir}/dow.png`, "Total message count vs day of week") +
    getGraphLatex(
      `${tmpDir}/participants.png`,
      "Total message count by participant"
    ) +
    "\\clearpage\n\\eject \\pdfpagewidth=8.5in \\pdfpageheight=11in"
  );
}
