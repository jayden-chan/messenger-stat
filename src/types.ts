export type Thread = {
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
  photos?: {
    uri: string;
    creation_timestamp: number;
  }[];
  videos?: {
    uri: string;
    creation_timestamp: number;
    thumbnail: {
      uri: string;
    };
  }[];
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
  participantsMedia: {
    [key: string]: number;
  };
  words: number;
  chars: number;
  globalMax: [string, number];
  longest: [string, string, number];
  avgResp: number;
  wordMap: [string, number][];
};
