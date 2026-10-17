// /api/fn/btst?symbol=SPY%20US%20EQUITY&strategy=1&tf=D : run a backtest and the quant checks on this computer.
// strategy is a preset number (1 to 5, the same list as the BTST screen) or a JSON strategy in the format at the top of
// public/lib/backtest.js, so Claude can turn a plain-English rule into a test.
// Every run saves the bars it tested on to data/btst-snapshots/ (dated, with a SHA-256 of the bars), because Yahoo
// restates history. &replay=<snapshot id> runs a rule on those exact bars again, so last month's result can be checked.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DATA_DIR } from "../store.js";
import { getCandles } from "../providers.js";
import { toSecurity } from "../../public/js/securities.js";
import { backtest, EXAMPLE_STRATEGIES } from "../../public/lib/backtest.js";
import { quantChecks } from "../../public/lib/quant.js";

const TFS = { D: ["1D", 2000], H: ["1h", 3000], W: ["1W", 600] };
const PRESETS = Object.keys(EXAMPLE_STRATEGIES);
const bad = (m) => Object.assign(new Error(m), { status: 400 });

export function readStrategy(raw) {
  const s = String(raw ?? "1").trim();
  if (/^\d$/.test(s)) {
    const name = PRESETS[+s - 1];
    if (!name)
      throw bad(
        `Preset strategies are 1 to ${PRESETS.length}: ${PRESETS.map((n, i) => `${i + 1} ${n}`).join(", ")}.`,
      );
    return { name, ...EXAMPLE_STRATEGIES[name] };
  }
  let j;
  try {
    j = JSON.parse(s);
  } catch {
    throw bad(
      "strategy must be a preset number or a JSON strategy (see the format at the top of public/lib/backtest.js).",
    );
  }
  if (
    !j ||
    typeof j !== "object" ||
    !(j.entryLong?.length || j.entryShort?.length)
  )
    throw bad(
      "A strategy needs at least one entry rule (entryLong or entryShort).",
    );
  return j;
}

// The terminal's own tickers ("SPY US EQUITY", "BTC") or a source symbol ("SPY", "BTCUSDT", "^GSPC").
export function symbolFor(raw) {
  const words = String(raw || "")
    .toUpperCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length)
    throw bad(
      "Send ?symbol=SPY US EQUITY (or any ticker the terminal understands).",
    );
  return toSecurity(words)?.id || words[0];
}

const SNAP_DIR = path.join(DATA_DIR, "btst-snapshots");
export const barsHash = (bars) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify(bars.map((b) => [b.time, b.open, b.high, b.low, b.close, b.volume ?? null])))
    .digest("hex");

export function saveSnapshot(res, tf, bars) {
  const sha = barsHash(bars);
  const id = `${new Date().toISOString().slice(0, 10)}-${String(res.symbol).replace(/[^\w.-]+/g, "_")}-${tf}-${sha.slice(0, 12)}`;
  const file = path.join(SNAP_DIR, `${id}.json`);
  fs.mkdirSync(SNAP_DIR, { recursive: true });
  if (!fs.existsSync(file))
    fs.writeFileSync(file, JSON.stringify({ id, savedAt: new Date().toISOString(), symbol: res.symbol, timeframe: tf, provider: res.provider, barsSha256: sha, bars }));
  return { id, barsSha256: sha, file: path.relative(DATA_DIR, file) };
}

export function loadSnapshot(id) {
  if (!/^[\w.-]+$/.test(String(id))) throw bad("replay needs a snapshot id from an earlier BTST result.");
  let j;
  try {
    j = JSON.parse(fs.readFileSync(path.join(SNAP_DIR, `${id}.json`), "utf8"));
  } catch {
    throw Object.assign(new Error(`No snapshot called ${id} in data/btst-snapshots.`), { status: 404 });
  }
  if (barsHash(j.bars) !== j.barsSha256)
    throw Object.assign(new Error(`Snapshot ${id} has been changed since it was saved (its hash no longer matches).`), { status: 422 });
  return j;
}

export default async function (q) {
  const strat = { feePct: 0.1, slippagePct: 0.05, ...readStrategy(q.strategy) };
  let res, tf, bars;
  if (q.replay) {
    const snap = loadSnapshot(q.replay);
    res = { symbol: snap.symbol, provider: `${snap.provider} (snapshot ${snap.id})`, candles: snap.bars };
    tf = snap.timeframe;
  } else {
    const symbol = symbolFor(q.symbol || q.security);
    const tfKey = TFS[String(q.tf || "D").toUpperCase()]
      ? String(q.tf || "D").toUpperCase()
      : "D";
    const [t, n] = TFS[tfKey];
    tf = t;
    res = await getCandles(symbol, tf, n);
  }
  bars = res.candles;
  if (bars.length < 300)
    throw Object.assign(
      new Error(
        `Only ${bars.length} bars of history for ${symbol} on ${tf}. The checks need at least 300.`,
      ),
      { status: 422 },
    );
  const snapshot = q.replay ? { id: q.replay, barsSha256: barsHash(bars), replayed: true } : saveSnapshot(res, tf, bars);
  const r = backtest(bars, strat);
  const q2 = quantChecks(bars, strat, { mcRuns: 1000 });
  const s = r.stats;
  return {
    symbol: res.symbol,
    timeframe: tf,
    bars: bars.length,
    from: new Date(bars[0].time * 1000).toISOString().slice(0, 10),
    to: new Date(bars.at(-1).time * 1000).toISOString().slice(0, 10),
    strategy: strat.name || "custom",
    results: {
      netResultPct: s.netProfitPct,
      buyAndHoldPct: s.buyHoldPct,
      maxDrawdownPct: s.maxDrawdownPct,
      trades: s.totalTrades,
      winningTradesPct: s.winRatePct,
      profitFactor: s.profitFactor,
      sharpe: s.sharpe,
      timeInMarketPct: s.exposurePct,
      costs: s.feesAndSlippage,
    },
    quantChecks: {
      passed: q2.passed,
      of: q2.gates.length,
      checks: q2.gates.map((g) => ({
        check: g.label,
        pass: g.pass,
        found: g.value,
      })),
    },
    snapshot,
    note: "A backtest shows what rules did on past prices. The checks ask whether that would survive new data, nearby settings, double costs and a reshuffle of the same trades. Passing doesn't make a strategy profitable.",
    source: `${res.provider} bars; backtest and checks run on this computer. The bars are saved as snapshot ${snapshot.id}: send replay=${snapshot.id} to rerun on exactly these bars.`,
  };
}
