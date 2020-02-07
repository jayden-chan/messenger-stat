import * as moment from "moment-timezone";
import * as tmp from "tmp";
import { readdirSync, readFileSync } from "fs";

import { compile } from "./pdf";
import * as generate from "./generators";

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
  content?: string;
  type: string;
};

export type ProcessedThread = {
  years: { [key: string]: number[] };
  times: {
    hour: number;
    count: number;
  }[];
  days: {
    day: string;
    count: number;
  }[];
  participants: {
    [key: string]: number;
  };
  words: number;
  chars: number;
};

function main() {
  if (!process.argv[2]) {
    console.log("You must specify a message thread to parse.");
    process.exit(1);
  }

  /*
    unsafeCleanup will remove the created directory even
    if there are files in it. (we want this since all
    the temp files will have been converted into a
    non-temp pdf by the time the program exits)
  */
  const tmpDir = tmp.dirSync({ unsafeCleanup: true });

  let inputFolder = process.argv[2];
  if (inputFolder.endsWith("/")) {
    inputFolder = inputFolder.slice(0, -1);
  }

  const files = readdirSync(inputFolder, null);

  if (files.length <= 0) {
    console.log("No files found in directory");
    process.exit(1);
  }

  console.log("Processing data...");

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

  console.log("Generating graphs...");
  generate.heatmaps(processedThread, tmpDir.name);
  generate.timeOfDay(processedThread, tmpDir.name);
  generate.daysOfWeek(processedThread, tmpDir.name);
  generate.contributions(processedThread, tmpDir.name);

  const GGL = (fileName: string, title?: string) => {
    const latexString = `\\begin{center}
  \\makebox[\\textwidth]{\\includegraphics[width=\\paperwidth]{${fileName}}}
\\end{center}`;
    return title ? `\\subsection*{${title}}\n${latexString}` : latexString;
  };

  const t = tmpDir.name;

  const graphString =
    `\\subsection*{Yearly Heatmaps}\n` +
    Object.keys(processedThread.years).reduce((prev, curr) => {
      return prev + GGL(`${t}/${curr}.png`);
    }, "") +
    "\\eject \\pdfpagewidth=8.5in \\pdfpageheight=6in" +
    GGL(`${t}/times.png`, "Total message count vs time of day") +
    GGL(`${t}/dow.png`, "Total message count vs day of week") +
    GGL(`${t}/participants.png`, "Total message count by participant");

  console.log("Compiling report...");
  compile({
    tmpDir: tmpDir.name,
    templateValues: {
      TITLE: "The Fremen",
      VERSION: "1.0.0",
      DATE: "Feb 6 2020",
      MESSAGES: thread.messages.length.toString(),
      WORDS: processedThread.words.toString(),
      CHARS: processedThread.chars.toString(),
      GRAPHS: graphString
    }
  });
  tmpDir.removeCallback();
  console.log("Finished.");
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

  const participants: { [key: string]: number } = {};
  thread.participants.forEach(({ name }) => {
    participants[name] = 0;
  });

  let words = 0;
  let chars = 0;

  thread.messages.forEach(entry => {
    const time = moment(entry.timestamp_ms).tz("America/Vancouver");
    const year = time.year();
    const doy = time.dayOfYear() + 1;

    if (!years[year.toString()]) {
      years[year.toString()] = new Array(371).fill(0);
    }

    const yearDays = years[year.toString()];
    yearDays[doy] += 1;

    participants[entry.sender_name] += 1;
    times[time.hour()].count += 1;
    days[time.day()].count += 1;
    words += entry.content ? entry.content.split(" ").length : 0;
    chars += entry.content ? entry.content.length : 0;
  });

  return {
    years,
    times,
    days,
    participants,
    words,
    chars
  };
}

main();
