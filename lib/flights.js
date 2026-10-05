// Cheap flights from local airports, via the Travelpayouts (Aviasales) Data API.
// Prices are what travellers found in the last 48 hours, refreshed every few hours.
// Needs two settings in Vercel (Settings > Environment Variables):
//   TRAVELPAYOUTS_TOKEN  - your API token (keep private: no NEXT_PUBLIC_ in front)
//   TRAVELPAYOUTS_MARKER - your partner marker, so bookings are credited to you

export const AIRPORTS = {
  EMA: { name: "East Midlands", short: "East Midlands", drive: "25 min" },
  BHX: { name: "Birmingham", short: "Birmingham", drive: "35 min" },
  LTN: { name: "London Luton", short: "Luton", drive: "1 hr 20" },
};

const PLACES = {
  ALC: "Alicante", AGP: "Malaga", PMI: "Palma, Majorca", IBZ: "Ibiza", MAH: "Menorca", BCN: "Barcelona", MAD: "Madrid",
  VLC: "Valencia", SVQ: "Seville", TFS: "Tenerife", TCI: "Tenerife", LPA: "Gran Canaria", ACE: "Lanzarote", FUE: "Fuerteventura",
  FAO: "Faro", LIS: "Lisbon", OPO: "Porto", FNC: "Madeira", DUB: "Dublin", ORK: "Cork", KIR: "Kerry", NOC: "Knock", BFS: "Belfast",
  EDI: "Edinburgh", GLA: "Glasgow", ABZ: "Aberdeen", INV: "Inverness", JER: "Jersey", GCI: "Guernsey", IOM: "Isle of Man",
  NQY: "Newquay", AMS: "Amsterdam", PAR: "Paris", CDG: "Paris", BRU: "Brussels", BER: "Berlin", MUC: "Munich", FRA: "Frankfurt",
  CGN: "Cologne", DUS: "Dusseldorf", HAM: "Hamburg", PRG: "Prague", BUD: "Budapest", KRK: "Krakow", WAW: "Warsaw", GDN: "Gdansk",
  WRO: "Wroclaw", VIE: "Vienna", SZG: "Salzburg", INN: "Innsbruck", GVA: "Geneva", ZRH: "Zurich", BSL: "Basel", MIL: "Milan",
  BGY: "Milan Bergamo", ROM: "Rome", VCE: "Venice", PSA: "Pisa", NAP: "Naples", BLQ: "Bologna", CTA: "Catania", PMO: "Palermo",
  OLB: "Sardinia", CAG: "Cagliari", MLA: "Malta", ATH: "Athens", HER: "Crete", CHQ: "Crete (Chania)", RHO: "Rhodes", CFU: "Corfu",
  KGS: "Kos", ZTH: "Zante", SKG: "Thessaloniki", PFO: "Paphos", LCA: "Larnaca", DLM: "Dalaman", AYT: "Antalya", BJV: "Bodrum",
  IST: "Istanbul", SPU: "Split", DBV: "Dubrovnik", PUY: "Pula", TIV: "Tivat", RAK: "Marrakech", AGA: "Agadir", CPH: "Copenhagen",
  OSL: "Oslo", STO: "Stockholm", HEL: "Helsinki", RIX: "Riga", TLL: "Tallinn", VNO: "Vilnius", REK: "Reykjavik", KEF: "Reykjavik",
  SOF: "Sofia", BOJ: "Bourgas", OTP: "Bucharest", NCE: "Nice", MRS: "Marseille", LYS: "Lyon", BOD: "Bordeaux", TLS: "Toulouse",
  NYC: "New York", ORL: "Orlando", MCO: "Orlando", DXB: "Dubai", DOH: "Doha", HRG: "Hurghada", SSH: "Sharm el-Sheikh",
  BKK: "Bangkok", CUN: "Cancun", BGI: "Barbados", SXF: "Berlin", EIN: "Eindhoven", RTM: "Rotterdam", BRS: "Bristol", BHD: "Belfast",
};
const AIRLINES = {
  U2: "easyJet", FR: "Ryanair", LS: "Jet2", W6: "Wizz Air", W9: "Wizz Air", BA: "British Airways", EI: "Aer Lingus",
  TOM: "TUI", BY: "TUI", KL: "KLM", LH: "Lufthansa", AF: "Air France", LM: "Loganair", BE: "Flybe", TK: "Turkish Airlines",
  EK: "Emirates", VS: "Virgin Atlantic", VY: "Vueling", IB: "Iberia", TP: "TAP Portugal", SN: "Brussels Airlines", PC: "Pegasus",
};
export const placeName = (code) => PLACES[code] || code;
export const airlineName = (code) => AIRLINES[code] || code || "";

export const flightsConfigured = () => Boolean(process.env.TRAVELPAYOUTS_TOKEN && process.env.TRAVELPAYOUTS_MARKER);

function bookingLink(link) {
  const marker = process.env.TRAVELPAYOUTS_MARKER || "";
  if (!link) return null;
  const url = new URL(link.startsWith("http") ? link : `https://www.aviasales.com${link}`);
  url.searchParams.set("marker", marker);
  url.searchParams.set("currency", "gbp");
  return url.toString();
}

function sample(origin) {
  const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const rows = {
    EMA: [["ALC", 58, "FR", 10, 17, 0], ["DUB", 34, "FR", 12, 14, 0], ["FAO", 71, "LS", 20, 27, 0], ["KRK", 46, "FR", 8, 12, 0], ["TFS", 129, "LS", 30, 37, 0], ["PMI", 82, "U2", 15, 22, 0]],
    BHX: [["AMS", 61, "KL", 9, 12, 0], ["AGP", 79, "LS", 18, 25, 0], ["BCN", 88, "VY", 11, 15, 0], ["EDI", 49, "LM", 7, 9, 0], ["DLM", 142, "LS", 25, 32, 0], ["NYC", 389, "EI", 40, 47, 1]],
    LTN: [["BUD", 39, "W6", 6, 10, 0], ["ROM", 52, "U2", 14, 18, 0], ["LIS", 64, "U2", 21, 25, 0], ["ATH", 96, "W6", 28, 35, 0], ["PRG", 44, "W6", 13, 16, 0], ["RAK", 99, "U2", 33, 40, 0]],
  }[origin] || [];
  return rows.map(([d, p, a, out, back, stops]) => ({
    origin, destination: d, price: p * 100, airline: a, departure_at: day(out), return_at: day(back),
    transfers: stops, link: null,
  }));
}

// Cheapest return trip to each destination from one airport.
export async function cheapestFrom(origin) {
  if (process.env.FLIGHTS_SAMPLE === "1") return sample(origin);
  if (!flightsConfigured()) return [];
  const qs = new URLSearchParams({
    origin, currency: "gbp", sorting: "price", unique: "true", one_way: "false", limit: "30",
    token: process.env.TRAVELPAYOUTS_TOKEN,
  });
  try {
    const res = await fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${qs}`, { next: { revalidate: 21600 } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || [])
      .filter((f) => f.price > 0 && f.departure_at && new Date(f.departure_at).getTime() > Date.now())
      .map((f) => ({
        origin, destination: f.destination, price: Math.round(f.price * 100), airline: f.airline,
        departure_at: f.departure_at, return_at: f.return_at, transfers: f.transfers ?? 0,
        link: bookingLink(f.link),
      }));
  } catch {
    return [];
  }
}

// Hotel search for a flight's city and dates, on Booking.com.
// No commission yet: when a hotel partner approves us, swap this one function
// for their affiliate link and every hotel button on the site follows.
export function hotelLink(city, checkin, checkout) {
  const day = (iso) => (typeof iso === "string" && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : null);
  const inDay = day(checkin);
  let outDay = day(checkout);
  if (inDay && (!outDay || outDay <= inDay)) {
    const d = new Date(inDay + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + 3);
    outDay = d.toISOString().slice(0, 10);
  }
  const qs = new URLSearchParams({ ss: city, group_adults: "2", no_rooms: "1", group_children: "0", lang: "en-gb", selected_currency: "GBP" });
  if (inDay) { qs.set("checkin", inDay); qs.set("checkout", outDay); }
  return `https://www.booking.com/searchresults.en-gb.html?${qs.toString()}`;
}
