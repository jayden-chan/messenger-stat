import { heat } from "./charts/heatmap";
import { plot } from "./gnuplot";
import { ProcessedThread } from "./index";

export function heatmaps(thread: ProcessedThread, tmpDir: string): void {
  Object.entries(thread.years)
    .map(([year, days]) => {
      return {
        year,
        heatmap: heat({
          title: year,
          outfile: year,
          data: days,
          colorbox: true,
          cbrange: [0, thread.globalMax[1]]
        })
      };
    })
    .forEach(({ year, heatmap }) => {
      plot(heatmap, tmpDir);
    });
}

export function timeOfDay(thread: ProcessedThread, tmpDir: string): void {
  let base = `set title ""
set term png size 1600, 900
set output "times.png"
set boxwidth 2
set style fill solid
set xlabel "Hour of Day"
set ylabel "Count"
set yrange [0:${Math.max.apply(
    Math,
    thread.times.map(o => {
      return o.count;
    })
  ) * 1.05}]
unset key
plot "-" using 2: xtic(1) with histogram
`;

  thread.times.forEach(({ hour, count }) => {
    base += `"${hour}" ${count}\n`;
  });

  plot(base, tmpDir);
}

export function daysOfWeek(thread: ProcessedThread, tmpDir: string): void {
  let base = `set title ""
set term png size 1600, 900
set output "dow.png"
set boxwidth 2
set style fill solid
set xlabel "Day of Week"
set ylabel "Count"
set yrange [0:${Math.max.apply(
    Math,
    thread.days.map(o => {
      return o.count;
    })
  ) * 1.05}]
unset key
plot "-" using 2: xtic(1) with histogram
`;

  thread.days.forEach(({ day, count }) => {
    base += `"${day}" ${count}\n`;
  });

  plot(base, tmpDir);
}

export function contributions(thread: ProcessedThread, tmpDir: string): void {
  const participants = Object.entries(thread.participants);
  participants.sort((a, b) => {
    if (a[1] > b[1]) {
      return -1;
    } else {
      return 1;
    }
  });

  let base = `set title ""
set term png size 1600, 900
set output "participants.png"
set boxwidth 2
set style fill solid
set xlabel "Participant"
set ylabel "Message Count"
set yrange [0:${participants[0][1] * 1.05}]
unset key
plot "-" using 2: xtic(1) with histogram
`;

  participants.forEach(([participant, count]) => {
    base += `"${participant}" ${count}\n`;
  });

  plot(base, tmpDir);
}

export function contributionsMedia(
  thread: ProcessedThread,
  tmpDir: string
): void {
  const participants = Object.entries(thread.participantsMedia);
  participants.sort((a, b) => {
    if (a[1] > b[1]) {
      return -1;
    } else {
      return 1;
    }
  });

  let base = `set title ""
set term png size 1600, 900
set output "participantsMedia.png"
set boxwidth 2
set style fill solid
set xlabel "Participant"
set ylabel "Media Count"
set yrange [0:${participants[0][1] * 1.05}]
unset key
plot "-" using 2: xtic(1) with histogram
`;

  participants.forEach(([participant, count]) => {
    base += `"${participant}" ${count}\n`;
  });

  plot(base, tmpDir);
}

export function topWords(thread: ProcessedThread, tmpDir: string): void {
  let base = `set title ""
set term png size 1600, 900
set output "words.png"
set boxwidth 2
set style fill solid
set xlabel "Word"
set ylabel "Occurrences"
set yrange [0:${thread.wordMap[0][1] * 1.05}]
unset key
plot "-" using 2: xtic(1) with histogram
`;

  thread.wordMap.forEach(([word, count]) => {
    base += `"${word}" ${count}\n`;
  });

  plot(base, tmpDir);
}
