export type TravelExpense = {
  id: string;
  title: string;
  amount: number;
  currency: "TWD" | "AUD";
  category: "lodging" | "attraction" | "transport" | "food" | "shopping" | "other";
  status?: "paid" | "confirmed" | "estimated" | "pending";
  day?: string;
  date?: string;
  location?: string;
  source?: string;
  notionUrl?: string;
};

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
  rentalDetails?: {
    confirmationNo?: string;
    vehicleClass?: string;
    vehicleCode?: string;
    pickup: {
      location: string;
      time: string;
      hours?: string;
    };
    dropoff: {
      location: string;
      time: string;
      hours?: string;
    };
    protection?: string[];
    driverAge?: string;
    payment?: string;
    rateCode?: string;
    notes?: string[];
  };
  expense?: {
    amount: number;
    currency: "TWD" | "AUD";
    category: "lodging" | "attraction" | "transport" | "food" | "shopping" | "other";
    status?: "paid" | "confirmed" | "estimated" | "pending";
    source?: string;
  };
  image?: string;
  mapsUrl?: string;
  bookingInfoUrl?: string;
  notionUrl?: string;
  tags?: string[];
  restaurantGuide?: {
    intro: string;
    menuLinks: Array<{
      label: string;
      url: string;
    }>;
    menuEmbeds?: Array<{
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
  expenses?: TravelExpense[];
  days: TravelDay[];
};
