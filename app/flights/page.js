import Link from "next/link";
import { AIRPORTS, airlineName, cheapestFrom, flightsConfigured, placeName } from "@/lib/flights";
import { gbp } from "@/lib/format";
import PartnerScript from "@/components/PartnerScript";

export const metadata = {
  title: "Cheap flights from East Midlands, Birmingham and Luton",
  description: "The cheapest return flights found from our local airports in the last 48 hours. Any commission goes to local causes in Market Bosworth.",
};

const shortDate = (iso) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" });
const nights = (a, b) => (a && b ? Math.round((new Date(b) - new Date(a)) / 864e5) : null);

export default async function FlightsPage({ searchParams }) {
  const sp = await searchParams;
  const from = AIRPORTS[sp.from] ? sp.from : "";
  const codes = from ? [from] : Object.keys(AIRPORTS);
  const lists = await Promise.all(codes.map((c) => cheapestFrom(c)));
  const flights = lists.flat().sort((a, b) => a.price - b.price).slice(0, from ? 30 : 36);
  const live = flightsConfigured() || process.env.FLIGHTS_SAMPLE === "1";

  return (
    <div className="wrap" style={{ paddingBlock: 32 }}>
      <h1 className="page-title">Cheap flights</h1>
      <p className="page-lead">
        The cheapest return flights travellers have found from our local airports in the last 48 hours. Prices change quickly, so check before you book.
      </p>
      <p className="flights-good"><span aria-hidden="true">❤</span> We earn a small commission if you book through these links, at no extra cost to you. <strong>Every penny goes to <Link href="/causes">local causes</Link>.</strong></p>

      <PartnerScript />

      <nav className="chips" aria-label="Airports" style={{ flexWrap: "wrap", width: "auto", margin: "18px 0 22px" }}>
        <Link className="chip" href="/flights" aria-current={!from}>All local airports</Link>
        {Object.entries(AIRPORTS).map(([code, a]) => (
          <Link key={code} className="chip" href={`/flights?from=${code}`} aria-current={from === code}>{a.name} <span className="hint">· {a.drive}</span></Link>
        ))}
      </nav>

      {!live ? (
        <div className="empty">Flight deals are coming soon.</div>
      ) : flights.length ? (
        <ul className="flights">
          {flights.map((f) => {
            const n = nights(f.departure_at, f.return_at);
            return (
              <li key={`${f.origin}-${f.destination}`} className="flight">
                <div className="flight-main">
                  <div className="flight-route"><span className="hint">{AIRPORTS[f.origin]?.short} to</span> <strong>{placeName(f.destination)}</strong></div>
                  <div className="flight-meta">
                    {shortDate(f.departure_at)}{f.return_at ? ` – ${shortDate(f.return_at)}` : ""}{n ? ` · ${n} night${n === 1 ? "" : "s"}` : ""}
                    {" · "}{f.transfers ? `${f.transfers} stop${f.transfers === 1 ? "" : "s"}` : "Direct"}
                    {f.airline ? ` · ${airlineName(f.airline)}` : ""}
                  </div>
                </div>
                <div className="flight-price"><small>Return from</small><span className="num">{gbp(f.price)}</span></div>
                {f.link
                  ? <a className="btn btn-brass" href={f.link} target="_blank" rel="sponsored noopener noreferrer">See flights</a>
                  : <span className="btn btn-ghost" aria-disabled="true">Sample</span>}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="empty">No deals found right now. Check back in a few hours.</div>
      )}

      <p className="hint" style={{ marginTop: 28, maxWidth: "70ch" }}>
        Prices are per person for a return trip, found by other travellers in the last 48 hours, and may have changed. Booking is with the airline or travel agent you choose on the next page, not with Going Going Gone.
      </p>
    </div>
  );
}
