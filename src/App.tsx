import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  BellRing,
  BookOpenText,
  BusFront,
  CalendarDays,
  ExternalLink,
  Landmark,
  Luggage,
  MapPin,
  Maximize2,
  Navigation,
  PlaneTakeoff,
  PersonStanding,
  Plane,
  Sparkles,
  TrainFront,
  Utensils,
  Waves,
  X,
} from "lucide-react";
import melbourneSkybusAirportImage from "./assets/melbourne-skybus-airport.png";
import melbourneSkybusSouthernCrossImage from "./assets/melbourne-skybus-southern-cross.png";
import tramMapImage from "./assets/melbourne-tram-network.png";
import sydneyAirportLineImage from "./assets/sydney-t8-airport-line.png";
import sydneyBusNetworkImage from "./assets/sydney-bus-network-map.jpg";
import sydneyFerriesImage from "./assets/sydney-ferries-network-map.png";
import sydneyLightRailImage from "./assets/sydney-light-rail-network-map.png";
import sydneyMetroRailImage from "./assets/sydney-metro-rail-network-map.png";
import tripJson from "./data/trip.json";
import type { TravelDay, TravelItem, TravelReminder, TripData } from "./types";

const trip = tripJson as TripData;
const googleMapsEmbedApiKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY;
const googleMapsStaticApiKey =
  import.meta.env.VITE_GOOGLE_MAPS_STATIC_API_KEY || googleMapsEmbedApiKey;

type TransitMap = {
  id:
    | "melbourne-skybus"
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
    { lat: -37.8136, lng: 144.9631, label: "Melbourne" },
    { lat: -37.5800, lng: 143.8651, label: "Sovereign Hill, Ballarat" },
    { lat: -37.6570, lng: 145.4027, label: "Balgownie Estate Yarra Valley" },
    { lat: -37.6570, lng: 145.4027, label: "Restaurant 1309" },
  ],
  "day-5-balloon-phillip-island": [
    { lat: -37.6568, lng: 145.3789, label: "Yarra Valley" },
    { lat: -38.2224, lng: 145.3115, label: "Moonlit Sanctuary" },
    { lat: -38.5060, lng: 145.1501, label: "Phillip Island Penguin Parade" },
    { lat: -38.4513, lng: 145.2390, label: "Phillip Island" },
  ],
  "day-6-dandenong": [
    { lat: -37.9088, lng: 145.3553, label: "Puffing Billy Railway" },
    { lat: -38.4867, lng: 145.2644, label: "Koala Conservation Reserve" },
    { lat: -37.8136, lng: 144.9631, label: "Melbourne CBD" },
  ],
  "day-7-melbourne-city": [
    { lat: -37.8136, lng: 144.9631, label: "Melbourne CBD" },
    { lat: -37.7964, lng: 144.9612, label: "The University of Melbourne" },
    { lat: -37.8162, lng: 144.9692, label: "Hosier Lane" },
    { lat: -37.8098, lng: 144.9652, label: "State Library Victoria" },
  ],
  "day-8-melbourne-museum": [
    { lat: -37.8136, lng: 144.9631, label: "Melbourne CBD" },
    { lat: -37.8033, lng: 144.9717, label: "Melbourne Museum" },
    { lat: -37.8136, lng: 144.9631, label: "Melbourne CBD" },
  ],
  "day-9-melbourne-return": [
    { lat: -37.8068, lng: 144.9574, label: "Queen Victoria Market" },
    { lat: -37.8206, lng: 144.9584, label: "SEA LIFE Melbourne Aquarium" },
    { lat: -37.8304, lng: 144.9730, label: "Shrine of Remembrance" },
    { lat: -37.8301, lng: 144.9813, label: "Royal Botanic Gardens Victoria" },
    { lat: -37.6690, lng: 144.8410, label: "Melbourne Airport" },
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

function cityLabel(days: TravelDay[]) {
  const places = days.flatMap((day) => day.city.split("/").map((place) => place.trim()));
  return Array.from(new Set(places)).join(" / ");
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

export default function App() {
  const days = useMemo(
    () => [...trip.days].sort((a, b) => a.date.localeCompare(b.date)),
    [],
  );
  const now = useCurrentTime();
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTransitMap, setActiveTransitMap] = useState<TransitMap | null>(null);
  const [expandedTransitCity, setExpandedTransitCity] = useState<TransitCity["id"] | null>(null);
  const activeDay = days[activeIndex];

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

  return (
    <main className="app-shell">
      <section className="hero" aria-label="旅行總覽">
        <AnimatePresence mode="wait">
          <motion.img
            key={activeDay.id}
            className="hero-image"
            src={activeDay.coverImage}
            alt=""
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </AnimatePresence>
        <div className="hero-shade" />
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <div className="trip-kicker">
            <CalendarDays size={18} />
            <span>{trip.dateRange}</span>
            <span>{cityLabel(days)}</span>
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
        <DayRail days={days} activeIndex={activeIndex} onSelect={setActiveIndex} />
      </section>

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
      </AnimatePresence>
    </main>
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
  return (
    <div className="map-quick-actions" aria-label="交通路線圖">
      {transitCities.map((city) => {
        const CityIcon = city.icon;

        return (
          <div
            className={
              expandedCity === city.id ? "map-city-group is-expanded" : "map-city-group"
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
    </div>
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
  onSelect,
}: {
  days: TravelDay[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const activeStopRef = useRef<HTMLButtonElement | null>(null);
  const travelerPosition = days.length > 1 ? (activeIndex / (days.length - 1)) * 100 : 0;

  useEffect(() => {
    activeStopRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeIndex]);

  return (
    <nav className="day-rail" aria-label="選擇旅行日期">
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

  return (
    <aside className="day-overview" style={accentStyle(day.accent)}>
      <div className="day-marker">{dayNumber}</div>
      <p className="date-line">{formatDay(day.date)}</p>
      <h2>{day.title}</h2>
      <p className="day-summary">{day.summary}</p>
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
          <span>Day 0 Reminder</span>
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
                Notion
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

  return (
    <>
      <div className="timeline" style={accentStyle(day.accent)}>
        {day.items.map((item, index) => (
          <Fragment key={item.id}>
            {index === markerIndex ? <NowMarker minutes={nowMinutes} /> : null}
            <motion.article
              className="timeline-row"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.4, delay: index * 0.07 }}
              whileHover={{ y: -6 }}
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
              <div className="itinerary-card">
                <span className="item-sequence" aria-label={`第 ${index + 1} 個行程`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <TypeBadge item={item} />
                <ItemImage item={item} onOpenGuide={setActiveGuideItem} />
                <div className="item-body">
                  <div className="item-meta">
                    <span>{item.location ?? day.city}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  <FlightDetails item={item} />
                  <div className="item-actions">
                    {item.mapsUrl ? (
                      <a href={item.mapsUrl} target="_blank" rel="noreferrer">
                        地圖
                        <ExternalLink size={15} />
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.article>
          </Fragment>
        ))}
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

function NowMarker({ minutes }: { minutes: number }) {
  return (
    <div className="now-marker-row" aria-label={`現在時間 ${formatClock(minutes)}`}>
      <span className="now-marker-label">現在 {formatClock(minutes)}</span>
      <span className="now-marker-rule" />
    </div>
  );
}

function ItemImage({
  item,
  onOpenGuide,
}: {
  item: TravelItem;
  onOpenGuide: (item: TravelItem) => void;
}) {
  const Icon = itemIcons[item.type];
  const guideType = item.restaurantGuide ? "restaurant" : item.attractionGuide ? "attraction" : "";
  const guideLabel = guideType === "restaurant" ? "餐廳介紹" : "景點介紹";
  const GuideIcon = guideType === "restaurant" ? BookOpenText : Landmark;

  return (
    <div className="item-image-wrap">
      {item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : null}
      <span className="item-type-icon" title={item.type}>
        <Icon size={18} />
      </span>
      {guideType ? (
        <button
          className={`guide-trigger guide-trigger-${guideType}`}
          type="button"
          onClick={() => onOpenGuide(item)}
          aria-label={`開啟 ${item.title} ${guideLabel}`}
          data-tooltip={guideLabel}
        >
          <GuideIcon size={18} strokeWidth={2.5} />
        </button>
      ) : null}
    </div>
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
          <section>
            <h4>菜單與來源</h4>
            <div className="restaurant-links">
              {guide.menuLinks.map((link) => (
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
