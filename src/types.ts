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
  restaurantGuide?: {
    intro: string;
    menuLinks: Array<{
      label: string;
      url: string;
    }>;
    recommendations: Array<{
      name: string;
      zhName?: string;
      image?: string;
      note?: string;
    }>;
    sources?: Array<{
      label: string;
      url: string;
    }>;
  };
  attractionGuide?: {
    intro: string;
    highlights: Array<{
      name: string;
      zhName?: string;
      image?: string;
      note?: string;
    }>;
    links: Array<{
      label: string;
      url: string;
    }>;
    sources?: Array<{
      label: string;
      url: string;
    }>;
  };
};

export type TravelReminder = {
  id: string;
  title: string;
  note?: string;
  detail?: {
    summary: string;
    sections: Array<{
      title: string;
      items: string[];
    }>;
    links?: Array<{
      label: string;
      url: string;
    }>;
  };
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
