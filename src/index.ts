import * as moment from "moment-timezone";
import * as tmp from "tmp";
import { readdirSync, readFileSync } from "fs";

import { heat } from "./charts/heatmap";
import { plot } from "./gnuplot";
import { compileReport } from "./pdf";

type Thread = {
  participants: {
    name: string;
  }[];
  messages: Message[];
  title: string;
  is_still_participant: boolean;
  thread_type: string;
  thread_path: string;
};

type Message = {
  sender_name: string;
  timestamp_ms: number;
  content: string;
  type: string;
};

type ProcessedThread = {
  years: { [key: string]: number[] };
  times: {
    hour: number;
    count: number;
  }[];
  days: {
    day: string;
    count: number;
  }[];
};

function main() {
  if (!process.argv[2]) {
    console.log("You must specify a message thread to parse.");
    process.exit(1);
  }

  const tmpDir = tmp.dirSync();

  let inputFolder = process.argv[2];
  if (inputFolder.endsWith("/")) {
    inputFolder = inputFolder.slice(0, -1);
  }

  const files = readdirSync(inputFolder, null);

  if (files.length <= 0) {
    console.log("No files found in directory");
    process.exit(1);
  }

  const thread: Thread = JSON.parse(
    readFileSync(`${inputFolder}/${files[0]}`, "utf-8").toString()
  );

  files.slice(1).forEach(file => {
    thread.messages = thread.messages.concat(
      JSON.parse(readFileSync(`${inputFolder}/${file}`, "utf-8").toString())
        .messages
    );
  });

  const processedThread = processThread(thread);

  generateHeatmaps(processedThread, tmpDir.name);
  generateTODGraph(processedThread, tmpDir.name);
  generateDOWGraph(processedThread, tmpDir.name);

  compileReport(tmpDir.name);
  tmpDir.removeCallback();
}

function processThread(thread: Thread): ProcessedThread {
  const years: { [key: string]: number[] } = {};
  const times = [...Array(24).keys()].map(e => {
    return { hour: e, count: 0 };
  });

  const days = [
    { day: "Sunday", count: 0 },
    { day: "Monday", count: 0 },
    { day: "Tuesday", count: 0 },
    { day: "Wednesday", count: 0 },
    { day: "Thursday", count: 0 },
    { day: "Friday", count: 0 },
    { day: "Saturday", count: 0 }
  ];

  thread.messages.forEach(entry => {
    const time = moment(entry.timestamp_ms).tz("America/Vancouver");
    const year = time.year();
    const doy = time.dayOfYear() + 1;

    if (!years[year.toString()]) {
      years[year.toString()] = new Array(371).fill(0);
    }

    const yearDays = years[year.toString()];
    yearDays[doy] += 1;

    times[time.hour()].count += 1;
    days[time.day()].count += 1;
  });

  return {
    years,
    times,
    days
  };
}

function generateHeatmaps(thread: ProcessedThread, tmpDir: string): void {
  Object.entries(thread.years)
    .map(([year, days]) => {
      return {
        year,
        heatmap: heat({
          title: year,
          outfile: year,
          data: days,
          colorbox: true
        })
      };
    })
    .forEach(({ year, heatmap }) => {
      plot(heatmap, tmpDir);
    });
}

function generateTODGraph(thread: ProcessedThread, tmpDir: string): void {
  let base = `set title "Time of Day Histogram"
set term png size 1600, 900
set output "times.png"
set boxwidth 2
set style fill solid
set xlabel "Hour of Day"
set ylabel "Count"
unset key
plot "-" using 2: xtic(1) with histogram
`;

  thread.times.forEach(({ hour, count }) => {
    base += `"${hour}" ${count}\n`;
  });

  plot(base, tmpDir);
}

function generateDOWGraph(thread: ProcessedThread, tmpDir: string): void {
  let base = `set title "Day of Week Histogram"
set term png size 1600, 900
set output "dow.png"
set boxwidth 2
set style fill solid
set xlabel "Hour of Day"
set ylabel "Count"
unset key
plot "-" using 2: xtic(1) with histogram
`;

  thread.days.forEach(({ day, count }) => {
    base += `"${day}" ${count}\n`;
  });

  plot(base, tmpDir);
}

main();
