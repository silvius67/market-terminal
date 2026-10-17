# Market Terminal

A market terminal that runs on your own computer. Type a ticker and a function code, press Enter, and the screen loads, four panels at a time: world indices, news, company descriptions, financials, SEC filings, insider trades, holders, options chains, yield curves, money markets, the Fed rate path priced by futures, economic data and calendars, central bank rates, positioning, commodities, currencies, crypto, charts and a backtester with quant checks.

Every number comes from a public source that needs no account and no API key. It's one small Node.js app with no dependencies. Your layout is a plain file in the `data` folder, on your machine. It's built from public data.

## Install

**With an AI coding agent (easiest).** Give Claude Code the setup prompt you were sent with this project. It checks your machine, installs this, tests every data source from your connection, sets the panels for what you follow and opens it in your browser.

**By hand.** Install Node.js 18 or newer from [nodejs.org](https://nodejs.org), then in this folder:

```bash
node scripts/check.js
```

```bash
node scripts/launch.js
```

There's no `npm install` step. Next time, double-click `start.command` (Mac) or `start.bat` (Windows), or run `./start.sh` (Linux). Stop it with `node scripts/stop.js`.

## How to use it

Each panel has its own command line, and the bar at the top runs a command in the active panel. A command is a security, then a function, then Enter (that's GO):

| Type | You get |
|---|---|
| `AAPL US EQUITY DES` or `AAPL DES` | Apple's description |
| `VOD LN DES` | Vodafone in London (exchange codes LN, GR, FP, JP, HK, CN, AU and more) |
| `SPX INDEX GP` | S&P 500 chart (`INDU`, `CCMP`, `NDX`, `UKX`, `DAX`, `NKY`, `HSI` and the other WEI codes) |
| `CL1 COMDTY GP` | Front-month WTI crude (`GC1` gold, `SI1` silver, `NG1` gas, `ES1`, `NQ1`, `TY1` and more) |
| `EURUSD CURNCY GP` | Euro against the dollar |
| `BTC GP` | Bitcoin |
| `WEI`, `TOP`, `ECO`, `WIRP` | Market-wide screens, no security needed |
| `NVDA OMON` | A function first, then its subject, also works |

Esc goes back. Ctrl or Cmd plus 1 to 4 picks a panel. `LAYOUT 1`, `LAYOUT 2` or `LAYOUT 4` in the top bar changes the grid. `HELP` lists every function and `DATA` shows where each one's numbers come from and how fresh they are.

## Functions

| Code | Screen |
|---|---|
| WEI | World equity indices: level, change, YTD, 52-week range |
| GLCO | Commodities: energy, metals, agriculture |
| FXC | Currency cross rates |
| CRYPTO | Crypto monitor |
| MOST | Most active, gainers and losers |
| TOP | Top market news |
| CN | News for one company |
| DES | Company description and key data |
| BQ | Quote with pre-market and after-hours prices, bid and ask |
| FA | Income statement, balance sheet, cash flow, ratios |
| CF | SEC filings |
| INSD | Insider buys and sells |
| HDS | Institutional holders |
| ERN | Earnings calendar |
| OMON | Options chain with implied volatility, greeks, open interest and the implied move |
| GP, GIP, HP | Price chart, intraday chart, price history |
| ECO | Economic calendar |
| ECST | US economic statistics |
| GC | Yield curves |
| BTMM | US money markets |
| WIRP | Fed rate path implied by fed funds futures |
| CBRT | Central bank policy rates |
| COT | CFTC Commitments of Traders positioning |
| BTST | Backtest a strategy, then run quant checks on it |
| HELP, DATA | Every function, and where each one's data comes from |

## Add your own screen

Ask your AI agent in this folder, for example "add a function called SHRT that shows the most shorted stocks". A function is two small files:

- `lib/fn/<name>.js` fetches the data on your computer and is served at `/api/fn/<name>`. Export `default async function (query)` that returns JSON with a `source` line.
- `public/js/fn/<area>.js` draws the screen. Export a list of `{ id, name, group, source, needs, render(ctx) }` and import it in `public/js/fn/index.js`.

`public/js/ui.js` has the table, chart and tab helpers. The DATA screen lists the public sources already in use.

## Excel, Python and the API

Market data in Excel usually comes as BDP (a snapshot: one value per security and field) and BDH (history: one row per day, week or month). Market Terminal has both as web addresses on your computer while it's running. There's no key. Type `API` in the terminal for live examples with your panel's security.

```text
http://localhost:3788/api/bdh?security=AAPL%20US%20EQUITY&fields=PX_OPEN,PX_HIGH,PX_LOW,PX_LAST,PX_VOLUME&start=2025-01-01&end=2025-12-31&per=W&format=csv
http://localhost:3788/api/bdp?securities=AAPL%20US%20EQUITY,SPX%20INDEX&fields=NAME,PX_LAST,CHG_PCT_1D,CUR_MKT_CAP,PE_RATIO&format=csv
```

- `per` is D, W, M, Q or Y. `start` and `end` take `2025-01-31`, `20250131`, or `-1Y`, `-6M`, `-30D` for a time before today.
- Leave out `format=csv` for JSON. The JSON also says where the numbers came from, and why a field is empty.
- BDH fields: `PX_OPEN`, `PX_HIGH`, `PX_LOW`, `PX_LAST`, `PX_VOLUME`, `CHG_NET_1D`, `CHG_PCT_1D`.
- BDP fields: `NAME`, `TICKER`, `CRNCY`, `PX_LAST`, `PX_OPEN`, `PX_HIGH`, `PX_LOW`, `PX_VOLUME`, `PX_CLOSE_1D`, `CHG_NET_1D`, `CHG_PCT_1D`, `CHG_PCT_5D`, `CHG_PCT_1M`, `CHG_PCT_YTD`, `CHG_PCT_1YR`, `HIGH_52WEEK`, `LOW_52WEEK`, `VOLUME_AVG_30D`, `LAST_UPDATE_DT`, and for US-listed stocks `CUR_MKT_CAP`, `GICS_SECTOR_NAME`, `GICS_INDUSTRY_NAME`, `EQY_DVD_YLD_IND`, `DVD_EX_DT`, `PE_RATIO`, `TRAIL_12M_EPS`, `BEST_TARGET_PRICE`. A field it can't fill comes back empty.
- **Excel:** Data > From Web (Windows) or Data > Get Data > From Web (Mac). Paste a CSV address and press Load. Data > Refresh All updates it.
- **Python:** `pd.read_csv(url, parse_dates=["date"], index_col="date")` with a BDH address. `examples/quickstart.ipynb` is a short notebook that pulls history, a snapshot, a chart, the Fed path and the yield curve.
- **Every screen's data:** `/api/fn/<code>` returns the JSON behind each function, for example `/api/fn/wirp`, `/api/fn/gc` or `/api/fn/des?symbol=AAPL`.

The API only answers to this computer. The port is 3788 unless something else had it; `node scripts/launch.js` prints the one in use.

## Ask Claude about the markets (MCP)

Your own Claude can be the assistant. Connect Claude Code once, from inside this folder:

```bash
claude mcp add --scope local market -- node /full/path/to/market-terminal/scripts/mcp.js
```

`node scripts/mcp.js --help` prints that line with this folder's real path, and so does the `ASK` screen. Claude runs the functions itself, so Market Terminal doesn't need to be open (alerts are the exception: they're checked by the running app). Then ask things like:

- "What does the futures market price for the next Fed meeting, and what is the 2s10s spread?"
- "Compare the 10-year and 2-year yields over the last month."
- "Which S&P stocks have insiders buying this week?"
- "Backtest a 50/200-day moving average cross on SPY and tell me if it passes the quant checks."

| Tool | Does |
|---|---|
| `terminal_function` | Runs any function code (WIRP, GC, OMON, DES, FA, INSD, EQS...) and returns its data and source |
| `quote` | Price and the day's change for any securities |
| `history` | Price bars for one security, any timeframe or date range |
| `search_security` | Finds a ticker from a company name |
| `list_functions` | Every code, what it shows and where its data comes from |
| `backtest` | Tests a rule you describe in plain English, then runs the quant checks |
| `workspace` | Your watchlist and portfolio, valued live |
| `alerts` | Lists your alerts, or sets one while Market Terminal is open |

Other apps that speak MCP (Claude Desktop, Cursor) start it with the command `node` and the argument `/full/path/to/market-terminal/scripts/mcp.js`.

## Use your own data feed

Every number here is free and public, and some of it runs 15 minutes behind. Two feeds plug in with just a key, for US stock prices (GP, HP, BTST, BDH and Claude's tools):

| Provider | What it costs |
|---|---|
| Alpaca | A free account at alpaca.markets gives live prices on the IEX feed. Alpaca's paid plan adds the full market feed (`"feed": "sip"`) |
| Polygon (now called Massive) | The free plan is end-of-day only, 5 requests a minute. Paid plans are 15-minute delayed or live |

Put your keys in `data/feeds.json` (make the file with any text editor, and leave out the provider you don't use):

```json
{
  "alpaca": { "keyId": "PK...", "secretKey": "...", "feed": "iex" },
  "polygon": { "apiKey": "..." }
}
```

The file stays on your computer: the data folder isn't in git, updates leave it alone, and each key goes only to its own provider, in a request header. Your key's prices come first and the free sources stay behind them, and each screen's source line says which one it used. `node scripts/doctor.js` checks each key.

For any other feed (Interactive Brokers, Databento), ask your Claude to add it with your key, for example "add Databento as the first source for US stock prices, using my key in DATABENTO_API_KEY". Where it goes:

- `lib/providers.js`: `getCandles` and `getQuotes` try sources in a chain (stocks: your keys, then Nasdaq and Yahoo; crypto: Binance, Coinbase, Kraken). A new feed is one more function at the front of the chain, and the free sources stay behind it as fallbacks. `lib/feeds.js` shows how the Alpaca and Polygon ones are done.
- `lib/fn/<code>.js`: each function's own source (options from CBOE, filings from the SEC). A paid source for one screen goes in its file.
- Your key goes in `data/feeds.json` or an environment variable, not in the code.

The screens, BDP and BDH, and Claude's tools all read through those files, so they all pick up the new feed.

## What it doesn't do

There's no live order book. Some stock, index and futures prices run up to 15 minutes behind, depending on the exchange. Filings, insiders, holders and options are for US-listed securities. It doesn't place trades. Use your broker's prices to place orders.

## Commands

| Command | Does |
|---|---|
| `node scripts/check.js` | Offline tests, a check of every data source from your connection, and a live smoke test. Prints READY or NOT READY |
| `node scripts/setup.js --profile stocks` | Sets the four panels for stocks, crypto, fx, macro or mix (add `--ticker NVDA`) |
| `node scripts/launch.js` | Starts it in the background and opens your browser (http://localhost:3788, or the next free port) |
| `node scripts/stop.js` | Stops it |
| `node scripts/test.js` | The offline tests |

## Credits

Charts are drawn with [TradingView Lightweight Charts™](https://www.tradingview.com/) (Copyright TradingView, Inc.), used under the Apache License 2.0. The library is in `public/vendor/` with its licence header.
