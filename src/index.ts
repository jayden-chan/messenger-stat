import * as moment from "moment-timezone";
import * as tmp from "tmp";
import { readdirSync, readFileSync } from "fs";

import { compile } from "./pdf";
import * as generate from "./gnuplot";
import { getGraphsString } from "./latex";
import { transcodeStrings } from "./util";
import { Thread, ProcessedThread } from "./types";

function main() {
  if (!process.argv[2]) {
    console.log("You must specify a message thread to parse.");
    process.exit(1);
  }

  /*
   * unsafeCleanup will remove the created directory even
   * if there are files in it. (we want this since all
   * the temp files will have been converted into a
   * non-temp pdf by the time the program exits)
   */
  const tmpDir = tmp.dirSync({ unsafeCleanup: true });

  let inputFolder = process.argv[2];
  if (inputFolder.endsWith("/")) {
    inputFolder = inputFolder.slice(0, -1);
  }

  const files = readdirSync(inputFolder).filter(f => f.endsWith(".json"));

  if (files.length <= 0) {
    console.log("No JSON files found in directory");
    process.exit(1);
  }

  /*
   * Re-order the message files. If we skip this step
   * the messages will order like this:
   *     message_1.json
   *     message_10.json
   *     message_2.json
   *     ...
   */
  files.sort((a, b) => {
    const numA = /message_(\d+).json/.exec(a);
    const numB = /message_(\d+).json/.exec(b);
    if (!numA || !numB) {
      console.log("Failed to parse message JSON files");
      process.exit(1);
    } else {
      return Number(numA[1]) < Number(numB[1]) ? -1 : 1;
    }
  });

  console.log(
    `Loading data...${files.length > 3 ? " (This may take a moment)" : ""}`
  );

  /*
   * Every string in the input JSON needs to be transcoded because
   * FB data is received in latin1 instead of UTF-8.
   */
  const thread: Thread = JSON.parse(
    readFileSync(`${inputFolder}/${files[0]}`, "utf-8").toString(),
    transcodeStrings
  );

  // Read the rest of the message files.
  // TODO: Analyze the message files in chunks as provided by FB instead of together
  files.slice(1).forEach(file => {
    thread.messages = thread.messages.concat(
      JSON.parse(
        readFileSync(`${inputFolder}/${file}`, "utf-8").toString(),
        transcodeStrings
      ).messages
    );
  });

  /*
   * This step lets us skip all future array[0] bounds checks
   */
  if (thread.messages.length === 0) {
    console.log("No messages found!");
    process.exit(1);
  }

  console.log("Processing data...");
  const processedThread = processThread(thread);

  console.log("Generating graphs...");
  generate.heatmaps(processedThread, tmpDir.name);
  generate.timeOfDay(processedThread, tmpDir.name);
  generate.daysOfWeek(processedThread, tmpDir.name);
  generate.contributions(processedThread, tmpDir.name);
  generate.contributionsMedia(processedThread, tmpDir.name);
  generate.topWords(processedThread, tmpDir.name);

  console.log("Compiling report...");
  compile({
    tmpDir: tmpDir.name,
    templateValues: {
      TITLE: thread.title,
      VERSION: "1.0.1",
      DATE: moment().format("MMMM Do, YYYY"),
      MESSAGES: thread.messages.length.toString(),
      WORDS: processedThread.words.toString(),
      CHARS: processedThread.chars.toString(),
      GRAPHS: getGraphsString(tmpDir.name, processedThread),
      MAD: `${processedThread.globalMax[0]} (${processedThread.globalMax[1]} messages)`,
      LONGEST: `${processedThread.longest[2]} word${
        processedThread.longest[2] > 1 ? "s" : ""
      } (sent by ${processedThread.longest[0]})`,
      LMC: processedThread.longest[1],
      RESP: processedThread.avgResp.toFixed(2)
    }
  });

  tmpDir.removeCallback();
  console.log("Finished.");
}

/**
 * Extracts the stats from the messages. This function is pretty
 * big because we want to do all of the checks in a single pass
 * of the array.
 */
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
  const participantsMedia: { [key: string]: number } = {};
  thread.participants.forEach(({ name }) => {
    participants[name] = 0;
    participantsMedia[name] = 0;
  });

  let words = 0;
  let chars = 0;
  let globalMax: [string, number] = ["", 0];
  let longest: [string, string, number] = ["", "", 0];
  let longestChars = 0;
  let previous: [moment.Moment, string] = [
    moment(thread.messages[0].timestamp_ms),
    thread.messages[0].sender_name
  ];

  let avgResp = 0;
  const numMessages = thread.messages.length;
  const wordMap: { [key: string]: number } = {};

  thread.messages.forEach(entry => {
    // TODO: Take timezone from command line input
    const time = moment(entry.timestamp_ms).tz("America/Vancouver");
    const year = time.year();
    const doy = time.dayOfYear() + 1;
    const messageWords = entry.content ? entry.content.split(" ") : [];
    const sender_name = entry.sender_name;

    if (sender_name !== previous[1]) {
      const diffMinutes = moment.duration(previous[0].diff(time)).as("minutes");

      // Only include gaps of less than 6 hours in "response time" metric
      if (diffMinutes < 6 * 60) {
        avgResp += diffMinutes / numMessages;
      }
    }

    if (!years[year.toString()]) {
      years[year.toString()] = new Array(371).fill(0);
    }

    const yearDays = years[year.toString()];
    const currDay = (yearDays[doy] += 1);

    if (currDay > globalMax[1]) {
      globalMax = [time.format("MMM Do, YYYY"), currDay];
    }

    if (entry.content && entry.content.length > longestChars) {
      longest = [sender_name, entry.content, messageWords.length];
      longestChars = entry.content.length;
    }

    participants[sender_name] += 1;
    times[time.hour()].count += 1;
    days[time.day()].count += 1;
    words += messageWords.length;
    chars += entry.content ? entry.content.length : 0;

    if (entry.photos) {
      participantsMedia[sender_name] += entry.photos.length;
    }

    if (entry.videos) {
      participantsMedia[sender_name] += entry.videos.length;
    }

    previous = [time, sender_name];
    messageWords.forEach(word => {
      if (word.length === 0) return;
      const w = word.toLowerCase().replace(/[-,./\\?"'{}_]/, "");
      if (!wordMap[w]) {
        wordMap[w] = 1;
      } else {
        wordMap[w] += 1;
      }
    });
  });

  // Sort the words by frequency of use. Probably could have used a
  // sorted map or something instead of doing this but oh well
  const wordsSorted = Object.entries(wordMap).sort(function(a, b) {
    return wordMap[b[0]] - wordMap[a[0]];
  });

  return {
    years,
    times,
    days,
    participants,
    participantsMedia,
    words,
    chars,
    globalMax,
    longest,
    avgResp,
    wordMap: wordsSorted.filter(word => word[0].length >= 5).slice(0, 10)
  };
}

main();
