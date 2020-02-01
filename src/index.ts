import * as moment from "moment-timezone";
import { heat } from "./charts/heatmap";
import { readdirSync, readFileSync, writeFileSync } from "fs";

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

function main() {
  if (!process.argv[2]) {
    console.log("You must specify a message thread to parse.");
    process.exit(1);
  }

  let folder = process.argv[2];
  if (folder.endsWith("/")) {
    folder = folder.slice(0, -1);
  }

  const files = readdirSync(folder, null);

  if (files.length <= 0) {
    console.log("No files found in directory");
    process.exit(1);
  }

  const thread: Thread = JSON.parse(
    readFileSync(`${folder}/${files[0]}`, "utf-8").toString()
  );

  files.slice(1).forEach((file, idx) => {
    thread.messages = thread.messages.concat(
      JSON.parse(readFileSync(`${folder}/${file}`, "utf-8").toString()).messages
    );
  });

  generateHeatmaps(thread);
  generateTODGraph(thread);
  generateDOWGraph(thread);
}

function generateHeatmaps(thread: Thread): void {
  const years: { [key: string]: number[] } = {};

  thread.messages.forEach(entry => {
    const time = moment(entry.timestamp_ms);
    const year = time.year();
    const doy = time.dayOfYear() + 1;

    if (!years[year.toString()]) {
      years[year.toString()] = new Array(371).fill(0);
    }

    const days = years[year.toString()];
    days[doy] += 1;
  });

  Object.entries(years)
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
      writeFileSync(`out/${year}.gpi`, heatmap);
    });
}

function generateTODGraph(thread: Thread): void {
  const times = [...Array(24).keys()].map(e => {
    return { hour: e, count: 0 };
  });

  thread.messages.forEach(entry => {
    times[
      moment(entry.timestamp_ms)
        .tz("America/Vancouver")
        .hour()
    ].count += 1;
  });

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

  times.forEach(({ hour, count }) => {
    base += `"${hour}" ${count}\n`;
  });

  writeFileSync("out/time.gpi", base);
}

function generateDOWGraph(thread: Thread): void {
  const times = [
    { day: "Sunday", count: 0 },
    { day: "Monday", count: 0 },
    { day: "Tuesday", count: 0 },
    { day: "Wednesday", count: 0 },
    { day: "Thursday", count: 0 },
    { day: "Friday", count: 0 },
    { day: "Saturday", count: 0 }
  ];

  thread.messages.forEach(entry => {
    times[
      moment(entry.timestamp_ms)
        .tz("America/Vancouver")
        .day()
    ].count += 1;
  });

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

  times.forEach(({ day, count }) => {
    base += `"${day}" ${count}\n`;
  });

  writeFileSync("out/dow.gpi", base);
}

main();
