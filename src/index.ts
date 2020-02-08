import * as moment from "moment-timezone";
import * as tmp from "tmp";
import { readdirSync, readFileSync } from "fs";

import { compile } from "./pdf";
import * as generate from "./generators";
import { getGraphsString } from "./latex";

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
  globalMax: [string, number];
  longest: [string, string, number];
  avgResp: number;
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

  if (thread.messages.length === 0) {
    console.log("No messages found!");
    process.exit(1);
  }

  const processedThread = processThread(thread);

  console.log("Generating graphs...");
  generate.heatmaps(processedThread, tmpDir.name);
  generate.timeOfDay(processedThread, tmpDir.name);
  generate.daysOfWeek(processedThread, tmpDir.name);
  generate.contributions(processedThread, tmpDir.name);

  console.log("Compiling report...");
  compile({
    tmpDir: tmpDir.name,
    templateValues: {
      TITLE: thread.title,
      VERSION: "1.0.0",
      DATE: moment().format("MMMM Do, YYYY"),
      MESSAGES: thread.messages.length.toString(),
      WORDS: processedThread.words.toString(),
      CHARS: processedThread.chars.toString(),
      GRAPHS: getGraphsString(tmpDir.name, processedThread),
      MAD: `${processedThread.globalMax[0]} (${processedThread.globalMax[1]} messages)`,
      LONGEST: `${processedThread.longest[2]} words (sent by ${processedThread.longest[0]})`,
      LMC: processedThread.longest[1],
      RESP: processedThread.avgResp.toFixed(2)
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

  const firstMessage = thread.messages[0];
  let words = 0;
  let chars = 0;
  let globalMax: [string, number] = [
    moment(firstMessage.timestamp_ms).format("MMM, Do, YYYY"),
    firstMessage.content ? firstMessage.content.length : 0
  ];
  let longest: [string, string, number] = ["", "", 0];
  let previous: [moment.Moment, string] = [
    moment(thread.messages[0].timestamp_ms),
    thread.messages[0].sender_name
  ];

  let avgResp = 0;
  const numMessages = thread.messages.length;

  thread.messages.forEach(entry => {
    const time = moment(entry.timestamp_ms).tz("America/Vancouver");
    const year = time.year();
    const doy = time.dayOfYear() + 1;

    if (entry.sender_name !== previous[1]) {
      avgResp +=
        moment.duration(previous[0].diff(time)).as("minutes") / numMessages;
    }

    if (!years[year.toString()]) {
      years[year.toString()] = new Array(371).fill(0);
    }

    const yearDays = years[year.toString()];
    const currDay = (yearDays[doy] += 1);

    if (currDay > globalMax[1]) {
      globalMax = [time.format("MMM Do, YYYY"), currDay];
    }

    if (entry.content && entry.content.split(" ").length > longest[2]) {
      longest = [
        entry.sender_name,
        entry.content,
        entry.content.split(" ").length
      ];
    }

    participants[entry.sender_name] += 1;
    times[time.hour()].count += 1;
    days[time.day()].count += 1;
    words += entry.content ? entry.content.split(" ").length : 0;
    chars += entry.content ? entry.content.length : 0;

    previous = [time, entry.sender_name];
  });

  return {
    years,
    times,
    days,
    participants,
    words,
    chars,
    globalMax,
    longest,
    avgResp
  };
}

main();
