import * as moment from "moment-timezone";

export type HeatmapInput = {
  title: string;
  outfile: string;
  palette?: string[];
  data: number[];
  colorbox: boolean;
};

export function heat(input: HeatmapInput) {
  const { title, outfile, palette, data, colorbox } = input;
  const xtics = [...Array(12).keys()].map(e => {
    const week = moment(`${e + 1}-01`, "M-DD").week() - 1;
    const month = moment(`${e + 1}-01`, "M-DD").format("MMMM");
    return `"${month}" ${week}`;
  });

  const ytics = [...Array(7).keys()].map(e => {
    const day = moment(`1-${e + 5}`, "M-D").format("ddd");
    return `"${day}" ${e}`;
  });

  const p_string =
    palette === undefined
      ? ""
      : `set palette maxcolors ${palette.length}
set palette defined (${palette.map((p, idx) => `${idx} '${p}'`).join(", ")})
`;

  let script = `set term png size 1770, 325
set output "${outfile}.png"
set title "${title
    .split(" ")
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ")}"
set yrange [-0.5:6.5]
set xrange [-0.5:52.5]
set zrange [0:${Math.max.apply(Math, data)}]
set xtics (${xtics.join(", ")})
set ytics (${ytics.join(", ")})
${p_string}
unset key
${colorbox ? "" : "un"}set colorbox
plot "-" using 2:1:3 with image
`;

  data.forEach((count, day) => {
    script += `${day % 7} ${Math.floor(day / 7)} ${count}\n`;
  });

  return script;
}
