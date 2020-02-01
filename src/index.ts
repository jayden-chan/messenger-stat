import * as moment from "moment";
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

  const years: { [key: string]: number[] } = {};
  let max = 0;

  thread.messages.forEach(entry => {
    const time = moment(entry.timestamp_ms);
    const year = time.year();
    const doy = time.dayOfYear() + 1;

    if (!years[year.toString()]) {
      years[year.toString()] = new Array(371).fill(0);
    }

    const days = years[year.toString()];

    days[doy] += 1;
    if (days[doy] > max) {
      max = days[doy];
    }
  });

  Object.entries(years)
    .map(([year, days]) => {
      return {
        year,
        heatmap: heat({
          title: `${
            thread.participants.reduce((prev, curr) => {
              return { name: `${prev.name} / ${curr.name}` };
            }).name
          } ${year}`,
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

main();
