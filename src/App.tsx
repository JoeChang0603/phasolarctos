import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, PointerEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  Balloon,
  BellRing,
  Beef,
  Banknote,
  BookOpenText,
  BottleWine,
  BusFront,
  CalendarDays,
  CarFront,
  ChartNoAxesColumn,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Croissant,
  Dessert,
  Drumstick,
  EggFried,
  ExternalLink,
  Fish,
  GraduationCap,
  Hotel,
  IceCreamBowl,
  Landmark,
  Luggage,
  LogOut,
  MapPin,
  Maximize2,
  Navigation,
  PawPrint,
  PlaneTakeoff,
  PersonStanding,
  Plane,
  Plus,
  ReceiptText,
  Sandwich,
  ShoppingBag,
  Sparkles,
  Soup,
  TicketCheck,
  Tickets,
  Trash2,
  TreePine,
  TrainFront,
  TrainFrontTunnel,
  TrainTrack,
  Utensils,
  Waves,
  X,
} from "lucide-react";
import melbourneSkybusAirportImage from "./assets/melbourne-skybus-airport.png";
import melbourneSkybusSouthernCrossImage from "./assets/melbourne-skybus-southern-cross.png";
import melbourneTrainMapImage from "./assets/melbourne-train-network-map.png";
import tramMapImage from "./assets/melbourne-tram-network.png";
import sydneyAirportLineImage from "./assets/sydney-t8-airport-line.png";
import sydneyBusNetworkImage from "./assets/sydney-bus-network-map.jpg";
import sydneyFerriesImage from "./assets/sydney-ferries-network-map.png";
import sydneyLightRailImage from "./assets/sydney-light-rail-network-map.png";
import sydneyMetroRailImage from "./assets/sydney-metro-rail-network-map.png";
import tripJson from "./data/trip.json";
import type { TravelDay, TravelExpense, TravelItem, TravelReminder, TripData } from "./types";

const trip = tripJson as TripData;
const googleMapsEmbedApiKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY;
const googleMapsStaticApiKey =
  import.meta.env.VITE_GOOGLE_MAPS_STATIC_API_KEY || googleMapsEmbedApiKey;
const expenseApiUrl = import.meta.env.VITE_EXPENSE_API_URL;
const expenseActivitiesUrl = expenseApiUrl ? `${expenseApiUrl.replace(/\/$/, "")}/activities` : "";
const expenseRatesUrl = expenseApiUrl ? `${expenseApiUrl.replace(/\/$/, "")}/rates` : "";

type TransitMap = {
  id:
    | "melbourne-skybus"
    | "melbourne-train"
    | "melbourne-tram"
    | "sydney-airport"
    | "sydney-bus"
    | "sydney-ferries"
    | "sydney-light-rail"
    | "sydney-metro";
  label: string;
  image: string;
  secondaryImages?: { src: string; label: string }[];
  icon: typeof TrainFront;
};

type TransitCity = {
  id: "sydney" | "melbourne";
  label: string;
  icon: typeof Sparkles;
  maps: TransitMap[];
};

type RouteCoordinate = {
  lat: number;
  lng: number;
  label: string;
};

type OverviewIcon = {
  key: string;
  label: string;
  icon: typeof MapPin;
};

type OverviewIconGroup = {
  key: "attractions" | "food" | "transport";
  label: string;
  icons: OverviewIcon[];
};

type HeroSlide = {
  src: string;
  label: string;
};

type TripMember = {
  id: "joe" | "girlfriend" | "mom" | "brother" | "guest";
  label: string;
  role: string;
  description: string;
  accent: string;
  hair: string;
  outfit: string;
  accessory: "cap" | "ribbon" | "glasses" | "hoodie";
};

const activeMemberStorageKey = "phasolarctos-active-member";

const tripMembers: TripMember[] = [
  {
    id: "joe",
    label: "昀",
    role: "行程控",
    description: "負責地圖、花費與每日節奏。",
    accent: "#1f9fb6",
    hair: "#25201c",
    outfit: "#0f766e",
    accessory: "cap",
  },
  {
    id: "girlfriend",
    label: "宇軒",
    role: "美食雷達",
    description: "把咖啡、甜點和照片點都收好。",
    accent: "#e56f8f",
    hair: "#3a2418",
    outfit: "#c026d3",
    accessory: "ribbon",
  },
  {
    id: "mom",
    label: "靜慧",
    role: "安心管家",
    description: "確認時間、交通和每段銜接。",
    accent: "#f59e0b",
    hair: "#5f5147",
    outfit: "#b45309",
    accessory: "glasses",
  },
  {
    id: "brother",
    label: "堯",
    role: "衝刺支援",
    description: "快速查點、補位和看顧突發狀況。",
    accent: "#4f46e5",
    hair: "#1f2937",
    outfit: "#2563eb",
    accessory: "hoodie",
  },
  {
    id: "guest",
    label: "訪客",
    role: "訪客入口",
    description: "只看行程與花費統計。",
    accent: "#64748b",
    hair: "#3f3f46",
    outfit: "#475569",
    accessory: "cap",
  },
];

const heroFallbackSlidesByDayId: Record<string, HeroSlide[]> = {
  "day-0-departure": [
    {
      src: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1800&q=85",
      label: "Sydney",
    },
    {
      src: "https://images.unsplash.com/photo-1494515843206-f3117d3f51b7?auto=format&fit=crop&w=1800&q=85",
      label: "Sydney Airport",
    },
    {
      src: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1800&q=85",
      label: "Central Station",
    },
  ],
};

const itemIcons: Record<TravelItem["type"], typeof MapPin> = {
  flight: Navigation,
  food: Utensils,
  hotel: MapPin,
  landmark: Sparkles,
  museum: Sparkles,
  shopping: Sparkles,
  walk: Waves,
  transit: Navigation,
  note: CalendarDays,
};

function isMovingItem(item: TravelItem) {
  return item.type === "transit" || item.type === "walk";
}

function movingIconForItem(item: TravelItem) {
  const tags = item.tags?.map((tag) => tag.toLowerCase()) ?? [];
  const text = `${item.title} ${item.location ?? ""} ${item.summary} ${item.tags?.join(" ") ?? ""}`
    .toLowerCase();

  if (tags.some((tag) => tag === "subway" || tag === "metro") || text.includes("地鐵")) {
    return TrainFrontTunnel;
  }
  if (tags.includes("ferry") || text.includes("渡輪") || text.includes("船")) return Waves;
  if (
    tags.some((tag) => tag === "tram" || tag === "train" || tag === "rail") ||
    text.includes("電車") ||
    text.includes("輕軌") ||
    text.includes("火車")
  ) {
    return TrainFront;
  }
  if (tags.includes("bus") || text.includes("公車") || text.includes("巴士")) return BusFront;
  if (item.type === "walk" || tags.some((tag) => tag === "walk" || tag === "walking")) {
    return PersonStanding;
  }
  if (
    tags.some((tag) => tag === "driving" || tag === "drive" || tag === "car" || tag === "rental-car") ||
    /\bdriving\b|\bdrive\b|\bcar\b/.test(text) ||
    text.includes("自駕") ||
    text.includes("租車")
  ) {
    return CarFront;
  }
  if (text.includes("subway") || text.includes("metro")) return TrainFrontTunnel;
  if (text.includes("ferry")) return Waves;
  if (text.includes("tram") || text.includes("train") || text.includes("rail") || text.includes("light rail")) {
    return TrainFront;
  }
  if (text.includes("bus")) return BusFront;
  if (text.includes("walk") || text.includes("步行") || text.includes("走路")) return PersonStanding;

  return Navigation;
}

function pointLabel(item: TravelItem | undefined, fallback: string) {
  if (!item) return fallback;
  return item.location ?? item.title;
}

function movingLocationEndpoints(item: TravelItem) {
  const separators = [" to ", " To ", " TO ", "→", "->"];
  const location = item.location ?? "";
  const separator = separators.find((candidate) => location.includes(candidate));
  if (!separator) return null;

  const [from, to] = location.split(separator).map((part) => part.trim());
  if (!from || !to) return null;

  return { from, to };
}

function movingEndpoints(day: TravelDay, items: TravelItem[], index: number) {
  const locationEndpoints = movingLocationEndpoints(items[index]);
  if (locationEndpoints) return locationEndpoints;

  const previousAnchor = [...items.slice(0, index)].reverse().find((item) => !isMovingItem(item));
  const nextAnchor = items.slice(index + 1).find((item) => !isMovingItem(item));
  const current = items[index];

  return {
    from: pointLabel(previousAnchor, current.location ?? day.city),
    to: pointLabel(nextAnchor, current.location ?? day.city),
  };
}

function isMovingConnectorItem(item: TravelItem) {
  return isMovingItem(item) && item.tags?.includes("moving");
}

function movingDurationLabel(item: TravelItem) {
  const durationById: Record<string, string> = {
    "3682f57c-ec1b-8079-b536-f7d5e05e5fcf": "約 15-30 分鐘",
    "3702f57c-ec1b-808e-865a-f6a3eedfba49": "約 5 分鐘",
    "3702f57c-ec1b-801c-9a3b-cbb688d89fc4": "約 5 分鐘",
    "3682f57c-ec1b-80be-9bd8-d8dbddd4c847": "約 15 分鐘",
    "3702f57c-ec1b-805c-abc7-d0144d57ed97": "約 20 分鐘",
    "3712f57c-ec1b-80b7-ada2-d9ae093ef201": "約 30 分鐘",
    "3702f57c-ec1b-8009-92d5-cd1d6632332b": "約 10 分鐘",
    "3682f57c-ec1b-80d1-a9d2-f341286da030": "約 30 分鐘",
    "3682f57c-ec1b-807b-9e99-c48e74efb555": "約 15 分鐘",
    "3682f57c-ec1b-8026-af7f-f03c91be2a39": "約 35 分鐘",
    "3702f57c-ec1b-80f5-8667-c5f1fcf64d8b": "約 15 分鐘",
    "3712f57c-ec1b-807b-9a77-dcf7bc5e044f": "約 30 分鐘",
    "3702f57c-ec1b-8047-b392-dcd3f9ff576b": "約 15 分鐘",
    "3692f57c-ec1b-80ee-b345-f2d9e29b2647": "約 30 分鐘",
    "3712f57c-ec1b-80bf-ba49-f99a1eccaf5d": "約 10 分鐘",
    "3712f57c-ec1b-809d-87cf-e91fc4c4aac6": "約 15 分鐘",
    "2db2f57c-ec1b-806f-99f3-e07cc1be667e": "約 30 分鐘",
    "36a2f57c-ec1b-8077-b5f7-ebb870710015": "約 1 小時 30 分鐘",
    "36a2f57c-ec1b-803b-b9ab-c4251ff7c40e": "約 2 小時",
    "36d2f57c-ec1b-80b8-a3f9-f840f6ec5863": "約 2 小時 30 分鐘",
    "3712f57c-ec1b-80d9-a858-fea2d39f9d83": "約 5 分鐘",
    "3712f57c-ec1b-8087-91bf-da0f1d1132db": "約 10 分鐘",
    "36e2f57c-ec1b-803a-99b7-f5c6bc553b63": "約 10 分鐘",
    "36e2f57c-ec1b-8039-b321-c6e2bf5c6922": "約 1 小時",
    "36e2f57c-ec1b-801f-8032-c82a61db6810": "約 1 小時",
    "36f2f57c-ec1b-806a-a0ca-dcf6a54db124": "約 30 分鐘",
    "3712f57c-ec1b-809f-92fd-ee2f692fe655": "約 5 分鐘",
    "3712f57c-ec1b-80ee-a746-fb2cca9d5e5e": "約 20 分鐘",
    "36f2f57c-ec1b-80aa-b0b5-e828532cb3ac": "約 1 小時 40 分鐘",
    "3702f57c-ec1b-80a5-997f-d182e3587fff": "約 1 小時 50 分鐘",
    "3712f57c-ec1b-800c-9b87-ea071a131152": "約 40 分鐘",
    "3712f57c-ec1b-804f-aeb2-d939c850298c": "約 15 分鐘",
    "3712f57c-ec1b-80c4-9e1c-e0dc548c8024": "約 10 分鐘",
    "3712f57c-ec1b-8050-a760-d0d1bdc234e1": "約 10 分鐘",
    "3712f57c-ec1b-8013-b7c1-fedebadae31d": "約 10 分鐘",
    "3712f57c-ec1b-8072-a611-e8bb250f4365": "約 1 小時 10 分鐘",
    "3712f57c-ec1b-801a-80af-cfc56cfa20b8": "約 30 分鐘",
    "3712f57c-ec1b-8083-87a5-d929233b75ab": "約 30 分鐘",
    "3712f57c-ec1b-8099-a02f-d7b214cacf34": "約 10 分鐘",
    "3712f57c-ec1b-803f-afa2-e6a01506b730": "約 10 分鐘",
    "3712f57c-ec1b-8045-9d9b-e9f926fe9996": "約 5 分鐘",
    "3722f57c-ec1b-80dd-b632-e62042a01cbe": "約 1 小時",
    "3722f57c-ec1b-80be-858a-dbda59ba86b1": "約 1 小時",
    "3722f57c-ec1b-80d4-ba3e-f07c55dc2986": "約 10 分鐘",
    "3722f57c-ec1b-80f7-8898-f7b5a3ba7181": "約 30 分鐘",
    "3722f57c-ec1b-8042-a206-d175a4aaaf3a": "約 20 分鐘",
    "2e62f57c-ec1b-804e-b404-eeb6f6e6a668": "約 40 分鐘",
  };

  return durationById[item.id] ?? "依當日交通狀況調整";
}

const transitCities: TransitCity[] = [
  {
    id: "sydney",
    label: "Sydney",
    icon: Waves,
    maps: [
      {
        id: "sydney-airport",
        label: "Sydney Airport Line",
        image: sydneyAirportLineImage,
        icon: Plane,
      },
      {
        id: "sydney-light-rail",
        label: "Sydney Light Rail Map",
        image: sydneyLightRailImage,
        icon: TrainFront,
      },
      {
        id: "sydney-bus",
        label: "Sydney Bus Map",
        image: sydneyBusNetworkImage,
        icon: BusFront,
      },
      {
        id: "sydney-metro",
        label: "Sydney Metro / Rail Map",
        image: sydneyMetroRailImage,
        icon: TrainFront,
      },
      {
        id: "sydney-ferries",
        label: "Sydney Ferries Map",
        image: sydneyFerriesImage,
        icon: Waves,
      },
    ],
  },
  {
    id: "melbourne",
    label: "Melbourne",
    icon: Sparkles,
    maps: [
      {
        id: "melbourne-tram",
        label: "Melbourne Tram Map",
        image: tramMapImage,
        icon: TrainFront,
      },
      {
        id: "melbourne-train",
        label: "Melbourne Train Map",
        image: melbourneTrainMapImage,
        icon: TrainFront,
      },
      {
        id: "melbourne-skybus",
        label: "Melbourne SkyBus Map",
        image: melbourneSkybusSouthernCrossImage,
        secondaryImages: [
          {
            src: melbourneSkybusAirportImage,
            label: "Melbourne Airport SkyBus Stops",
          },
        ],
        icon: BusFront,
      },
    ],
  },
];

const dayRouteCoordinates: Record<string, RouteCoordinate[]> = {
  "day-1-sydney-arrival": [
    { lat: -33.9399, lng: 151.1753, label: "Sydney Airport" },
    { lat: -33.8827, lng: 151.2069, label: "Central Station" },
    { lat: -33.8781, lng: 151.2034, label: "Furama Darling Harbour" },
    { lat: -33.8774, lng: 151.2020, label: "Auvers Dining Darling Square" },
    { lat: -33.8781, lng: 151.2034, label: "Furama Darling Harbour Check-in" },
    { lat: -33.8886, lng: 151.1873, label: "The University of Sydney" },
    { lat: -33.8982, lng: 151.1786, label: "Macelleria Newtown" },
  ],
  "day-2-sydney-harbour-zoo": [
    { lat: -33.8781, lng: 151.2034, label: "Furama Darling Harbour" },
    { lat: -33.8775, lng: 151.2029, label: "Edition Roasters Darling Square" },
    { lat: -33.8600, lng: 151.2126, label: "Eastern Pontoon Circular Quay" },
    { lat: -33.8457, lng: 151.2396, label: "Taronga Zoo Wharf" },
    { lat: -33.8420, lng: 151.2415, label: "Taronga Zoo Sydney" },
    { lat: -33.8457, lng: 151.2396, label: "Taronga Zoo Wharf" },
    { lat: -33.8600, lng: 151.2126, label: "Circular Quay" },
    { lat: -33.8568, lng: 151.2153, label: "Sydney Opera House" },
    { lat: -33.8599, lng: 151.2090, label: "Munich Brauhaus Sydney" },
    { lat: -33.8781, lng: 151.2034, label: "Furama Darling Harbour" },
  ],
  "day-3-sydney-to-melbourne": [
    { lat: -33.8781, lng: 151.2034, label: "Furama Darling Harbour" },
    { lat: -33.8799, lng: 151.2104, label: "Paramount Coffee Project" },
    { lat: -33.8781, lng: 151.2034, label: "Furama Darling Harbour Checkout" },
    { lat: -33.8699, lng: 151.2027, label: "SEA LIFE Sydney Aquarium" },
    { lat: -33.8694, lng: 151.2022, label: "Betty's Burgers" },
    { lat: -33.8781, lng: 151.2034, label: "Furama Darling Harbour Luggage" },
    { lat: -33.8827, lng: 151.2069, label: "Central Station" },
    { lat: -33.9329, lng: 151.1806, label: "Sydney Domestic Airport T2" },
    { lat: -37.6690, lng: 144.8410, label: "Melbourne Airport" },
    { lat: -37.6706, lng: 144.8496, label: "Novotel Melbourne Airport" },
  ],
  "day-4-yarra-valley": [
    { lat: -37.6706, lng: 144.8496, label: "Novotel Melbourne Airport" },
    { lat: -37.6708, lng: 144.8430, label: "Hertz Melbourne Airport" },
    { lat: -37.5750, lng: 143.8664, label: "Sovereign Hill, Ballarat" },
    { lat: -37.6321, lng: 145.4012, label: "Balgownie Estate Yarra Valley" },
    { lat: -37.6321, lng: 145.4012, label: "Restaurant 1309" },
  ],
  "day-5-balloon-phillip-island": [
    { lat: -37.6321, lng: 145.4012, label: "Balgownie Estate Yarra Valley" },
    { lat: -38.4526, lng: 145.2383, label: "Coles Cowes" },
    { lat: -38.4493, lng: 145.2387, label: "Pika Sushi Cowes" },
    { lat: -38.4632, lng: 145.2012, label: "Hilltop Apartments Phillip Island" },
    { lat: -38.5066, lng: 145.1497, label: "Phillip Island Penguin Parade" },
  ],
  "day-6-dandenong": [
    { lat: -38.4632, lng: 145.2012, label: "Hilltop Apartments Phillip Island" },
    { lat: -38.4867, lng: 145.2644, label: "Koala Conservation Reserve" },
    { lat: -38.2111, lng: 145.2508, label: "Moonlit Sanctuary" },
    { lat: -37.8074, lng: 144.9624, label: "Hertz Franklin Street" },
    { lat: -37.8210, lng: 144.9417, label: "Melbourne Lifestyle Apartments" },
    { lat: -37.8196, lng: 144.9450, label: "Sher Singh" },
  ],
  "day-7-melbourne-city": [
    { lat: -37.8210, lng: 144.9417, label: "Melbourne Lifestyle Apartments" },
    { lat: -37.8159, lng: 144.9531, label: "Higher Ground" },
    { lat: -37.8312, lng: 144.9579, label: "South Melbourne Market" },
    { lat: -37.8304, lng: 144.9733, label: "Shrine of Remembrance" },
    { lat: -37.8304, lng: 144.9800, label: "Royal Botanic Gardens Melbourne" },
    { lat: -37.8206, lng: 144.9585, label: "SEA LIFE Melbourne Aquarium" },
    { lat: -37.8138, lng: 144.9604, label: "Max on Hardware" },
  ],
  "day-8-melbourne-museum": [
    { lat: -37.8210, lng: 144.9417, label: "Melbourne Lifestyle Apartments" },
    { lat: -37.7825, lng: 144.9752, label: "Monforte Viennoiserie" },
    { lat: -37.8012, lng: 144.9667, label: "Good Measure" },
    { lat: -37.8054, lng: 144.9714, label: "Carlton Gardens" },
    { lat: -37.8033, lng: 144.9717, label: "Melbourne Museum" },
    { lat: -37.7981, lng: 144.9755, label: "Mile End Bagels" },
    { lat: -37.8033, lng: 144.9717, label: "Melbourne Museum" },
    { lat: -37.8036, lng: 144.9667, label: "Beku Gelato Carlton" },
    { lat: -37.8122, lng: 144.9723, label: "San Telmo" },
    { lat: -37.8210, lng: 144.9417, label: "Melbourne Lifestyle Apartments" },
  ],
  "day-9-melbourne-return": [
    { lat: -37.8210, lng: 144.9417, label: "Melbourne Lifestyle Apartments" },
    { lat: -37.8030, lng: 144.9590, label: "Seven Seeds Coffee Roasters" },
    { lat: -37.7983, lng: 144.9610, label: "University of Melbourne" },
    { lat: -37.8076, lng: 144.9568, label: "Queen Victoria Market" },
    { lat: -37.8106, lng: 144.9545, label: "Flagstaff Gardens" },
    { lat: -37.8156, lng: 144.9704, label: "Chin Chin" },
    { lat: -37.8107, lng: 144.9635, label: "Kumo Desserts" },
    { lat: -37.8097, lng: 144.9655, label: "State Library Victoria" },
    { lat: -37.8111, lng: 144.9670, label: "Stalactites Restaurant" },
    { lat: -37.8210, lng: 144.9417, label: "Melbourne Lifestyle Apartments" },
    { lat: -37.8184, lng: 144.9525, label: "Southern Cross Station" },
    { lat: -37.6708, lng: 144.8430, label: "Melbourne Airport T2" },
  ],
};

function accentStyle(accent: string): CSSProperties & Record<"--accent", string> {
  return { "--accent": accent };
}

function formatDay(date: string) {
  return new Intl.DateTimeFormat("zh-Hant", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${date}T00:00:00`));
}

function formatRailDate(date: string) {
  return new Intl.DateTimeFormat("zh-Hant", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function dayLabel(day: TravelDay, fallbackIndex: number) {
  const match = day.id.match(/^day-(\d+)/);
  const dayNumber = match ? Number(match[1]) : fallbackIndex;
  return `Day ${dayNumber}`;
}

function mapQueryFromUrl(mapsUrl?: string) {
  if (!mapsUrl) return "";

  try {
    const url = new URL(mapsUrl);
    return url.searchParams.get("query") ?? "";
  } catch {
    return "";
  }
}

function routePoint(day: TravelDay, item: TravelItem) {
  return mapQueryFromUrl(item.mapsUrl) || item.location || `${item.title} ${day.city}`;
}

function flightRouteForDay(day: TravelDay) {
  const hasGroundItinerary = day.items.some((item) => item.type !== "note" && item.type !== "flight");
  if (hasGroundItinerary) return undefined;

  return day.items.find((item) => item.type === "flight" && item.flightDetails)?.flightDetails;
}

function routePointsForDay(day: TravelDay) {
  const coordinatePoints = dayRouteCoordinates[day.id];
  if (coordinatePoints?.length) {
    return coordinatePoints.map((point) => `${point.lat},${point.lng}`);
  }

  return Array.from(
    new Set(
      day.items
        .filter((item) => item.type !== "note" && item.type !== "flight")
        .map((item) => routePoint(day, item).trim())
        .filter(Boolean),
    ),
  );
}

function routeCoordinateBounds(coordinates: RouteCoordinate[]) {
  const lats = coordinates.map((point) => point.lat);
  const lngs = coordinates.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return {
    center: {
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2,
    },
    latSpan: Math.max(maxLat - minLat, 0.01),
    lngSpan: Math.max(maxLng - minLng, 0.01),
  };
}

function routeStaticZoom(day: TravelDay) {
  const coordinates = dayRouteCoordinates[day.id];
  if (!coordinates?.length) return null;

  const { latSpan, lngSpan } = routeCoordinateBounds(coordinates);
  const span = Math.max(latSpan, lngSpan);

  if (span > 6) return 5;
  if (span > 3) return 6;
  if (span > 1.5) return 7;
  if (span > 0.75) return 8;
  if (span > 0.35) return 9;
  if (span > 0.18) return 10;
  if (span > 0.09) return 11;
  if (span > 0.045) return 12;
  return 13;
}

function routeTravelMode(day: TravelDay) {
  const routeText = `${day.id} ${day.city} ${day.title} ${day.items
    .map((item) => `${item.title} ${item.location ?? ""}`)
    .join(" ")}`.toLowerCase();

  if (
    routeText.includes("租車") ||
    routeText.includes("car") ||
    routeText.includes("yarra") ||
    routeText.includes("phillip island") ||
    routeText.includes("sovereign hill") ||
    routeText.includes("puffing billy")
  ) {
    return "driving";
  }

  return "transit";
}

function dayRouteEmbedUrl(day: TravelDay) {
  const points = routePointsForDay(day);
  if (points.length < 2) return day.mapsEmbedUrl;

  const [origin, ...stops] = points;
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1).join("|");

  if (googleMapsEmbedApiKey) {
    const params = new URLSearchParams({
      key: googleMapsEmbedApiKey,
      origin,
      destination,
      mode: routeTravelMode(day),
    });

    if (waypoints) params.set("waypoints", waypoints);

    return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`;
  }

  return `https://maps.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${stops
    .map((point) => encodeURIComponent(point))
    .join("+to:")}&output=embed`;
}

function dayRouteStaticMapUrl(day: TravelDay) {
  const points = routePointsForDay(day);
  if (points.length < 2 || !googleMapsStaticApiKey) return "";
  const coordinates = dayRouteCoordinates[day.id];

  const params = new URLSearchParams({
    key: googleMapsStaticApiKey,
    size: "640x480",
    scale: "2",
    maptype: "roadmap",
  });

  if (coordinates?.length) {
    const { center } = routeCoordinateBounds(coordinates);
    const zoom = routeStaticZoom(day);
    params.set("center", `${center.lat},${center.lng}`);
    if (zoom) params.set("zoom", String(zoom));
  }

  points.forEach((point, index) => {
    const label = index < 9 ? String(index + 1) : String.fromCharCode(56 + index);
    params.append("markers", `color:0x1f9fb6|label:${label}|${point}`);
  });
  params.append("path", `color:0x1f9fb6ff|weight:5|${points.join("|")}`);

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

function dayFlightMapUrl(day: TravelDay) {
  const flight = flightRouteForDay(day);
  if (!flight || !googleMapsStaticApiKey) return "";

  const params = new URLSearchParams({
    key: googleMapsStaticApiKey,
    size: "640x480",
    scale: "2",
    maptype: "roadmap",
  });

  params.append("markers", `color:0x1f9fb6|label:T|${flight.from}`);
  params.append("markers", `color:0xef7d57|label:S|${flight.to}`);
  params.append("path", `geodesic:true|color:0x1f9fb6ff|weight:4|${flight.from}|${flight.to}`);

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

function dayRouteOpenUrl(day: TravelDay) {
  const points = routePointsForDay(day);
  if (points.length < 2) {
    const flight = flightRouteForDay(day);
    if (!flight) return day.mapsEmbedUrl?.replace("&output=embed", "") ?? "";

    const params = new URLSearchParams({
      api: "1",
      origin: flight.from,
      destination: flight.to,
    });

    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  const [origin, destination] = [points[0], points[points.length - 1]];
  const waypoints = points.slice(1, -1).join("|");
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: routeTravelMode(day),
  });

  if (waypoints) params.set("waypoints", waypoints);

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function parseClockTime(time?: string) {
  const match = time?.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function formatClock(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function useCurrentTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return now;
}

function currentMarkerIndex(items: TravelItem[], nowMinutes: number) {
  const nextTimedIndex = items.findIndex((item) => {
    const itemMinutes = parseClockTime(item.time);
    return itemMinutes !== null && itemMinutes > nowMinutes;
  });

  return nextTimedIndex === -1 ? items.length : nextTimedIndex;
}

function keyStopsForDay(day: TravelDay) {
  return day.items
    .filter((item) => !isMovingConnectorItem(item) && item.type !== "note" && item.type !== "flight")
    .map((item) => item.location ?? item.title)
    .filter(Boolean);
}

function dayTimeRange(day: TravelDay) {
  const times = day.items
    .map((item) => parseClockTime(item.time))
    .filter((time): time is number => time !== null);

  if (!times.length) return "彈性";

  return `${formatClock(Math.min(...times))} - ${formatClock(Math.max(...times))}`;
}

function daySummaryParagraphs(day: TravelDay) {
  return [day.summary].filter(Boolean);
}

function heroSlideLabelForItem(day: TravelDay, item: TravelItem) {
  if (item.location) return item.location;
  if (item.flightDetails) return `${item.flightDetails.from} → ${item.flightDetails.to}`;
  if (item.type === "hotel" || item.type === "food" || item.type === "landmark" || item.type === "museum") {
    return item.title;
  }
  return day.city;
}

function normalizeHeroSlideLabel(label: string) {
  return label
    .replace(/\s+(to|To|TO)\s+/g, " / ")
    .replace(/\s*(→|->)\s*/g, " / ")
    .trim();
}

function heroSlidesForDay(day: TravelDay) {
  const slides: HeroSlide[] = [];
  const seen = new Set<string>();

  const addSlide = (src: string | undefined, label: string) => {
    if (!src || seen.has(src)) return;
    seen.add(src);
    slides.push({ src, label: normalizeHeroSlideLabel(label) });
  };

  addSlide(day.coverImage, day.city);

  day.items.forEach((item) => {
    if (item.type === "transit" || item.type === "walk") return;

    const itemPlaceLabel = heroSlideLabelForItem(day, item);

    addSlide(item.image, itemPlaceLabel);
    item.attractionGuide?.highlights.forEach((highlight) => {
      addSlide(highlight.image, itemPlaceLabel);
    });
    item.restaurantGuide?.recommendations.forEach((recommendation) => {
      addSlide(recommendation.image, itemPlaceLabel);
    });
  });

  heroFallbackSlidesByDayId[day.id]?.forEach((slide) => addSlide(slide.src, slide.label));

  return slides.slice(0, 14);
}

function textForItem(item: TravelItem) {
  const recommendations =
    item.restaurantGuide?.recommendations
      .flatMap((recommendation) => [
        recommendation.name,
        recommendation.zhName ?? "",
        recommendation.note ?? "",
      ])
      .join(" ") ?? "";

  return `${item.title} ${item.location ?? ""} ${item.summary} ${item.tags?.join(" ") ?? ""} ${recommendations}`
    .toLowerCase();
}

function foodIconForItem(item: TravelItem): OverviewIcon {
  const text = textForItem(item);

  if (text.includes("macelleria") || text.includes("san telmo")) {
    return { key: "food-steak", label: "牛排", icon: Beef };
  }
  if (text.includes("auvers")) {
    return { key: "food-pasta", label: "義大利麵", icon: Utensils };
  }
  if (text.includes("edition roasters") || text.includes("paramount coffee project")) {
    return { key: "food-brunch", label: "早午餐", icon: EggFried };
  }
  if (text.includes("novotel melbourne airport") || text.includes("balgownie estate 飯店早餐")) {
    return { key: "food-breakfast", label: "早餐", icon: EggFried };
  }
  if (text.includes("coles cowes 早餐")) {
    return { key: "food-supply-breakfast", label: "早餐補給", icon: Sandwich };
  }
  if (text.includes("taronga zoo")) {
    return { key: "food-fish-chips", label: "魚薯條", icon: Fish };
  }
  if (text.includes("pika sushi")) {
    return { key: "food-sushi", label: "壽司", icon: Fish };
  }
  if (text.includes("sher singh")) {
    return { key: "food-curry", label: "咖哩", icon: Soup };
  }
  if (text.includes("betty's burgers")) {
    return { key: "food-burger", label: "漢堡", icon: Sandwich };
  }
  if (text.includes("melbourne airport")) {
    return { key: "food-fast-food", label: "速食", icon: Sandwich };
  }
  if (text.includes("restaurant 1309")) {
    return { key: "food-winery", label: "酒莊餐", icon: BottleWine };
  }
  if (text.includes("phillip island 晚餐")) {
    return { key: "food-dinner", label: "晚餐", icon: Utensils };
  }
  if (text.includes("moonlit sanctuary")) {
    return { key: "food-light-meal", label: "輕食", icon: Sandwich };
  }
  if (text.includes("higher ground")) {
    return { key: "food-brunch", label: "早午餐", icon: EggFried };
  }
  if (text.includes("max on hardware")) {
    return { key: "food-italian", label: "義式料理", icon: Utensils };
  }
  if (text.includes("monforte")) {
    return { key: "food-croissant", label: "可頌", icon: Croissant };
  }
  if (text.includes("good measure") || text.includes("seven seeds")) {
    return { key: "food-coffee", label: "咖啡", icon: Coffee };
  }
  if (text.includes("mile end bagels")) {
    return { key: "food-bagel", label: "貝果", icon: Sandwich };
  }
  if (text.includes("bekù") || text.includes("beku gelato")) {
    return { key: "food-gelato", label: "Gelato", icon: IceCreamBowl };
  }
  if (text.includes("chin chin")) {
    return { key: "food-asian", label: "亞洲料理", icon: Soup };
  }
  if (text.includes("kumo desserts")) {
    return { key: "food-dessert", label: "舒芙蕾", icon: Dessert };
  }
  if (text.includes("stalactites")) {
    return { key: "food-greek", label: "希臘捲餅", icon: Sandwich };
  }
  if (text.includes("munich brauhaus")) {
    return { key: "food-pork", label: "豬排", icon: Drumstick };
  }

  if (
    text.includes("burger") ||
    text.includes("hamburger") ||
    text.includes("漢堡")
  ) {
    return { key: "food-burger", label: "漢堡", icon: Sandwich };
  }
  if (
    text.includes("steak") ||
    text.includes("beef") ||
    text.includes("parrilla") ||
    text.includes("macelleria") ||
    text.includes("san telmo") ||
    text.includes("牛排") ||
    text.includes("烤肉")
  ) {
    return { key: "food-steak", label: "牛排", icon: Beef };
  }
  if (
    text.includes("schnitzel") ||
    text.includes("pork") ||
    text.includes("brauhaus") ||
    text.includes("munich") ||
    text.includes("豬排") ||
    text.includes("德式")
  ) {
    return { key: "food-pork", label: "豬排", icon: Drumstick };
  }
  if (text.includes("sushi") || text.includes("壽司")) {
    return { key: "food-sushi", label: "壽司", icon: Fish };
  }
  if (
    text.includes("curry") ||
    text.includes("indian") ||
    text.includes("sher singh") ||
    text.includes("咖哩") ||
    text.includes("印度")
  ) {
    return { key: "food-curry", label: "咖哩", icon: Soup };
  }
  if (
    text.includes("gelato") ||
    text.includes("ice cream") ||
    text.includes("ice-cream") ||
    text.includes("冰淇淋")
  ) {
    return { key: "food-gelato", label: "Gelato", icon: IceCreamBowl };
  }
  if (
    text.includes("soufflé") ||
    text.includes("souffle") ||
    text.includes("dessert") ||
    text.includes("kumo") ||
    text.includes("甜點") ||
    text.includes("點心")
  ) {
    return { key: "food-dessert", label: "甜點", icon: Dessert };
  }
  if (
    text.includes("viennoiserie") ||
    text.includes("croissant") ||
    text.includes("可頌")
  ) {
    return { key: "food-croissant", label: "可頌", icon: Croissant };
  }
  if (
    text.includes("bagel") ||
    text.includes("sandwich") ||
    text.includes("bakery") ||
    text.includes("bread") ||
    text.includes("貝果") ||
    text.includes("麵包") ||
    text.includes("烘焙")
  ) {
    return { key: "food-bakery", label: "貝果/麵包", icon: Sandwich };
  }
  if (
    text.includes("coffee") ||
    text.includes("roasters") ||
    text.includes("cafe") ||
    text.includes("咖啡")
  ) {
    return { key: "food-coffee", label: "咖啡", icon: Coffee };
  }
  if (
    text.includes("breakfast") ||
    text.includes("brunch") ||
    text.includes("egg") ||
    text.includes("早餐") ||
    text.includes("早午餐")
  ) {
    return { key: "food-breakfast", label: "早午餐", icon: EggFried };
  }
  if (
    text.includes("wine") ||
    text.includes("winery") ||
    text.includes("yarra") ||
    text.includes("酒莊")
  ) {
    return { key: "food-winery", label: "酒莊餐", icon: BottleWine };
  }
  if (
    text.includes("thai") ||
    text.includes("chin chin") ||
    text.includes("asian") ||
    text.includes("rice") ||
    text.includes("noodle") ||
    text.includes("泰式") ||
    text.includes("亞洲") ||
    text.includes("飯") ||
    text.includes("麵")
  ) {
    return { key: "food-asian", label: "亞洲料理", icon: Soup };
  }
  if (
    text.includes("greek") ||
    text.includes("souvlaki") ||
    text.includes("gyro") ||
    text.includes("stalactites") ||
    text.includes("希臘")
  ) {
    return { key: "food-greek", label: "希臘捲餅", icon: Sandwich };
  }

  return { key: "food-meal", label: "餐點", icon: Utensils };
}

function overviewIconForItem(item: TravelItem): OverviewIcon | null {
  const text = textForItem(item);

  if (
    isMovingItem(item) ||
    item.type === "flight" ||
    item.type === "note"
  ) {
    return null;
  }

  if (item.type === "food") {
    return foodIconForItem(item);
  }

  if (text.includes("balgownie estate") || text.includes("酒莊")) {
    return { key: "winery", label: "酒莊", icon: BottleWine };
  }

  if (item.type === "hotel") return null;

  if (text.includes("airport") || text.includes("機場")) return null;

  if (text.includes("library") || text.includes("圖書館")) {
    return { key: "library", label: "圖書館", icon: BookOpenText };
  }
  if (text.includes("opera house") || text.includes("歌劇院")) {
    return { key: "opera-house", label: "歌劇院", icon: Landmark };
  }
  if (text.includes("sea life") || text.includes("aquarium") || text.includes("海洋館") || text.includes("水族館")) {
    return { key: "aquarium", label: "海洋館", icon: Fish };
  }
  if (text.includes("balloon") || text.includes("熱氣球")) {
    return { key: "balloon", label: "熱氣球", icon: Balloon };
  }
  if (text.includes("puffing billy") || text.includes("steam train") || text.includes("蒸汽火車")) {
    return { key: "steam-railway", label: "蒸汽火車體驗", icon: TrainTrack };
  }
  if (text.includes("university") || text.includes("大學") || text.includes("校園")) {
    return { key: "university", label: "校園", icon: GraduationCap };
  }
  if (
    text.includes("zoo") ||
    text.includes("taronga") ||
    text.includes("koala") ||
    text.includes("penguin") ||
    text.includes("moonlit") ||
    text.includes("動物園") ||
    text.includes("無尾熊") ||
    text.includes("企鵝")
  ) {
    return { key: "wildlife", label: "動物", icon: PawPrint };
  }
  if (
    text.includes("garden") ||
    text.includes("gardens") ||
    text.includes("park") ||
    text.includes("reserve") ||
    text.includes("公園") ||
    text.includes("花園") ||
    text.includes("保護區")
  ) {
    return { key: "park", label: "公園", icon: TreePine };
  }
  if (text.includes("sovereign hill") || text.includes("淘金鎮") || text.includes("掏金鎮")) {
    return { key: "gold-rush-town", label: "淘金鎮", icon: Landmark };
  }
  if (text.includes("melbourne museum")) {
    return { key: "museum", label: "博物館", icon: Landmark };
  }
  if (text.includes("museum") || text.includes("展館") || text.includes("博物館")) {
    return { key: "museum", label: "展館", icon: Landmark };
  }
  if (
    item.type === "shopping" ||
    text.includes("market") ||
    text.includes("shopping") ||
    text.includes("coles") ||
    text.includes("採買") ||
    text.includes("市場")
  ) {
    return { key: "shopping", label: "採買", icon: ShoppingBag };
  }
  if (item.type === "landmark") {
    return { key: "landmark", label: "地標", icon: Landmark };
  }
  if (item.type === "museum") {
    return { key: "museum", label: "展館", icon: Landmark };
  }
  return null;
}

function transportIconForItem(item: TravelItem): OverviewIcon | null {
  const text = textForItem(item);

  if (item.type === "flight") {
    return { key: "transport-flight", label: "飛機", icon: Plane };
  }
  if (
    text.includes("hertz") ||
    text.includes("driving") ||
    text.includes("drive") ||
    text.includes("car") ||
    text.includes("自駕") ||
    text.includes("租車")
  ) {
    return { key: "transport-car", label: "自駕/租車", icon: CarFront };
  }
  if (!isMovingItem(item)) return null;

  if (text.includes("airport link") || text.includes("subway") || text.includes("metro") || text.includes("地鐵")) {
    return { key: "transport-metro", label: "地鐵/機場快線", icon: TrainFrontTunnel };
  }
  if (text.includes("ferry") || text.includes("fantasea") || text.includes("渡輪") || text.includes("船")) {
    return { key: "transport-ferry", label: "渡輪", icon: Waves };
  }
  if (text.includes("skybus") || text.includes("bus") || text.includes("公車") || text.includes("巴士")) {
    return { key: "transport-bus", label: "巴士", icon: BusFront };
  }
  if (
    text.includes("tram") ||
    text.includes("light rail") ||
    text.includes("train") ||
    text.includes("rail") ||
    text.includes("電車") ||
    text.includes("輕軌") ||
    text.includes("火車")
  ) {
    return { key: "transport-rail", label: "電車/火車", icon: TrainFront };
  }
  if (item.type === "walk" || text.includes("walking") || text.includes("walk") || text.includes("步行")) {
    return { key: "transport-walk", label: "步行", icon: PersonStanding };
  }

  return null;
}

function uniqueIcons(items: TravelItem[], iconForItem: (item: TravelItem) => OverviewIcon | null) {
  const icons: OverviewIcon[] = [];
  const seen = new Set<string>();

  items.forEach((item) => {
    const overviewIcon = iconForItem(item);
    if (!overviewIcon) return;
    if (seen.has(overviewIcon.key)) return;
    seen.add(overviewIcon.key);
    icons.push(overviewIcon);
  });

  return icons;
}

function overviewIconGroupsForDay(day: TravelDay): OverviewIconGroup[] {
  const attractionIcons = uniqueIcons(
    day.items.filter((item) => item.type !== "food"),
    overviewIconForItem,
  );
  const foodIcons = uniqueIcons(
    day.items.filter((item) => item.type === "food"),
    overviewIconForItem,
  );
  const transportIcons = uniqueIcons(day.items, transportIconForItem);

  const groups: OverviewIconGroup[] = [
    { key: "attractions", label: "景點", icons: attractionIcons },
    { key: "food", label: "餐廳", icons: foodIcons },
    { key: "transport", label: "交通", icons: transportIcons },
  ];

  return groups.filter((group) => group.icons.length > 0);
}

type Expense = NonNullable<TravelItem["expense"]>;
type ExpenseCategory = TravelExpense["category"];

type ExpenseRow = {
  id: string;
  day: string;
  date: string;
  title: string;
  activity?: string;
  location?: string;
  amount: number;
  currency: TravelExpense["currency"];
  category: ExpenseCategory;
  status?: TravelExpense["status"];
  source?: string;
  notionUrl?: string;
};

type ExpenseActivityOption = {
  id: string;
  title: string;
  location: string;
  category: ExpenseCategory;
};

type ExpenseExchangeRate = {
  base: "AUD";
  quote: "TWD";
  rate: number;
  date: string;
  source?: string;
};

type ExpenseExchangeRateState = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
  rate?: ExpenseExchangeRate;
};

type ManualExpenseFormState = {
  name: string;
  amount: string;
  currency: TravelExpense["currency"];
  category: ExpenseCategory;
  status: NonNullable<TravelExpense["status"]>;
  day: string;
  date: string;
  schedulePageId: string;
  activitySearch: string;
  activity: string;
  location: string;
  pin: string;
};

const expenseCategoryMeta: Record<
  ExpenseCategory,
  { label: string; icon: typeof Banknote; tone: string }
> = {
  lodging: { label: "住宿", icon: Hotel, tone: "#7c3aed" },
  attraction: { label: "景點/票券", icon: Tickets, tone: "#15803d" },
  transport: { label: "交通/租車", icon: CarFront, tone: "#2563eb" },
  food: { label: "餐飲", icon: Utensils, tone: "#c2410c" },
  shopping: { label: "購物", icon: ShoppingBag, tone: "#b45309" },
  other: { label: "其他", icon: ReceiptText, tone: "#475569" },
};

const expenseStatusLabel: Record<NonNullable<TravelExpense["status"]>, string> = {
  paid: "已付款",
  confirmed: "已確認",
  estimated: "預估",
  pending: "待付款",
};

const expenseStatusToNotionStatus: Record<NonNullable<TravelExpense["status"]>, string> = {
  paid: "Done",
  confirmed: "Done",
  estimated: "Pending",
  pending: "Not yet",
};

const expenseCategoryToNotionCategory: Record<ExpenseCategory, string> = {
  lodging: "Living",
  attraction: "Attraction",
  transport: "Transportation",
  food: "Food",
  shopping: "Shopping",
  other: "Others",
};

const expenseFormDefault: ManualExpenseFormState = {
  name: "",
  amount: "",
  currency: "TWD",
  category: "food",
  status: "confirmed",
  day: "",
  date: localDateKey(new Date()),
  schedulePageId: "",
  activitySearch: "",
  activity: "",
  location: "",
  pin: "",
};

const manualExpenseStorageKey = "phasolarctos.manual-expenses.v1";
const deletedExpenseStorageKey = "phasolarctos.deleted-expenses.v1";
const expenseCategories = new Set<ExpenseCategory>(["lodging", "attraction", "transport", "food", "shopping", "other"]);
const expenseStatuses = new Set<NonNullable<TravelExpense["status"]>>(["paid", "confirmed", "estimated", "pending"]);
const notionPageIdPattern = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

function isExpenseCurrency(value: unknown): value is TravelExpense["currency"] {
  return value === "TWD" || value === "AUD";
}

function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === "string" && expenseCategories.has(value as ExpenseCategory);
}

function isExpenseStatus(value: unknown): value is NonNullable<TravelExpense["status"]> {
  return typeof value === "string" && expenseStatuses.has(value as NonNullable<TravelExpense["status"]>);
}

function isNotionExpensePageId(value: string) {
  return notionPageIdPattern.test(value);
}

function expenseRowFromUnknown(value: unknown): ExpenseRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<ExpenseRow>;

  if (
    typeof row.id !== "string" ||
    typeof row.title !== "string" ||
    typeof row.amount !== "number" ||
    !Number.isFinite(row.amount) ||
    !isExpenseCurrency(row.currency) ||
    !isExpenseCategory(row.category)
  ) {
    return null;
  }

  return {
    id: row.id,
    day: typeof row.day === "string" ? row.day : "",
    date: typeof row.date === "string" ? row.date : "",
    title: row.title,
    activity: typeof row.activity === "string" ? row.activity : row.title,
    location: typeof row.location === "string" ? row.location : undefined,
    amount: row.amount,
    currency: row.currency,
    category: row.category,
    status: isExpenseStatus(row.status) ? row.status : undefined,
    source: typeof row.source === "string" ? row.source : "Manual",
    notionUrl: typeof row.notionUrl === "string" ? row.notionUrl : undefined,
  };
}

function expenseActivityOptionFromUnknown(value: unknown): ExpenseActivityOption | null {
  if (!value || typeof value !== "object") return null;
  const option = value as Partial<ExpenseActivityOption>;

  if (
    typeof option.id !== "string" ||
    typeof option.title !== "string" ||
    !isExpenseCategory(option.category)
  ) {
    return null;
  }

  return {
    id: option.id,
    title: option.title,
    location: typeof option.location === "string" ? option.location : "",
    category: option.category,
  };
}

function expenseExchangeRateFromUnknown(value: unknown): ExpenseExchangeRate | null {
  if (!value || typeof value !== "object") return null;
  const rate = value as Partial<ExpenseExchangeRate>;
  if (rate.base !== "AUD" || rate.quote !== "TWD" || typeof rate.rate !== "number" || !Number.isFinite(rate.rate) || rate.rate <= 0) {
    return null;
  }

  return {
    base: "AUD",
    quote: "TWD",
    rate: rate.rate,
    date: typeof rate.date === "string" ? rate.date : "",
    source: typeof rate.source === "string" ? rate.source : undefined,
  };
}

function normalizedActivityText(value: string) {
  return value.trim().toLowerCase();
}

function mergeExpenseRows(rows: ExpenseRow[]) {
  const rowsById = new Map<string, ExpenseRow>();
  for (const row of rows) rowsById.set(row.id, row);
  return [...rowsById.values()];
}

function loadStoredManualExpenseRows(): ExpenseRow[] {
  if (typeof window === "undefined") return [];

  try {
    const storedValue = window.localStorage.getItem(manualExpenseStorageKey);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];
    return Array.isArray(parsedValue)
      ? parsedValue
          .map(expenseRowFromUnknown)
          .filter((row): row is ExpenseRow => row !== null)
      : [];
  } catch {
    return [];
  }
}

function storeManualExpenseRows(rows: ExpenseRow[]) {
  try {
    window.localStorage.setItem(manualExpenseStorageKey, JSON.stringify(rows));
  } catch {
    // Local persistence is best-effort; Notion remains the source of truth.
  }
}

function loadStoredDeletedExpenseIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const storedValue = window.localStorage.getItem(deletedExpenseStorageKey);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];
    return Array.isArray(parsedValue)
      ? parsedValue.filter((id): id is string => typeof id === "string" && id.length > 0)
      : [];
  } catch {
    return [];
  }
}

function storeDeletedExpenseIds(ids: string[]) {
  try {
    window.localStorage.setItem(deletedExpenseStorageKey, JSON.stringify(ids));
  } catch {
    // Local persistence is best-effort; Notion remains the source of truth.
  }
}

function formatExpenseAmount(amount: number, currency: TravelExpense["currency"]) {
  return new Intl.NumberFormat("zh-Hant", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "AUD" ? 2 : 0,
    maximumFractionDigits: currency === "AUD" ? 2 : 0,
  }).format(amount);
}

function expenseAmountInCurrency(
  row: ExpenseRow,
  targetCurrency: TravelExpense["currency"],
  exchangeRate?: ExpenseExchangeRate,
) {
  if (row.currency === targetCurrency) return row.amount;
  if (!exchangeRate) return undefined;
  if (row.currency === "AUD" && targetCurrency === "TWD") return row.amount * exchangeRate.rate;
  if (row.currency === "TWD" && targetCurrency === "AUD") return row.amount / exchangeRate.rate;
  return undefined;
}

function expenseRowsForDays(days: TravelDay[]): ExpenseRow[] {
  return days.flatMap((day, dayIndex) =>
    day.items.flatMap((item) => {
      if (!item.expense) return [];
      return [
        {
          id: item.id,
          day: dayLabel(day, dayIndex),
          date: day.date,
          title: item.title,
          activity: item.title,
          location: item.location,
          amount: item.expense.amount,
          currency: item.expense.currency,
          category: item.expense.category,
          status: item.expense.status,
          source: item.expense.source,
        },
      ];
    }),
  );
}

function expenseRowsForTrip(tripData: TripData, days: TravelDay[]): ExpenseRow[] {
  if (tripData.expenses?.length) {
    return tripData.expenses.map((expense) => ({
      id: expense.id,
      day: expense.day ?? "",
      date: expense.date ?? "",
      title: expense.title,
      activity: expense.title,
      location: expense.location,
      amount: expense.amount,
      currency: expense.currency,
      category: expense.category,
      status: expense.status,
      source: expense.source,
      notionUrl: expense.notionUrl,
    }));
  }

  return expenseRowsForDays(days);
}

function expenseTotalsByCategory(
  rows: ExpenseRow[],
  targetCurrency: TravelExpense["currency"],
  exchangeRate?: ExpenseExchangeRate,
) {
  const totals = new Map<ExpenseCategory, number>();
  let hasUnconvertedRows = false;
  for (const row of rows) {
    const amount = expenseAmountInCurrency(row, targetCurrency, exchangeRate);
    if (typeof amount !== "number") {
      hasUnconvertedRows = true;
      continue;
    }
    totals.set(row.category, (totals.get(row.category) ?? 0) + amount);
  }
  return {
    hasUnconvertedRows,
    totals: [...totals.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total),
  };
}

function expenseTotalInCurrency(
  rows: ExpenseRow[],
  targetCurrency: TravelExpense["currency"],
  exchangeRate?: ExpenseExchangeRate,
) {
  let total = 0;
  let hasUnconvertedRows = false;

  for (const row of rows) {
    const amount = expenseAmountInCurrency(row, targetCurrency, exchangeRate);
    if (typeof amount !== "number") {
      hasUnconvertedRows = true;
      continue;
    }
    total += amount;
  }

  return { total, hasUnconvertedRows };
}

export default function App() {
  const [activeMember, setActiveMember] = useState<TripMember | null>(() => loadStoredActiveMember());

  const handleSelectMember = (member: TripMember) => {
    setActiveMember(member);
    storeActiveMember(member);
  };

  const handleSwitchMember = () => {
    setActiveMember(null);
    clearStoredActiveMember();
  };

  if (!activeMember) {
    return <MemberLoginScreen members={tripMembers} onSelect={handleSelectMember} />;
  }

  return <TripExperience activeMember={activeMember} onSwitchMember={handleSwitchMember} />;
}

function loadStoredActiveMember() {
  if (typeof window === "undefined") return null;
  const storedMemberId = window.localStorage.getItem(activeMemberStorageKey);
  return tripMembers.find((member) => member.id === storedMemberId) ?? null;
}

function storeActiveMember(member: TripMember) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(activeMemberStorageKey, member.id);
}

function clearStoredActiveMember() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(activeMemberStorageKey);
}

function MemberLoginScreen({
  members,
  onSelect,
}: {
  members: TripMember[];
  onSelect: (member: TripMember) => void;
}) {
  return (
    <main className="member-login-shell" aria-label="旅程成員登入">
      <section className="member-login-panel">
        <div className="member-login-copy">
          <span>Australia Trip</span>
          <h1>選擇你的旅程角色</h1>
          <p>點擊人物後進入行程頁，花費與行程功能會先記住目前使用的成員。</p>
        </div>
        <div className="member-card-grid" aria-label="選擇登入成員">
          {members.map((member) => (
            <button
              className={member.id === "guest" ? "member-card member-card-guest" : "member-card"}
              type="button"
              key={member.id}
              onClick={() => onSelect(member)}
              style={{ "--member-accent": member.accent } as CSSProperties}
            >
              <MemberAvatar member={member} />
              <span className="member-card-role">{member.role}</span>
              <strong>{member.label}</strong>
              <em>{member.description}</em>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function MemberAvatar({ member }: { member: TripMember }) {
  return (
    <span
      className={`member-avatar member-avatar-${member.accessory}`}
      style={
        {
          "--member-accent": member.accent,
          "--member-hair": member.hair,
          "--member-outfit": member.outfit,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <span className="member-avatar-head">
        <span className="member-avatar-hair" />
        <span className="member-avatar-face">
          <span className="member-avatar-eye member-avatar-eye-left" />
          <span className="member-avatar-eye member-avatar-eye-right" />
          <span className="member-avatar-smile" />
        </span>
      </span>
      <span className="member-avatar-body" />
      <span className="member-avatar-accessory" />
    </span>
  );
}

function TripExperience({
  activeMember,
  onSwitchMember,
}: {
  activeMember: TripMember;
  onSwitchMember: () => void;
}) {
  const days = useMemo(
    () => [...trip.days].sort((a, b) => a.date.localeCompare(b.date)),
    [],
  );
  const now = useCurrentTime();
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTransitMap, setActiveTransitMap] = useState<TransitMap | null>(null);
  const [expandedTransitCity, setExpandedTransitCity] = useState<TransitCity["id"] | null>(null);
  const [isDayRailDocked, setIsDayRailDocked] = useState(false);
  const [isExpenseSummaryOpen, setIsExpenseSummaryOpen] = useState(false);
  const [dayRailProgress, setDayRailProgress] = useState(0);
  const dayRailBandRef = useRef<HTMLElement | null>(null);
  const activeDay = days[activeIndex];
  const heroSlides = useMemo(() => heroSlidesForDay(activeDay), [activeDay]);
  const syncedExpenseRows = useMemo(() => expenseRowsForTrip(trip, days), [days]);
  const [manualExpenseRows, setManualExpenseRows] = useState<ExpenseRow[]>(loadStoredManualExpenseRows);
  const [deletedExpenseIds, setDeletedExpenseIds] = useState<string[]>(loadStoredDeletedExpenseIds);
  const [expenseExchangeRate, setExpenseExchangeRate] = useState<ExpenseExchangeRateState>({
    type: "idle",
    message: "",
  });
  const expenseRows = useMemo(
    () => {
      const deletedIds = new Set(deletedExpenseIds);
      return mergeExpenseRows([...syncedExpenseRows, ...manualExpenseRows]).filter(
        (row) => !deletedIds.has(row.id),
      );
    },
    [deletedExpenseIds, manualExpenseRows, syncedExpenseRows],
  );

  useEffect(() => {
    if (!expenseRatesUrl) {
      setExpenseExchangeRate({ type: "error", message: "尚未設定匯率 API endpoint。" });
      return;
    }

    let isActive = true;
    setExpenseExchangeRate({ type: "loading", message: "載入 AUD/TWD 匯率中..." });

    fetch(`${expenseRatesUrl}?v=1`)
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result?.message || "載入 AUD/TWD 匯率失敗。");
        const rate = expenseExchangeRateFromUnknown(result);
        if (!rate) throw new Error("AUD/TWD 匯率格式不正確。");
        return rate;
      })
      .then((rate) => {
        if (!isActive) return;
        setExpenseExchangeRate({
          type: "success",
          message: `1 AUD = ${rate.rate.toFixed(3)} TWD`,
          rate,
        });
      })
      .catch((error) => {
        if (!isActive) return;
        setExpenseExchangeRate({
          type: "error",
          message: error instanceof Error ? error.message : "載入 AUD/TWD 匯率失敗。",
        });
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    storeManualExpenseRows(manualExpenseRows);
  }, [manualExpenseRows]);

  useEffect(() => {
    storeDeletedExpenseIds(deletedExpenseIds);
  }, [deletedExpenseIds]);

  useEffect(() => {
    if (window.location.hash) {
      document.querySelector(window.location.hash)?.scrollIntoView();
    }
  }, []);

  useEffect(() => {
    if (!activeTransitMap) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveTransitMap(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTransitMap]);

  useEffect(() => {
    let frame = 0;

    const updateDockedState = () => {
      frame = 0;
      const dayRailBand = dayRailBandRef.current;
      if (!dayRailBand) return;

      const isMobile = window.matchMedia("(max-width: 520px)").matches;
      const dockTop = isMobile ? 8 : window.matchMedia("(max-width: 860px)").matches ? 10 : 12;
      const bandTopPadding = isMobile ? 16 : window.matchMedia("(max-width: 860px)").matches ? 22 : 24;
      const expandedRailTop = dayRailBand.getBoundingClientRect().top;
      const shrinkStart = isMobile ? 190 : window.matchMedia("(max-width: 860px)").matches ? 220 : 240;
      const shrinkDistance = isMobile ? 150 : 190;
      const nextProgress = Math.min(
        1,
        Math.max(0, (shrinkStart - expandedRailTop) / shrinkDistance),
      );

      setDayRailProgress(nextProgress);
      setIsDayRailDocked(expandedRailTop <= dockTop - bandTopPadding);
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateDockedState);
    };

    updateDockedState();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return (
    <main className="app-shell">
      <section className="hero" aria-label="旅行總覽">
        <HeroCarousel slides={heroSlides} />
        <div className="hero-shade" />
        <motion.div
          className="hero-content"
          initial={{ opacity: 1, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.62, ease: "easeOut" }}
        >
          <div className="trip-kicker">
            <span className="trip-kicker-icon" aria-hidden="true">
              <CalendarDays size={18} />
            </span>
            <span className="trip-kicker-detail">{trip.dateRange}</span>
          </div>
          <h1>{trip.title}</h1>
          <p>{trip.subtitle}</p>
        </motion.div>
        <TransitMapButtons
          activeMap={activeTransitMap}
          expandedCity={expandedTransitCity}
          onToggleCity={(cityId) =>
            setExpandedTransitCity((currentCity) => (currentCity === cityId ? null : cityId))
          }
          onOpen={(map) => {
            setActiveTransitMap(map);
            setExpandedTransitCity(null);
          }}
        />
      </section>

      <section className="day-rail-band" ref={dayRailBandRef} aria-label="每日行程選單">
        <DayRail
          days={days}
          activeIndex={activeIndex}
          isDocked={isDayRailDocked}
          progress={dayRailProgress}
          onSelect={setActiveIndex}
        />
      </section>

      <MemberSessionButton member={activeMember} onSwitchMember={onSwitchMember} />

      <section className="journey" id="journey" aria-label="每日旅行資訊">
        <AnimatePresence mode="wait">
          <motion.div
            className="day-layout"
            key={activeDay.id}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <DayOverview day={activeDay} dayNumber={dayLabel(activeDay, activeIndex)} />
            <Timeline day={activeDay} now={now} />
          </motion.div>
        </AnimatePresence>
      </section>
      <AnimatePresence>
        {activeTransitMap ? (
          <TransitMapModal map={activeTransitMap} onClose={() => setActiveTransitMap(null)} />
        ) : null}
        {isExpenseSummaryOpen ? (
          <ExpenseSummaryModal
            rows={expenseRows}
            days={days}
            exchangeRate={expenseExchangeRate}
            canManageExpenses={activeMember.id !== "guest"}
            onClose={() => setIsExpenseSummaryOpen(false)}
            onCreateExpense={(expense) =>
              setManualExpenseRows((currentRows) => mergeExpenseRows([...currentRows, expense]))
            }
            onDeleteExpense={(expenseId) => {
              setManualExpenseRows((currentRows) => currentRows.filter((row) => row.id !== expenseId));
              setDeletedExpenseIds((currentIds) =>
                currentIds.includes(expenseId) ? currentIds : [...currentIds, expenseId],
              );
            }}
          />
        ) : null}
      </AnimatePresence>
      <ExpenseSummaryLauncher
        rows={expenseRows}
        exchangeRate={expenseExchangeRate}
        onOpen={() => setIsExpenseSummaryOpen(true)}
      />
    </main>
  );
}

function MemberSessionButton({
  member,
  onSwitchMember,
}: {
  member: TripMember;
  onSwitchMember: () => void;
}) {
  return (
    <button
      className="member-session-button"
      type="button"
      onClick={onSwitchMember}
      aria-label={`目前登入成員 ${member.label}，點擊離開目前頁面`}
      style={{ "--member-accent": member.accent } as CSSProperties}
      title="離開頁面"
    >
      <span className="member-session-avatar">
        <MemberAvatar member={member} />
      </span>
      <span className="member-session-label">{member.label}</span>
      <LogOut size={16} strokeWidth={2.5} />
    </button>
  );
}

function ExpenseSummaryLauncher({
  rows,
  exchangeRate,
  onOpen,
}: {
  rows: ExpenseRow[];
  exchangeRate: ExpenseExchangeRateState;
  onOpen: () => void;
}) {
  const { total, hasUnconvertedRows } = expenseTotalInCurrency(rows, "TWD", exchangeRate.rate);
  const totalLabel =
    hasUnconvertedRows && exchangeRate.type !== "success"
      ? "匯率載入中"
      : formatExpenseAmount(total, "TWD");

  return (
    <button
      className="expense-launcher"
      type="button"
      onClick={onOpen}
      aria-label={`開啟花費統計，目前台幣總額 ${totalLabel}`}
      title="花費統計"
    >
      <Banknote size={22} strokeWidth={2.5} />
    </button>
  );
}

function ExpenseSummaryModal({
  rows,
  days,
  exchangeRate,
  canManageExpenses,
  onClose,
  onCreateExpense,
  onDeleteExpense,
}: {
  rows: ExpenseRow[];
  days: TravelDay[];
  exchangeRate: ExpenseExchangeRateState;
  canManageExpenses: boolean;
  onClose: () => void;
  onCreateExpense: (expense: ExpenseRow) => void;
  onDeleteExpense: (expenseId: string) => void;
}) {
  const [displayCurrency, setDisplayCurrency] = useState<TravelExpense["currency"]>("TWD");
  const { totals, hasUnconvertedRows: hasUnconvertedCategoryRows } = expenseTotalsByCategory(
    rows,
    displayCurrency,
    exchangeRate.rate,
  );
  const { total: totalAmount, hasUnconvertedRows } = expenseTotalInCurrency(
    rows,
    displayCurrency,
    exchangeRate.rate,
  );
  const totalLabel =
    hasUnconvertedRows && exchangeRate.type !== "success"
      ? "匯率載入中"
      : formatExpenseAmount(totalAmount, displayCurrency);
  const displayCurrencyLabel = displayCurrency === "TWD" ? "台幣總額" : "澳幣總額";
  const [activeCategory, setActiveCategory] = useState<ExpenseCategory | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState<ManualExpenseFormState>(expenseFormDefault);
  const [formStatus, setFormStatus] = useState<{
    type: "idle" | "submitting" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });
  const [deleteStatus, setDeleteStatus] = useState<{
    type: "idle" | "deleting" | "success" | "error";
    message: string;
    expenseId?: string;
  }>({ type: "idle", message: "" });
  const [activityOptionsByCategory, setActivityOptionsByCategory] = useState<
    Partial<Record<ExpenseCategory, ExpenseActivityOption[]>>
  >({});
  const [activityStatus, setActivityStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });
  const [isActivityPickerOpen, setIsActivityPickerOpen] = useState(false);
  const activityOptions = activityOptionsByCategory[formState.category] ?? [];
  const filteredActivityOptions = useMemo(() => {
    const query = normalizedActivityText(formState.activitySearch);
    const matches = query
      ? activityOptions.filter((activity) =>
          normalizedActivityText(`${activity.title} ${activity.location}`).includes(query),
        )
      : activityOptions;
    return matches.slice(0, 10);
  }, [activityOptions, formState.activitySearch]);
  const activeRows = activeCategory
    ? rows.filter((row) => row.category === activeCategory)
    : [];
  const activeMeta = activeCategory ? expenseCategoryMeta[activeCategory] : null;

  useEffect(() => {
    if (!activeCategory || totals.some((total) => total.category === activeCategory)) return;
    setActiveCategory(null);
  }, [activeCategory, totals]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const category = formState.category;
    if (
      !canManageExpenses ||
      !isFormOpen ||
      !expenseActivitiesUrl ||
      activityOptionsByCategory[category]
    ) {
      return;
    }

    let isActive = true;
    setActivityStatus({ type: "loading", message: "載入 Notion 活動中..." });

    fetch(`${expenseActivitiesUrl}?category=${encodeURIComponent(category)}&v=2`)
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result?.message || "載入 Notion 活動失敗。");
        const activities: unknown[] = Array.isArray(result?.activities) ? result.activities : [];
        return activities
              .map(expenseActivityOptionFromUnknown)
              .filter((option): option is ExpenseActivityOption => option !== null);
      })
      .then((options) => {
        if (!isActive) return;
        setActivityOptionsByCategory((currentOptions) => ({
          ...currentOptions,
          [category]: options,
        }));
        setActivityStatus({
          type: "success",
          message: options.length
            ? `已載入 ${expenseCategoryMeta[category].label} ${options.length} 個 Notion 活動。`
            : `Notion 目前沒有${expenseCategoryMeta[category].label}活動。`,
        });
      })
      .catch((error) => {
        if (!isActive) return;
        setActivityStatus({
          type: "error",
          message: error instanceof Error ? error.message : "載入 Notion 活動失敗。",
        });
      });

    return () => {
      isActive = false;
    };
  }, [activityOptionsByCategory, canManageExpenses, formState.category, isFormOpen]);

  useEffect(() => {
    if (!isFormOpen || activityStatus.type !== "error") return;
    setActivityStatus({ type: "idle", message: "" });
  }, [isFormOpen]);

  const updateFormField = (field: keyof ManualExpenseFormState, value: string) => {
    setFormState((currentState) => ({ ...currentState, [field]: value }));
    setFormStatus({ type: "idle", message: "" });
  };

  const handleCategorySelect = (category: ExpenseCategory) => {
    setFormState((currentState) => ({
      ...currentState,
      category,
      schedulePageId: "",
      activitySearch: "",
      activity: "",
    }));
    setIsActivityPickerOpen(false);
    setActivityStatus({ type: "idle", message: "" });
    setFormStatus({ type: "idle", message: "" });
  };

  const handleActivitySelect = (activityId: string) => {
    const selectedActivity = activityOptions.find((option) => option.id === activityId);
    setFormState((currentState) => ({
      ...currentState,
      schedulePageId: activityId,
      ...(selectedActivity
        ? {
            name: currentState.name || selectedActivity.title,
            activitySearch: selectedActivity.title,
            activity: selectedActivity.title,
            location: selectedActivity.location || currentState.location,
            category: selectedActivity.category,
          }
        : {
            activitySearch: "",
            activity: "",
          }),
    }));
    setIsActivityPickerOpen(false);
    setFormStatus({ type: "idle", message: "" });
  };

  const handleActivitySearch = (value: string) => {
    setFormState((currentState) => ({
      ...currentState,
      schedulePageId: "",
      activitySearch: value,
      activity: value,
    }));
    setIsActivityPickerOpen(true);
    setFormStatus({ type: "idle", message: "" });
  };

  const handleReloadActivities = () => {
    setActivityOptionsByCategory((currentOptions) => {
      const nextOptions = { ...currentOptions };
      delete nextOptions[formState.category];
      return nextOptions;
    });
    setActivityStatus({ type: "idle", message: "" });
    setFormStatus({ type: "idle", message: "" });
  };

  const handleSubmitExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageExpenses) return;

    const amount = Number(formState.amount);
    if (!formState.name.trim() || !Number.isFinite(amount) || amount <= 0 || !formState.date) {
      setFormStatus({ type: "error", message: "請填寫名稱、日期與有效金額。" });
      return;
    }

    if (!expenseApiUrl) {
      setFormStatus({
        type: "error",
        message: "尚未設定 VITE_EXPENSE_API_URL，表單目前不會寫入 Notion。",
      });
      return;
    }

    const payload = {
      name: formState.name.trim(),
      amount,
      currency: formState.currency,
      category: formState.category,
      notionCategory: expenseCategoryToNotionCategory[formState.category],
      status: formState.status,
      notionStatus: expenseStatusToNotionStatus[formState.status],
      day: formState.day || undefined,
      date: formState.date,
      schedulePageId: formState.schedulePageId || undefined,
      activity: formState.activity.trim() || formState.name.trim(),
      location: formState.location.trim() || undefined,
    };

    setFormStatus({ type: "submitting", message: "新增到 Notion 中..." });

    try {
      const response = await fetch(expenseApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(formState.pin ? { "X-Expense-Pin": formState.pin } : {}),
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || "新增 Notion 消費失敗。");
      }

      const savedExpense = expenseRowFromUnknown({
        ...result?.expense,
        id: result?.expense?.id ?? result?.id,
        activity: payload.activity,
        notionUrl: result?.expense?.notionUrl ?? result?.url,
      });

      onCreateExpense(
        savedExpense ?? {
          id: result?.id ?? `manual-${Date.now()}`,
          day: payload.day ?? "",
          date: payload.date,
          title: payload.name,
          activity: payload.activity,
          location: payload.location,
          amount: payload.amount,
          currency: payload.currency,
          category: payload.category,
          status: payload.status,
          source: "Manual",
          notionUrl: result?.url,
        },
      );
      setFormState((currentState) => ({
        ...expenseFormDefault,
        date: currentState.date,
        day: currentState.day,
        pin: currentState.pin,
      }));
      setFormStatus({ type: "success", message: "已新增到 Notion，並更新目前畫面統計。" });
      setIsFormOpen(false);
    } catch (error) {
      setFormStatus({
        type: "error",
        message: error instanceof Error ? error.message : "新增 Notion 消費失敗。",
      });
    }
  };

  const handleDeleteExpense = async (row: ExpenseRow) => {
    if (!canManageExpenses) return;
    if (!window.confirm(`確定要刪除「${row.title}」這筆消費嗎？`)) return;

    if (!isNotionExpensePageId(row.id)) {
      onDeleteExpense(row.id);
      setDeleteStatus({ type: "success", message: "已從目前畫面移除本地消費紀錄。" });
      return;
    }

    if (!expenseApiUrl) {
      setDeleteStatus({
        type: "error",
        message: "尚未設定 VITE_EXPENSE_API_URL，無法刪除 Notion 消費。",
      });
      return;
    }

    const promptedPin = formState.pin || window.prompt("請輸入刪除 PIN（若 Worker 未設定可留空）");
    if (promptedPin === null) return;

    setDeleteStatus({ type: "deleting", message: "刪除 Notion 消費中...", expenseId: row.id });

    try {
      const response = await fetch(`${expenseApiUrl.replace(/\/$/, "")}/${encodeURIComponent(row.id)}`, {
        method: "DELETE",
        headers: promptedPin ? { "X-Expense-Pin": promptedPin } : undefined,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || "刪除 Notion 消費失敗。");
      }

      onDeleteExpense(row.id);
      setDeleteStatus({ type: "success", message: "已從 Notion 刪除，並更新目前畫面統計。" });
    } catch (error) {
      setDeleteStatus({
        type: "error",
        message: error instanceof Error ? error.message : "刪除 Notion 消費失敗。",
        expenseId: row.id,
      });
    }
  };

  return createPortal(
    <motion.div
      className="route-modal-backdrop expense-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="花費統計"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.section
        className="expense-modal"
        id="expenses"
        aria-label="花費統計"
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <div className="expense-header">
          <div>
            <span className="expense-kicker">
              <ChartNoAxesColumn size={17} strokeWidth={2.5} />
              花費統計
            </span>
            <h2>目前已記錄花費</h2>
            <p>依 Notion 與手動補入紀錄統計，AUD 會依最新 AUD/TWD 匯率換算成台幣加總。</p>
          </div>
          <div className="expense-total">
            <span>{displayCurrencyLabel}</span>
            <strong>{totalLabel}</strong>
            <em>
              {exchangeRate.rate
                ? `${rows.length} 筆 · 1 AUD = ${exchangeRate.rate.rate.toFixed(3)} TWD`
                : `${rows.length} 筆 · ${exchangeRate.message || "匯率載入中"}`}
            </em>
            {exchangeRate.rate?.date ? <em>匯率日期：{exchangeRate.rate.date}</em> : null}
            <div className="expense-currency-toggle" aria-label="切換總額幣別">
              {(["TWD", "AUD"] as const).map((currency) => (
                <button
                  type="button"
                  className={displayCurrency === currency ? "is-active" : ""}
                  onClick={() => setDisplayCurrency(currency)}
                  key={currency}
                >
                  {currency}
                </button>
              ))}
            </div>
          </div>
          <div className="expense-modal-actions">
            {canManageExpenses ? (
              <button
                className="expense-add-button"
                type="button"
                onClick={() => setIsFormOpen((currentValue) => !currentValue)}
                aria-expanded={isFormOpen}
              >
                <Plus size={17} strokeWidth={2.6} />
                新增消費
              </button>
            ) : null}
            <button className="expense-modal-close" type="button" onClick={onClose} aria-label="關閉花費統計">
              <X size={19} strokeWidth={2.6} />
            </button>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {canManageExpenses && isFormOpen ? (
            <motion.form
              className="expense-form"
              onSubmit={handleSubmitExpense}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <label>
                <span>分類</span>
                <select
                  value={formState.category}
                  onChange={(event) => handleCategorySelect(event.target.value as ExpenseCategory)}
                >
                  {Object.entries(expenseCategoryMeta).map(([category, meta]) => (
                    <option value={category} key={category}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="expense-form-field expense-form-wide">
                <span>關聯活動</span>
                <div className="expense-activity-picker">
                  <input
                    value={formState.activitySearch}
                    onChange={(event) => handleActivitySearch(event.target.value)}
                    onFocus={() => setIsActivityPickerOpen(true)}
                    onBlur={() => window.setTimeout(() => setIsActivityPickerOpen(false), 120)}
                    placeholder={
                      activityStatus.type === "loading"
                        ? `載入${expenseCategoryMeta[formState.category].label}活動中...`
                        : `輸入活動或地點搜尋`
                    }
                    autoComplete="off"
                  />
                  {isActivityPickerOpen && activityStatus.type !== "loading" ? (
                    <div className="expense-activity-menu" role="listbox">
                      {filteredActivityOptions.length ? (
                        filteredActivityOptions.map((activity) => (
                          <button
                            type="button"
                            key={activity.id}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleActivitySelect(activity.id)}
                            role="option"
                          >
                            <strong>{activity.title}</strong>
                            {activity.location ? <span>{activity.location}</span> : null}
                          </button>
                        ))
                      ) : (
                        <div className="expense-activity-empty">
                          {activityStatus.type === "error" ? "活動載入失敗" : "沒有符合的活動"}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
              <label>
                <span>消費名稱</span>
                <input
                  value={formState.name}
                  onChange={(event) => updateFormField("name", event.target.value)}
                  placeholder="Opal / Dinner / Coffee"
                  required
                />
              </label>
              <label>
                <span>金額</span>
                <input
                  value={formState.amount}
                  onChange={(event) => updateFormField("amount", event.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  required
                />
              </label>
              <label>
                <span>幣別</span>
                <select
                  value={formState.currency}
                  onChange={(event) => updateFormField("currency", event.target.value)}
                >
                  <option value="TWD">TWD</option>
                  <option value="AUD">AUD</option>
                </select>
              </label>
              <label>
                <span>日期</span>
                <input
                  type="date"
                  value={formState.date}
                  onChange={(event) => updateFormField("date", event.target.value)}
                  required
                />
              </label>
              <label>
                <span>Day</span>
                <select
                  value={formState.day}
                  onChange={(event) => updateFormField("day", event.target.value)}
                >
                  <option value="">不指定</option>
                  {days.map((day, index) => {
                    const label = dayLabel(day, index);
                    return (
                      <option value={label} key={day.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label>
                <span>活動</span>
                <input
                  value={formState.activity}
                  onChange={(event) => updateFormField("activity", event.target.value)}
                  placeholder="可由關聯活動自動帶入"
                />
              </label>
              <label>
                <span>地點</span>
                <input
                  value={formState.location}
                  onChange={(event) => updateFormField("location", event.target.value)}
                  placeholder="店名或地點"
                />
              </label>
              <label>
                <span>PIN</span>
                <input
                  value={formState.pin}
                  onChange={(event) => updateFormField("pin", event.target.value)}
                  placeholder="Worker 有設定時才需要"
                  type="password"
                />
              </label>
              <div className="expense-form-footer">
                <span className={`expense-form-status is-${formStatus.type}`}>
                  {formStatus.message ||
                    activityStatus.message ||
                    (expenseApiUrl ? "送出後會寫入 Notion Expense database。" : "尚未設定 API endpoint。")}
                </span>
                {activityStatus.type === "error" ? (
                  <button className="expense-form-secondary" type="button" onClick={handleReloadActivities}>
                    重新載入活動
                  </button>
                ) : null}
                <button type="submit" disabled={formStatus.type === "submitting"}>
                  {formStatus.type === "submitting" ? "新增中" : "新增到 Notion"}
                </button>
              </div>
            </motion.form>
          ) : formStatus.message ? (
            <motion.div
              className={`expense-form-inline-status is-${formStatus.type}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
            >
              {formStatus.message}
            </motion.div>
          ) : null}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {deleteStatus.message ? (
            <motion.div
              className={`expense-form-inline-status is-${deleteStatus.type === "deleting" ? "submitting" : deleteStatus.type}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
            >
              {deleteStatus.message}
            </motion.div>
          ) : null}
        </AnimatePresence>
        {rows.length ? (
          <>
            <div className="expense-category-row" role="list" aria-label="花費分類">
              {totals.map(({ category, total }) => {
                const meta = expenseCategoryMeta[category];
                const Icon = meta.icon;
                const isActive = activeCategory === category;

                return (
                  <button
                    type="button"
                    className={isActive ? "expense-category-pill is-active" : "expense-category-pill"}
                    style={{ "--expense-tone": meta.tone } as CSSProperties}
                    key={category}
                    onClick={() => setActiveCategory((current) => (current === category ? null : category))}
                    aria-expanded={isActive}
                  >
                    <span>
                      <Icon size={18} strokeWidth={2.5} />
                      {meta.label}
                    </span>
                    <strong>
                      {hasUnconvertedCategoryRows && exchangeRate.type !== "success"
                        ? "等待匯率"
                        : formatExpenseAmount(total, displayCurrency)}
                    </strong>
                  </button>
                );
              })}
            </div>
            <AnimatePresence mode="wait">
              {activeCategory && activeMeta ? (
                <motion.div
                  className="expense-detail-panel"
                  key={activeCategory}
                  style={{ "--expense-tone": activeMeta.tone } as CSSProperties}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <div className="expense-detail-heading">
                    <span className="expense-chip" style={{ "--expense-tone": activeMeta.tone } as CSSProperties}>
                      {activeMeta.label}
                    </span>
                    <strong>{activeRows.length} 筆明細</strong>
                  </div>
                  <div className="expense-detail-list">
                    {activeRows.map((row) => {
                      const isDeleting = deleteStatus.type === "deleting" && deleteStatus.expenseId === row.id;

                      return (
                        <article className="expense-detail-row" key={row.id}>
                          <div>
                            <span>{row.day}</span>
                            <em>{formatRailDate(row.date)}</em>
                          </div>
                          <div>
                            <strong>{row.title}</strong>
                            {row.activity && row.activity !== row.title ? <em>{row.activity}</em> : null}
                            {row.location ? <em>{row.location}</em> : null}
                          </div>
                          <div>
                            <span>{row.status ? expenseStatusLabel[row.status] : "未標註"}</span>
                            <strong>{formatExpenseAmount(row.amount, row.currency)}</strong>
                            {canManageExpenses ? (
                              <button
                                className="expense-delete-button"
                                type="button"
                                onClick={() => handleDeleteExpense(row)}
                                disabled={isDeleting}
                                aria-label={`刪除 ${row.title}`}
                              >
                                <Trash2 size={15} strokeWidth={2.5} />
                                {isDeleting ? "刪除中" : "刪除"}
                              </button>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </>
        ) : (
          <div className="expense-empty">
            <ReceiptText size={24} strokeWidth={2.3} />
            <span>尚未同步任何花費資料</span>
          </div>
        )}
      </motion.section>
    </motion.div>,
    document.body,
  );
}

function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const slideSignature = slides.map((slide) => slide.src).join("|");
  const activeSlide = slides[activeSlideIndex] ?? slides[0];

  useEffect(() => {
    setActiveSlideIndex(0);
  }, [slideSignature]);

  useEffect(() => {
    if (slides.length < 2) return;

    const interval = window.setInterval(() => {
      setActiveSlideIndex((currentIndex) => (currentIndex + 1) % slides.length);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [slideSignature, slides.length]);

  if (!activeSlide) return null;

  const goToSlide = (direction: -1 | 1) => {
    if (slides.length < 2) return;

    setActiveSlideIndex((currentIndex) => (
      currentIndex + direction + slides.length
    ) % slides.length);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (slides.length < 2) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointerStart.current) return;

    const distanceX = event.clientX - pointerStart.current.x;
    const distanceY = event.clientY - pointerStart.current.y;
    pointerStart.current = null;
    if (Math.abs(distanceY) > Math.abs(distanceX) || Math.abs(distanceX) < 48) return;

    goToSlide(distanceX > 0 ? -1 : 1);
  };

  return (
    <>
      <div
        className="hero-carousel"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          pointerStart.current = null;
        }}
        aria-label="當日行程照片輪播"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={activeSlide.src}
            className="hero-image"
            src={activeSlide.src}
            alt=""
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        </AnimatePresence>
      </div>
      {slides.length > 1 ? (
        <div className="hero-carousel-ui" aria-label="切換 Header 圖片">
          <div className="hero-carousel-buttons">
            <button type="button" onClick={() => goToSlide(-1)} aria-label="上一張行程照片">
              <ChevronLeft size={18} />
            </button>
            <span className="hero-carousel-caption">{activeSlide.label}</span>
            <button type="button" onClick={() => goToSlide(1)} aria-label="下一張行程照片">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="hero-carousel-dots" aria-label="圖片位置">
            {slides.map((slide, index) => (
              <button
                className={index === activeSlideIndex ? "active" : undefined}
                type="button"
                key={slide.src}
                onClick={() => setActiveSlideIndex(index)}
                aria-label={`切換到 ${slide.label}`}
                aria-current={index === activeSlideIndex ? "true" : undefined}
              />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function TransitMapButtons({
  activeMap,
  expandedCity,
  onToggleCity,
  onOpen,
}: {
  activeMap: TransitMap | null;
  expandedCity: TransitCity["id"] | null;
  onToggleCity: (cityId: TransitCity["id"]) => void;
  onOpen: (map: TransitMap) => void;
}) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="map-quick-actions" aria-label="交通路線圖">
      {transitCities.map((city) => {
        const CityIcon = city.icon;

        return (
          <div
            className={
              expandedCity === city.id
                ? `map-city-group map-city-${city.id} is-expanded`
                : `map-city-group map-city-${city.id}`
            }
            key={city.id}
          >
            <button
              className="map-city-toggle"
              type="button"
              onClick={() => onToggleCity(city.id)}
              aria-expanded={expandedCity === city.id}
              aria-label={`展開 ${city.label} 交通路線圖`}
              data-tooltip={city.label}
            >
              <CityIcon size={19} strokeWidth={2.5} />
            </button>
            <div className="map-city-actions">
              {city.maps.map((map) => {
                const Icon = map.icon;

                return (
                  <button
                    className="transit-map-button"
                    type="button"
                    key={map.id}
                    onClick={() => onOpen(map)}
                    aria-haspopup="dialog"
                    aria-expanded={activeMap?.id === map.id}
                    aria-label={`開啟 ${map.label}`}
                    data-tooltip={map.label}
                  >
                    <Icon size={19} strokeWidth={2.5} />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

function TransitMapModal({ map, onClose }: { map: TransitMap; onClose: () => void }) {
  const images = [
    { src: map.image, label: map.label },
    ...(map.secondaryImages ?? []),
  ];

  return (
    <motion.div
      className="map-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={map.label}
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.figure
        className="map-modal"
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <button
          className="map-modal-close"
          type="button"
          onClick={onClose}
          aria-label={`關閉 ${map.label}`}
        >
          <X size={19} strokeWidth={2.6} />
        </button>
        <div className="map-modal-images">
          {images.map((image) => (
            <div className="map-modal-image-block" key={image.src}>
              <img src={image.src} alt={image.label} />
            </div>
          ))}
        </div>
      </motion.figure>
    </motion.div>
  );
}

function DayRail({
  days,
  activeIndex,
  isDocked,
  progress,
  onSelect,
}: {
  days: TravelDay[];
  activeIndex: number;
  isDocked: boolean;
  progress: number;
  onSelect: (index: number) => void;
}) {
  const railRef = useRef<HTMLElement | null>(null);
  const activeStopRef = useRef<HTMLButtonElement | null>(null);
  const travelerPosition = days.length > 1 ? (activeIndex / (days.length - 1)) * 100 : 0;

  useEffect(() => {
    const rail = railRef.current;
    const activeStop = activeStopRef.current;
    if (!rail || !activeStop) return;

    const targetLeft = activeStop.offsetLeft + activeStop.offsetWidth / 2 - rail.clientWidth / 2;
    rail.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: "smooth",
    });
  }, [activeIndex]);

  return (
    <nav
      className={`day-rail ${isDocked ? "is-docked" : "is-expanded"}`}
      ref={railRef}
      style={{ "--rail-progress": progress } as CSSProperties}
      aria-label="選擇旅行日期"
    >
      <div className="day-track-shell">
        <div className="day-track-line" />
        <div className="traveler-path" aria-hidden="true">
          <motion.div
            className="traveler"
            animate={{ left: `${travelerPosition}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 18, mass: 0.75 }}
          >
            <motion.div
              className="traveler-figure"
              animate={{ y: [0, -3, 0], rotate: [0, -1.5, 0, 1.5, 0] }}
              transition={{ duration: 0.72, repeat: Infinity, ease: "easeInOut" }}
            >
              <PersonStanding className="traveler-person" size={34} strokeWidth={2.4} />
              <Luggage className="traveler-luggage" size={24} strokeWidth={2.4} />
            </motion.div>
          </motion.div>
        </div>
        <ol className="day-stops">
          {days.map((day, index) => (
            <li key={day.id}>
              <button
                className={index === activeIndex ? "day-stop active" : "day-stop"}
                type="button"
                onClick={() => onSelect(index)}
                ref={index === activeIndex ? activeStopRef : undefined}
                aria-current={index === activeIndex ? "page" : undefined}
                aria-label={`前往 ${dayLabel(day, index)} ${day.city}`}
                style={accentStyle(day.accent)}
              >
                <span className="day-dot" />
                <span className="day-stop-label">{dayLabel(day, index)}</span>
                <span className="day-stop-date">{formatRailDate(day.date)}</span>
                <strong>{day.city}</strong>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

function DayOverview({ day, dayNumber }: { day: TravelDay; dayNumber: string }) {
  const mapUrl = dayRouteEmbedUrl(day);
  const routeUrl = dayRouteOpenUrl(day);
  const staticRouteMapUrl = dayRouteStaticMapUrl(day);
  const flightRoute = flightRouteForDay(day);
  const flightMapUrl = dayFlightMapUrl(day);
  const summaryParagraphs = daySummaryParagraphs(day);
  const keyStops = keyStopsForDay(day);
  const overviewIconGroups = overviewIconGroupsForDay(day);

  return (
    <aside className="day-overview" style={accentStyle(day.accent)}>
      <div className="day-marker">{dayNumber}</div>
      <p className="date-line">{formatDay(day.date)}</p>
      <h2>{day.title}</h2>
      <div className="overview-brief" aria-label={`${dayNumber} 當日行程摘要`}>
        <div className="overview-stat-grid">
          <div>
            <span>時間軸</span>
            <strong>{dayTimeRange(day)}</strong>
          </div>
          <div>
            <span>主要點</span>
            <strong>{keyStops.length} stops</strong>
          </div>
        </div>
        <div className="overview-icon-groups" aria-label={`${dayNumber} 當日重點分類`}>
          {overviewIconGroups.map((group) => (
            <section className="overview-icon-group" key={group.key} aria-label={group.label}>
              <span className="overview-icon-group-label">{group.label}</span>
              <div className="overview-icon-strip">
                {group.icons.map(({ key, label, icon: Icon }) => (
                  <span
                    className={`overview-icon-chip${group.key === "transport" ? " is-transport" : ""}`}
                    key={key}
                    title={label}
                    data-label={label}
                    aria-label={label}
                    tabIndex={group.key === "transport" ? 0 : undefined}
                  >
                    <Icon size={17} strokeWidth={2.5} aria-hidden="true" />
                    {group.key === "transport" ? null : <span>{label}</span>}
                  </span>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="day-summary-copy">
          {summaryParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
      <ReminderWindow reminders={day.reminders} />
      <div className="map-frame">
        {flightRoute ? (
          <FlightRouteMap flight={flightRoute} imageUrl={flightMapUrl} routeUrl={routeUrl} />
        ) : mapUrl ? (
          <DayRouteMap
            title={day.title}
            embedUrl={mapUrl}
            imageUrl={staticRouteMapUrl}
            routeUrl={routeUrl}
          />
        ) : (
          <div className="map-fallback">
            <MapPin size={28} />
            <span>{day.city}</span>
          </div>
        )}
      </div>
    </aside>
  );
}

function DayRouteMap({
  title,
  embedUrl,
  imageUrl,
  routeUrl,
}: {
  title: string;
  embedUrl: string;
  imageUrl: string;
  routeUrl: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const showStaticMap = imageUrl && !imageFailed;

  return (
    <div className="route-map">
      {showStaticMap ? (
        <img src={imageUrl} alt={`${title} 當日串點路線圖`} onError={() => setImageFailed(true)} />
      ) : (
        <iframe
          title={`${title} 路線地圖`}
          src={embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}
      <button
        className="map-expand-button"
        type="button"
        onClick={() => setIsExpanded(true)}
        aria-label={`放大 ${title} 當日路線地圖`}
      >
        <Maximize2 size={16} strokeWidth={2.5} />
      </button>
      {routeUrl ? (
        <a className="map-route-link" href={routeUrl} target="_blank" rel="noreferrer">
          當日路線
          <ExternalLink size={14} />
        </a>
      ) : null}
      <AnimatePresence>
        {isExpanded ? (
          <RouteMapModal
            title={`${title} 當日路線`}
            imageUrl={showStaticMap ? imageUrl : ""}
            embedUrl={embedUrl}
            routeUrl={routeUrl}
            onClose={() => setIsExpanded(false)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function FlightRouteMap({
  flight,
  imageUrl,
  routeUrl,
}: {
  flight: NonNullable<TravelItem["flightDetails"]>;
  imageUrl: string;
  routeUrl: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const showGoogleStaticMap = imageUrl && !imageFailed;

  return (
    <div className="flight-map" aria-label={`${flight.from} 到 ${flight.to} 航線圖`}>
      {showGoogleStaticMap ? (
        <img
          src={imageUrl}
          alt={`${flight.from} 到 ${flight.to} 航線圖`}
          onError={() => setImageFailed(true)}
        />
      ) : null}
      <div className="flight-map-overlay" aria-hidden={showGoogleStaticMap ? "true" : undefined}>
        <div className="flight-map-route">
          <span className="flight-map-pin from">TPE</span>
          <span className="flight-map-arc" />
          <span className="flight-map-plane">
            <PlaneTakeoff size={20} strokeWidth={2.5} />
          </span>
          <span className="flight-map-pin to">SYD</span>
        </div>
        <div className="flight-map-labels">
          <strong>{flight.from}</strong>
          <span>{flight.flightNo}</span>
          <strong>{flight.to}</strong>
        </div>
      </div>
      <button
        className="map-expand-button"
        type="button"
        onClick={() => setIsExpanded(true)}
        aria-label={`放大 ${flight.flightNo} 航班路線圖`}
      >
        <Maximize2 size={16} strokeWidth={2.5} />
      </button>
      {routeUrl ? (
        <a className="map-route-link" href={routeUrl} target="_blank" rel="noreferrer">
          航班路線
          <ExternalLink size={14} />
        </a>
      ) : null}
      <AnimatePresence>
        {isExpanded ? (
          <RouteMapModal
            title={`${flight.flightNo} 航班路線`}
            imageUrl={showGoogleStaticMap ? imageUrl : ""}
            embedUrl=""
            routeUrl={routeUrl}
            onClose={() => setIsExpanded(false)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function RouteMapModal({
  title,
  imageUrl,
  embedUrl,
  routeUrl,
  onClose,
}: {
  title: string;
  imageUrl: string;
  embedUrl: string;
  routeUrl: string;
  onClose: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = imageUrl && !imageFailed;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <motion.div
      className="route-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.article
        className="route-modal"
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <div className="route-modal-header">
          <h3>{title}</h3>
          <div className="route-modal-actions">
            {routeUrl ? (
              <a href={routeUrl} target="_blank" rel="noreferrer">
                Google Maps
                <ExternalLink size={14} />
              </a>
            ) : null}
            <button type="button" onClick={onClose} aria-label={`關閉 ${title}`}>
              <X size={19} strokeWidth={2.6} />
            </button>
          </div>
        </div>
        <div className="route-modal-body">
          {showImage ? (
            <img src={imageUrl} alt={title} onError={() => setImageFailed(true)} />
          ) : embedUrl ? (
            <iframe title={title} src={embedUrl} referrerPolicy="no-referrer-when-downgrade" />
          ) : (
            <div className="map-fallback">
              <MapPin size={28} />
              <span>{title}</span>
            </div>
          )}
        </div>
      </motion.article>
    </motion.div>,
    document.body,
  );
}

function ReminderWindow({ reminders }: { reminders?: TravelReminder[] }) {
  const [selectedReminder, setSelectedReminder] = useState<TravelReminder | null>(null);

  if (!reminders?.length) return null;

  return (
    <>
      <aside className="reminder-window" aria-label="今日注意事項">
        <div className="reminder-window-header">
          <span className="reminder-icon">
            <BellRing size={18} strokeWidth={2.4} />
          </span>
          <div>
            <strong>今日注意事項</strong>
            <span>{reminders.length} 項提醒</span>
          </div>
        </div>
        <ul className="reminder-list">
          {reminders.map((reminder) => (
            <li key={reminder.id}>
              <span className="reminder-dot" />
              <div>
                <button
                  className="reminder-detail-button"
                  type="button"
                  onClick={() => setSelectedReminder(reminder)}
                  aria-haspopup="dialog"
                >
                  <strong>{reminder.title}</strong>
                  {reminder.note ? <p>{reminder.note}</p> : null}
                  <span>查看說明</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </aside>
      <AnimatePresence>
        {selectedReminder ? (
          <ReminderDetailModal
            reminder={selectedReminder}
            onClose={() => setSelectedReminder(null)}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

function ReminderDetailModal({
  reminder,
  onClose,
}: {
  reminder: TravelReminder;
  onClose: () => void;
}) {
  const detailLinks = reminder.detail?.links ?? [];
  const shouldShowNotionLink =
    !!reminder.notionUrl && !detailLinks.some((link) => link.url === reminder.notionUrl);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <motion.div
      className="reminder-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reminder-modal-title"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.article
        className="reminder-modal"
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <button
          className="reminder-modal-close"
          type="button"
          onClick={onClose}
          aria-label={`關閉 ${reminder.title} 說明`}
        >
          <X size={19} strokeWidth={2.6} />
        </button>
        <div className="reminder-modal-header">
          <span>Travel Reminder</span>
          <h3 id="reminder-modal-title">{reminder.title}</h3>
          {reminder.detail?.summary ? <p>{reminder.detail.summary}</p> : null}
        </div>
        <div className="reminder-modal-content">
          {reminder.detail?.sections.map((section) => (
            <section key={section.title}>
              <h4>{section.title}</h4>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        {detailLinks.length || shouldShowNotionLink ? (
          <div className="reminder-modal-actions">
            {detailLinks.map((link) => (
              <a href={link.url} target="_blank" rel="noreferrer" key={link.url}>
                {link.label}
                <ExternalLink size={14} />
              </a>
            ))}
            {shouldShowNotionLink ? (
              <a href={reminder.notionUrl} target="_blank" rel="noreferrer">
                資料來源
                <ExternalLink size={14} />
              </a>
            ) : null}
          </div>
        ) : null}
      </motion.article>
    </motion.div>,
    document.body,
  );
}

function Timeline({ day, now }: { day: TravelDay; now: Date }) {
  const [activeGuideItem, setActiveGuideItem] = useState<TravelItem | null>(null);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const shouldShowNowMarker = day.date === localDateKey(now);
  const markerIndex = shouldShowNowMarker ? currentMarkerIndex(day.items, nowMinutes) : -1;
  const cardSequenceById = new Map<string, number>();
  let cardSequence = 1;
  day.items.forEach((item) => {
    const isConnector = isMovingConnectorItem(item);
    if (!isConnector) {
      cardSequenceById.set(item.id, cardSequence);
      cardSequence += 1;
    }
  });

  return (
    <>
      <div className="timeline" style={accentStyle(day.accent)}>
        {day.items.map((item, index) => {
          const showInlineMoving = isMovingConnectorItem(item);
          const hasGuide = !!(item.restaurantGuide || item.attractionGuide);
          const hasCardActions = !!item.mapsUrl || !!item.bookingInfoUrl || hasGuide;

          return (
            <Fragment key={item.id}>
              {index === markerIndex ? <NowMarker minutes={nowMinutes} /> : null}
              <motion.article
                className={showInlineMoving ? "timeline-row is-moving-connector" : "timeline-row"}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.4, delay: index * 0.07 }}
                whileHover={showInlineMoving ? undefined : { y: -6 }}
              >
                <div
                  className={
                    parseClockTime(item.time) === null
                      ? "timeline-axis is-flexible"
                      : "timeline-axis"
                  }
                >
                  <span className="timeline-time">{item.time ?? "彈性"}</span>
                  <span className="timeline-node" />
                </div>
                {showInlineMoving ? (
                  <MovingConnector day={day} items={day.items} item={item} index={index} />
                ) : (
                  <div className={`itinerary-card${hasCardActions ? " has-card-actions" : ""}`}>
                    <span
                      className="item-sequence"
                      aria-label={`第 ${cardSequenceById.get(item.id) ?? index + 1} 個行程`}
                    >
                      {String(cardSequenceById.get(item.id) ?? index + 1).padStart(2, "0")}
                    </span>
                    <TypeBadge item={item} />
                    <ItemImage item={item} />
                    <div className="item-body">
                      <div className="item-meta">
                        <span>{item.location ?? day.city}</span>
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.summary}</p>
                      <FlightDetails item={item} />
                      <RentalDetails item={item} />
                    </div>
                    {hasCardActions ? (
                      <div className="item-card-actions">
                        {hasGuide ? (
                          <GuideButton item={item} onOpenGuide={setActiveGuideItem} />
                        ) : null}
                        {item.bookingInfoUrl ? (
                          <a
                            className="item-booking-link"
                            href={item.bookingInfoUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`開啟 ${item.title} 預訂資訊`}
                            data-tooltip="預訂資訊"
                            title="預訂資訊"
                          >
                            <TicketCheck size={18} strokeWidth={2.5} />
                          </a>
                        ) : null}
                        {item.mapsUrl ? (
                          <a
                            className="item-map-link"
                            href={item.mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`在 Google Maps 開啟 ${item.title}`}
                            title="Google Maps"
                          >
                            <GoogleMapsIcon />
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )}
              </motion.article>
            </Fragment>
          );
        })}
        {markerIndex === day.items.length ? <NowMarker minutes={nowMinutes} /> : null}
      </div>
      <AnimatePresence>
        {activeGuideItem?.restaurantGuide ? (
          <RestaurantGuideModal
            item={activeGuideItem}
            onClose={() => setActiveGuideItem(null)}
          />
        ) : null}
        {activeGuideItem?.attractionGuide ? (
          <AttractionGuideModal
            item={activeGuideItem}
            onClose={() => setActiveGuideItem(null)}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

function GoogleMapsIcon() {
  return (
    <svg className="google-maps-icon" viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M16 2.8c-5.1 0-9.2 4.1-9.2 9.2 0 6.9 9.2 17.2 9.2 17.2S25.2 18.9 25.2 12c0-5.1-4.1-9.2-9.2-9.2Z"
        fill="#34a853"
      />
      <path
        d="M16 2.8c-5.1 0-9.2 4.1-9.2 9.2 0 3.8 2.8 8.8 5.2 12.2l4-7.3A4.9 4.9 0 0 1 16 7.1V2.8Z"
        fill="#4285f4"
      />
      <path
        d="M20 16.9 16 29.2s9.2-10.3 9.2-17.2c0-2.3-.8-4.4-2.2-6l-6.4 6.4 3.4 4.5Z"
        fill="#fbbc04"
      />
      <path
        d="M9.5 5.5 13 9.1A4.9 4.9 0 0 1 20.9 13l3.1-3.1C23 5.8 19.8 2.8 16 2.8c-2.5 0-4.8 1-6.5 2.7Z"
        fill="#ea4335"
      />
      <circle cx="16" cy="12" r="3.4" fill="#fff" />
    </svg>
  );
}

function MovingConnector({
  day,
  items,
  item,
  index,
}: {
  day: TravelDay;
  items: TravelItem[];
  item: TravelItem;
  index: number;
}) {
  const Icon = movingIconForItem(item);
  const endpoints = movingEndpoints(day, items, index);
  const modeLabel = item.type === "walk" ? "步行移動" : "交通移動";
  const durationLabel = movingDurationLabel(item);
  const [isOpen, setIsOpen] = useState(false);
  const connectorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (!connectorRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`moving-connector${isOpen ? " is-open" : ""}`} ref={connectorRef}>
      <span className="moving-connector-line" aria-hidden="true" />
      <button
        className="moving-connector-hotspot"
        type="button"
        aria-expanded={isOpen}
        aria-label={`查看 ${item.title} 交通資訊`}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="moving-connector-vehicle" aria-hidden="true">
          <Icon size={18} strokeWidth={2.5} />
        </span>
      </button>
      <div className="moving-connector-popover" onClick={() => setIsOpen(false)}>
        <strong>{modeLabel}</strong>
        <em>{item.title}</em>
        <span>{endpoints.from}</span>
        <span>{endpoints.to}</span>
        <b>大約時間 {durationLabel}</b>
        <small>{item.summary}</small>
        {item.mapsUrl ? (
          <a className="moving-map-link" href={item.mapsUrl} target="_blank" rel="noreferrer">
            路線
            <ExternalLink size={15} />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function FlightDetails({ item }: { item: TravelItem }) {
  if (!item.flightDetails) return null;

  const details = item.flightDetails;

  return (
    <div className="flight-details" aria-label={`${details.flightNo} 航班資訊`}>
      <div className="flight-route">
        <span>{details.from}</span>
        <strong>{details.flightNo}</strong>
        <span>{details.to}</span>
      </div>
      <div className="flight-times">
        <div>
          <span>出發</span>
          <strong>{details.departure}</strong>
          {details.terminalFrom ? <em>{details.terminalFrom}</em> : null}
        </div>
        <div>
          <span>抵達</span>
          <strong>{details.arrival}</strong>
          {details.terminalTo ? <em>{details.terminalTo}</em> : null}
        </div>
      </div>
      <div className="flight-meta">
        <span>飛行 {details.duration}</span>
        {details.baggage ? <span>行李 {details.baggage}</span> : null}
        {details.class ? <span>艙等 {details.class}</span> : null}
        {details.validUntil ? <span>效期至 {details.validUntil}</span> : null}
      </div>
    </div>
  );
}

function RentalDetails({ item }: { item: TravelItem }) {
  if (!item.rentalDetails) return null;

  const details = item.rentalDetails;

  return (
    <div className="rental-details" aria-label={`${item.title} 租車資訊`}>
      <div className="rental-vehicle">
        <span>車型級距</span>
        <strong>{details.vehicleClass ?? "現場確認"}</strong>
        {details.vehicleCode ? <em>{details.vehicleCode}</em> : null}
      </div>
      <div className="rental-stops">
        <div>
          <span>取車</span>
          <strong>{details.pickup.time}</strong>
          <em>{details.pickup.location}</em>
          {details.pickup.hours ? <small>{details.pickup.hours}</small> : null}
        </div>
        <div>
          <span>還車</span>
          <strong>{details.dropoff.time}</strong>
          <em>{details.dropoff.location}</em>
          {details.dropoff.hours ? <small>{details.dropoff.hours}</small> : null}
        </div>
      </div>
      <div className="rental-meta">
        {details.confirmationNo ? <span>確認號 {details.confirmationNo}</span> : null}
        {details.driverAge ? <span>駕駛年齡 {details.driverAge}</span> : null}
        {details.payment ? <span>預估費用 {details.payment}</span> : null}
        {details.rateCode ? <span>Rate {details.rateCode}</span> : null}
        {details.protection?.map((protection) => (
          <span key={protection}>{protection}</span>
        ))}
      </div>
      {details.notes?.length ? (
        <ul className="rental-notes">
          {details.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function NowMarker({ minutes }: { minutes: number }) {
  return (
    <div className="now-marker-row" aria-label={`現在時間 ${formatClock(minutes)}`}>
      <span className="now-marker-label">現在 {formatClock(minutes)}</span>
      <span className="now-marker-rule" />
    </div>
  );
}

function ItemImage({ item }: { item: TravelItem }) {
  const Icon = itemIcons[item.type];

  return (
    <div className="item-image-wrap">
      {item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : null}
      <span className="item-type-icon" title={item.type}>
        <Icon size={18} />
      </span>
    </div>
  );
}

function GuideButton({
  item,
  onOpenGuide,
}: {
  item: TravelItem;
  onOpenGuide: (item: TravelItem) => void;
}) {
  const guideType = item.restaurantGuide ? "restaurant" : item.attractionGuide ? "attraction" : "";
  const guideLabel = guideType === "restaurant" ? "餐廳介紹" : "景點介紹";
  const GuideIcon = guideType === "restaurant" ? BookOpenText : Landmark;

  if (!guideType) return null;

  return (
    <button
      className={`guide-trigger guide-trigger-${guideType}`}
      type="button"
      onClick={() => onOpenGuide(item)}
      aria-label={`開啟 ${item.title} ${guideLabel}`}
      data-tooltip={guideLabel}
      title={guideLabel}
    >
      <GuideIcon size={18} strokeWidth={2.5} />
    </button>
  );
}

function AttractionGuideModal({ item, onClose }: { item: TravelItem; onClose: () => void }) {
  const guide = item.attractionGuide;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!guide) return null;

  return createPortal(
    <motion.div
      className="restaurant-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.title} 景點介紹`}
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.article
        className="restaurant-modal is-attraction"
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <button
          className="restaurant-modal-close"
          type="button"
          onClick={onClose}
          aria-label={`關閉 ${item.title} 景點介紹`}
        >
          <X size={19} strokeWidth={2.6} />
        </button>
        <div className="restaurant-modal-header">
          <span>{item.location}</span>
          <h3>{item.title}</h3>
          <p>{guide.intro}</p>
        </div>
        {item.image ? (
          <div className="attraction-modal-image">
            <img src={item.image} alt={`${item.title} 景點照片`} />
          </div>
        ) : null}
        <div className="restaurant-modal-grid">
          <section>
            <h4>參觀重點</h4>
            <ul className="restaurant-recommendations">
              {guide.highlights.map((highlight) => (
                <li className={highlight.image ? undefined : "without-image"} key={highlight.name}>
                  {highlight.image ? (
                    <img src={highlight.image} alt={highlight.zhName ?? highlight.name} />
                  ) : null}
                  <div>
                    <strong>{highlight.name}</strong>
                    {highlight.zhName ? <em>{highlight.zhName}</em> : null}
                    {highlight.note ? <span>{highlight.note}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h4>官方資訊</h4>
            <div className="restaurant-links">
              {guide.links.map((link) => (
                <a href={link.url} target="_blank" rel="noreferrer" key={link.url}>
                  {link.label}
                  <ExternalLink size={14} />
                </a>
              ))}
            </div>
            {guide.sources?.length ? (
              <div className="restaurant-sources">
                <span>參考來源</span>
                {guide.sources.map((source) => (
                  <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>
                    {source.label}
                  </a>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </motion.article>
    </motion.div>,
    document.body,
  );
}

function RestaurantGuideModal({ item, onClose }: { item: TravelItem; onClose: () => void }) {
  const guide = item.restaurantGuide;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!guide) return null;

  return createPortal(
    <motion.div
      className="restaurant-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.title} 餐廳介紹`}
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.article
        className="restaurant-modal"
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <button
          className="restaurant-modal-close"
          type="button"
          onClick={onClose}
          aria-label={`關閉 ${item.title} 餐廳介紹`}
        >
          <X size={19} strokeWidth={2.6} />
        </button>
        <div className="restaurant-modal-header">
          <span>{item.location}</span>
          <h3>{item.title}</h3>
          <p>{guide.intro}</p>
        </div>
        <div className="restaurant-modal-grid">
          {guide.recommendations.length ? (
            <section>
              <h4>推薦品項</h4>
              <ul className="restaurant-recommendations">
                {guide.recommendations.map((dish) => (
                  <li key={dish.name}>
                    {dish.image ? <img src={dish.image} alt={dish.zhName ?? dish.name} /> : null}
                    <div>
                      <strong>{dish.name}</strong>
                      {dish.zhName ? <em>{dish.zhName}</em> : null}
                      {dish.note ? <span>{dish.note}</span> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className={guide.recommendations.length ? undefined : "restaurant-menu-section-wide"}>
            <h4>菜單與來源</h4>
            {guide.menuLinks.length ? (
              <div className="restaurant-links">
                {guide.menuLinks.map((link) => (
                  <a href={link.url} target="_blank" rel="noreferrer" key={link.url}>
                    {link.label}
                    <ExternalLink size={14} />
                  </a>
                ))}
              </div>
            ) : null}
            {guide.menuEmbeds?.length ? (
              <div className="restaurant-menu-embeds">
                {guide.menuEmbeds.map((menu) => (
                  <div className="restaurant-menu-embed" key={menu.url}>
                    <div>
                      <span>{menu.label}</span>
                      <a href={menu.url} target="_blank" rel="noreferrer">
                        開啟 PDF
                        <ExternalLink size={13} />
                      </a>
                    </div>
                    <iframe src={menu.url} title={`${item.title} ${menu.label}`} loading="lazy" />
                  </div>
                ))}
              </div>
            ) : null}
            {guide.sources?.length ? (
              <div className="restaurant-sources">
                <span>參考來源</span>
                {guide.sources.map((source) => (
                  <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>
                    {source.label}
                  </a>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </motion.article>
    </motion.div>,
    document.body,
  );
}

function TypeBadge({ item }: { item: TravelItem }) {
  const labelMap: Record<TravelItem["type"], string> = {
    flight: "航班",
    food: "餐飲",
    hotel: "住宿",
    landmark: "景點",
    museum: "展館",
    shopping: "購物",
    walk: "散步",
    transit: "交通",
    note: "備註",
  };

  return <span className={`type-badge type-${item.type}`}>{labelMap[item.type]}</span>;
}
