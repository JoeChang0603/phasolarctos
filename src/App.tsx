import { Fragment, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BellRing,
  CalendarDays,
  ExternalLink,
  Luggage,
  MapPin,
  Navigation,
  PersonStanding,
  Plane,
  Sparkles,
  TrainFront,
  Utensils,
  Waves,
  X,
} from "lucide-react";
import tramMapImage from "./assets/melbourne-tram-network.png";
import sydneyAirportLineImage from "./assets/sydney-t8-airport-line.png";
import sydneyLightRailImage from "./assets/sydney-light-rail-network-map.png";
import tripJson from "./data/trip.json";
import type { TravelDay, TravelItem, TravelReminder, TripData } from "./types";

const trip = tripJson as TripData;

type TransitMap = {
  id: "melbourne-tram" | "sydney-airport" | "sydney-light-rail";
  label: string;
  image: string;
  icon: typeof TrainFront;
};

type TransitCity = {
  id: "sydney" | "melbourne";
  label: string;
  icon: typeof Sparkles;
  maps: TransitMap[];
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
    ],
  },
];

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

function dayRouteEmbedUrl(day: TravelDay) {
  const points = Array.from(
    new Set(
      day.items
        .filter((item) => item.type !== "note")
        .map((item) => routePoint(day, item).trim())
        .filter(Boolean),
    ),
  );

  if (points.length < 2) return day.mapsEmbedUrl;

  const path = points.map((point) => encodeURIComponent(point)).join("/");
  return `https://www.google.com/maps/dir/${path}?output=embed`;
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
        <img src={map.image} alt={map.label} />
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
  const travelerPosition = days.length > 1 ? (activeIndex / (days.length - 1)) * 100 : 0;

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

  return (
    <aside className="day-overview" style={accentStyle(day.accent)}>
      <div className="day-marker">{dayNumber}</div>
      <p className="date-line">{formatDay(day.date)}</p>
      <h2>{day.title}</h2>
      <p className="day-summary">{day.summary}</p>
      <ReminderWindow reminders={day.reminders} />
      <div className="map-frame">
        {mapUrl ? (
          <iframe
            title={`${day.title} 路線地圖`}
            src={mapUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
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

function ReminderWindow({ reminders }: { reminders?: TravelReminder[] }) {
  if (!reminders?.length) return null;

  return (
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
              <strong>{reminder.title}</strong>
              {reminder.note ? <p>{reminder.note}</p> : null}
              {reminder.notionUrl ? (
                <a href={reminder.notionUrl} target="_blank" rel="noreferrer">
                  Notion
                  <ExternalLink size={13} />
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function Timeline({ day, now }: { day: TravelDay; now: Date }) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const shouldShowNowMarker = day.date === localDateKey(now);
  const markerIndex = shouldShowNowMarker ? currentMarkerIndex(day.items, nowMinutes) : -1;

  return (
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
                parseClockTime(item.time) === null ? "timeline-axis is-flexible" : "timeline-axis"
              }
            >
              <span className="timeline-time">{item.time ?? "彈性"}</span>
              <span className="timeline-node" />
            </div>
            <div className="itinerary-card">
              <TypeBadge item={item} />
              <ItemImage item={item} />
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
