export type TravelItem = {
  id: string;
  time?: string;
  title: string;
  type: "flight" | "food" | "hotel" | "landmark" | "museum" | "shopping" | "walk" | "transit" | "note";
  location?: string;
  address?: string;
  summary: string;
  flightDetails?: {
    flightNo: string;
    from: string;
    to: string;
    departure: string;
    arrival: string;
    duration: string;
    terminalFrom?: string;
        terminalTo?: string;
        baggage?: string;
        class?: string;
        validUntil?: string;
      };
  image?: string;
  mapsUrl?: string;
  notionUrl?: string;
  tags?: string[];
};

export type TravelReminder = {
  id: string;
  title: string;
  note?: string;
  notionUrl?: string;
};

export type TravelDay = {
  id: string;
  date: string;
  city: string;
  title: string;
  summary: string;
  coverImage: string;
  mapsEmbedUrl?: string;
  accent: string;
  reminders?: TravelReminder[];
  items: TravelItem[];
};

export type TripData = {
  title: string;
  subtitle: string;
  dateRange: string;
  source: string;
  generatedAt: string;
  days: TravelDay[];
};
