// /api/fn/bq?symbol=AAPL : a quote with the extended session. Last price, pre-market and after-hours prices with
// their times, bid and ask, and the day's range, from Yahoo's quoteSummary price and summaryDetail modules.
import { cached, resolve } from "../providers.js";
import { quoteSummary, yahooSymbol } from "./des.js";

const STATE = {
  PREPRE: "Closed (pre-market opens 4:00 ET)",
  PRE: "Pre-market",
  REGULAR: "Open",
  POST: "After hours",
  POSTPOST: "Closed (after hours ended 20:00 ET)",
  CLOSED: "Closed",
};

const raw = (x) => (x && Number.isFinite(x.raw) ? x.raw : null);
const leg = (p, k) =>
  raw(p[`${k}Price`]) == null
    ? null
    : {
        price: raw(p[`${k}Price`]),
        change: raw(p[`${k}Change`]),
        changePct: raw(p[`${k}ChangePercent`]) == null ? null : raw(p[`${k}ChangePercent`]) * 100,
        time: p[`${k}Time`] || null,
      };

// quoteSummary (price + summaryDetail) -> the BQ screen. Yahoo keeps the last pre-market and after-hours prints
// until the next session, so each one carries its own time.
export function parseQuote(r) {
  const p = r?.price;
  if (!p || raw(p.regularMarketPrice) == null) return null;
  const d = r.summaryDetail || {};
  return {
    name: p.longName || p.shortName?.trim() || null,
    exchange: p.exchangeName || null,
    currency: p.currency || null,
    state: p.marketState || null,
    stateText: STATE[p.marketState] || p.marketState || null,
    delayMin: p.exchangeDataDelayedBy ?? null,
    last: leg(p, "regularMarket"),
    pre: leg(p, "preMarket"),
    post: leg(p, "postMarket"),
    bid: raw(d.bid),
    bidSize: raw(d.bidSize),
    ask: raw(d.ask),
    askSize: raw(d.askSize),
    open: raw(p.regularMarketOpen) ?? raw(d.open),
    high: raw(p.regularMarketDayHigh) ?? raw(d.dayHigh),
    low: raw(p.regularMarketDayLow) ?? raw(d.dayLow),
    prevClose: raw(p.regularMarketPreviousClose) ?? raw(d.previousClose),
    volume: raw(p.regularMarketVolume) ?? raw(d.volume),
    avgVolume: raw(p.averageDailyVolume3Month),
  };
}

export default async function (q) {
  const sym = await resolve(q.symbol);
  const y =
    sym.exchange === "US" ? sym.ticker.replace(/\./g, "-") : yahooSymbol(sym.id);
  if (!y)
    throw Object.assign(
      new Error("BQ covers stocks, ETFs, indices, futures and currencies. For crypto use GP or CRYPTO."),
      { status: 400 },
    );
  const d = await cached(`bq:${y}`, 15e3, async () =>
    parseQuote(await quoteSummary(y, ["price", "summaryDetail"])),
  );
  if (!d)
    throw Object.assign(new Error(`Yahoo Finance has no quote for ${y}`), { status: 404 });
  return {
    symbol: sym.id,
    ...d,
    source: "Yahoo Finance quote, including pre-market (4:00 to 9:30 ET) and after hours (16:00 to 20:00 ET)",
  };
}
