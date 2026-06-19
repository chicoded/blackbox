const http = require("http");
const fs = require("fs");
const path = require("path");
const { demoTrade, runBacktest, runBacktestICT, candlesFromSynthetic } = require("./demo_trade");

function loadDotEnv(envFilePath) {
  const p = envFilePath || path.join(__dirname, ".env");
  let text = "";
  try {
    text = fs.readFileSync(p, "utf8");
  } catch {
    return;
  }

  const lines = text.split(/\r?\n/);
  for (let line of lines) {
    line = String(line).trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice("export ".length).trim();

    const eq = line.indexOf("=");
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    const isQuoted =
      (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
    if (!isQuoted) {
      const hash = value.indexOf("#");
      if (hash >= 0) value = value.slice(0, hash).trim();
    } else {
      value = value.slice(1, -1);
    }

    if (!key) continue;
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sendHtml(res, status, html) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(html);
}

function clampNumber(x, { min = -Infinity, max = Infinity, fallback } = {}) {
  const n = Number(x);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseMonthList(x) {
  if (Array.isArray(x)) {
    const out = [];
    for (const v of x) {
      const m = Number(v);
      if (Number.isFinite(m) && m >= 1 && m <= 12) out.push(Math.floor(m));
    }
    return Array.from(new Set(out));
  }
  const raw = String(x ?? "").trim();
  if (!raw) return [];
  const out = [];
  for (const part of raw.split(",")) {
    const m = Number(part.trim());
    if (Number.isFinite(m) && m >= 1 && m <= 12) out.push(Math.floor(m));
  }
  return Array.from(new Set(out));
}

function toDateOrNull(s) {
  const raw = String(s ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function filterCandles(candles, { fromDate, toDate, dayStart, dayEnd, months }) {
  const from = toDateOrNull(fromDate);
  const to = toDateOrNull(toDate);
  const dStart = Number.isFinite(Number(dayStart)) ? Math.floor(Number(dayStart)) : null;
  const dEnd = Number.isFinite(Number(dayEnd)) ? Math.floor(Number(dayEnd)) : null;
  const monthList = parseMonthList(months);

  let toInclusive = null;
  if (to) {
    toInclusive = new Date(to.getTime());
    toInclusive.setUTCHours(23, 59, 59, 999);
  }

  return candles.filter((c) => {
    const ts = new Date(c.ts);
    if (from && ts < from) return false;
    if (toInclusive && ts > toInclusive) return false;

    if (monthList.length) {
      const m = ts.getUTCMonth() + 1;
      if (!monthList.includes(m)) return false;
    }

    if (dStart !== null && dEnd !== null) {
      const d = ts.getUTCDate();
      if (d < dStart || d > dEnd) return false;
    }

    return true;
  });
}

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FX Bot Demo</title>
    <style>
      :root { color-scheme: dark; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 20px; }
      .row { display: flex; gap: 16px; flex-wrap: wrap; }
      .card { border: 1px solid #2b2b2b; border-radius: 10px; padding: 14px; background: #111; min-width: 280px; }
      label { display: block; font-size: 12px; opacity: 0.85; margin-top: 10px; }
      input, select, textarea { width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid #2b2b2b; background: #0b0b0b; color: #fff; }
      button { padding: 10px 12px; border-radius: 10px; border: 1px solid #2b2b2b; background: #1b1b1b; color: #fff; cursor: pointer; }
      button:disabled { opacity: 0.6; cursor: not-allowed; }
      pre { white-space: pre-wrap; word-break: break-word; background: #0b0b0b; border: 1px solid #2b2b2b; border-radius: 10px; padding: 12px; }
      .muted { opacity: 0.8; font-size: 12px; }
    </style>
  </head>
  <body>
    <h1>FX Bot Demo</h1>
    <p class="muted">Runs locally. Demo trade + synthetic backtest (SMA or ICT-style sweep/MSS/FVG) using bid/ask spread.</p>

    <div class="row">
      <div class="card">
        <h2>Demo Trade</h2>
        <p class="muted">One BUY then one SELL using synthetic ticks.</p>
        <button id="runDemo">Run Demo Trade</button>
      </div>

      <div class="card">
        <h2>Backtest</h2>
        <div class="row">
          <div style="flex: 1">
            <label>Symbol</label>
            <input id="symbol" value="EURUSD" />
          </div>
          <div style="flex: 1">
            <label>Bars</label>
            <input id="bars" value="800" />
          </div>
        </div>

        <div class="row">
          <div style="flex: 1">
            <label>Preset</label>
            <select id="preset">
              <option value="sma_default">SMA Default</option>
              <option value="ict_default">ICT Default</option>
              <option value="ict_conservative">ICT Conservative</option>
            </select>
          </div>
          <div style="flex: 1">
            <label>Strategy</label>
            <select id="strategy">
              <option value="sma">SMA Crossover</option>
              <option value="ict">ICT-style (Sweep + MSS + FVG)</option>
            </select>
          </div>
        </div>

        <label>Strategy Notes</label>
        <pre id="strategyHelp">Select a preset to see strategy rules and recommended parameters.</pre>

        <div class="row">
          <div style="flex: 1">
            <label>Timeframe (minutes/bar)</label>
            <select id="barMinutes">
              <option value="5">M5</option>
              <option value="15" selected>M15</option>
              <option value="60">H1</option>
              <option value="240">H4</option>
              <option value="1440">D1</option>
            </select>
          </div>
          <div style="flex: 1">
            <label>Synthetic Start Date</label>
            <input id="startDate" type="date" value="2025-01-01" />
          </div>
        </div>

        <div class="row">
          <div style="flex: 1">
            <label>Fast SMA</label>
            <input id="fast" value="10" />
          </div>
          <div style="flex: 1">
            <label>Slow SMA</label>
            <input id="slow" value="30" />
          </div>
        </div>

        <div class="row">
          <div style="flex: 1">
            <label>Swing Len (ICT)</label>
            <input id="swingLen" value="3" />
          </div>
          <div style="flex: 1">
            <label>RR (ICT)</label>
            <input id="rr" value="2" />
          </div>
          <div style="flex: 1">
            <label>Stop Buffer (pips, ICT)</label>
            <input id="stopBufferPips" value="2" />
          </div>
          <div style="flex: 1">
            <label>Sweep Buffer (pips, ICT)</label>
            <input id="sweepBufferPips" value="0" />
          </div>
        </div>

        <div class="row">
          <div style="flex: 1">
            <label>From Date (optional)</label>
            <input id="fromDate" type="date" />
          </div>
          <div style="flex: 1">
            <label>To Date (optional)</label>
            <input id="toDate" type="date" />
          </div>
        </div>

        <div class="row">
          <div style="flex: 1">
            <label>Day-of-Month Start (optional)</label>
            <input id="dayStart" placeholder="e.g. 1" />
          </div>
          <div style="flex: 1">
            <label>Day-of-Month End (optional)</label>
            <input id="dayEnd" placeholder="e.g. 7" />
          </div>
          <div style="flex: 2">
            <label>Months (optional, 1-12 comma-separated)</label>
            <input id="months" placeholder="e.g. 1,2,3 for Jan-Mar" />
          </div>
        </div>

        <div class="row">
          <div style="flex: 1">
            <label>Starting Cash (USD)</label>
            <input id="cash" value="10000" />
          </div>
          <div style="flex: 1">
            <label>Units</label>
            <input id="units" value="10000" />
          </div>
        </div>

        <div class="row">
          <div style="flex: 1">
            <label>Start Price</label>
            <input id="startPrice" value="1.085" />
          </div>
          <div style="flex: 1">
            <label>Spread (pips)</label>
            <input id="spreadPips" value="1.2" />
          </div>
          <div style="flex: 1">
            <label>Pip Size</label>
            <input id="pipSize" value="0.0001" />
          </div>
        </div>

        <button id="runBacktest">Run Backtest</button>
      </div>
    </div>

    <div class="row" style="margin-top: 16px">
      <div class="card" style="flex: 1; min-width: 320px">
        <h2>Stats</h2>
        <pre id="stats">Ready.</pre>
      </div>
      <div class="card" style="flex: 1; min-width: 320px">
        <h2>Trades</h2>
        <pre id="trades">No trades.</pre>
      </div>
    </div>

    <div class="card" style="margin-top: 16px">
      <h2>Chart</h2>
      <canvas id="chart" width="1200" height="420" style="width: 100%; height: 420px;"></canvas>
      <div class="muted" id="hint">Green markers = winning trades, red markers = losing trades.</div>
    </div>

    <h2 style="margin-top: 16px">Output</h2>
    <pre id="out">Ready.</pre>

    <script>
      const out = document.getElementById("out");
      const statsEl = document.getElementById("stats");
      const tradesEl = document.getElementById("trades");
      const strategyHelpEl = document.getElementById("strategyHelp");
      const canvas = document.getElementById("chart");
      const ctx = canvas.getContext("2d");
      let lastBacktest = null;
      const runDemo = document.getElementById("runDemo");
      const runBacktest = document.getElementById("runBacktest");
      const presetEl = document.getElementById("preset");
      const strategyEl = document.getElementById("strategy");

      function setBusy(b) {
        runDemo.disabled = b;
        runBacktest.disabled = b;
      }

      function setValue(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = String(value);
      }

      function parseMonths(s) {
        const raw = String(s || "").trim();
        if (!raw) return [];
        const parts = raw.split(",").map((x) => x.trim()).filter(Boolean);
        const months = [];
        for (const p of parts) {
          const m = Number(p);
          if (Number.isFinite(m) && m >= 1 && m <= 12) months.push(Math.floor(m));
        }
        return Array.from(new Set(months));
      }

      const PRESETS = {
        sma_default: {
          name: "SMA Default",
          strategy: "sma",
          params: { fast: 10, slow: 30, spreadPips: 1.2, pipSize: 0.0001, units: 10000, cash: 10000 },
          help: [
            "SMA Crossover (Long-only)",
            "- Entry: fast SMA > slow SMA",
            "- Exit: fast SMA <= slow SMA",
            "- Fills: buy at ask, sell at bid (spread modeled)",
          ].join("\\n"),
        },
        ict_default: {
          name: "ICT Default",
          strategy: "ict",
          params: { swingLen: 3, rr: 2, stopBufferPips: 2, sweepBufferPips: 0, spreadPips: 1.2, pipSize: 0.0001, units: 10000, cash: 10000 },
          help: [
            "ICT-style (Sweep + MSS + FVG) (rule-based)",
            "- Sweep: take swing high/low then close back inside",
            "- MSS: close breaks opposite swing level",
            "- Trigger: simple FVG condition (3-candle gap)",
            "- Entry: next bar open",
            "- Stop: sweep extreme +/- buffer",
            "- TP: RR * risk",
          ].join("\\n"),
        },
        ict_conservative: {
          name: "ICT Conservative",
          strategy: "ict",
          params: { swingLen: 5, rr: 1.5, stopBufferPips: 3, sweepBufferPips: 0.5, spreadPips: 1.2, pipSize: 0.0001, units: 10000, cash: 10000 },
          help: [
            "ICT-style (more conservative defaults)",
            "- Larger swingLen reduces signals",
            "- Adds small sweep buffer and larger stop buffer",
            "- Slightly lower RR",
          ].join("\\n"),
        },
      };

      function applyPreset(key) {
        const preset = PRESETS[key] || PRESETS.sma_default;
        strategyEl.value = preset.strategy;
        for (const [k, v] of Object.entries(preset.params)) {
          if (k === "cash") setValue("cash", v);
          else if (k === "units") setValue("units", v);
          else setValue(k, v);
        }
        strategyHelpEl.textContent = preset.help;
      }

      function show(x) {
        out.textContent = typeof x === "string" ? x : JSON.stringify(x, null, 2);
      }

      function fmtPct(x) {
        if (typeof x !== "number" || !Number.isFinite(x)) return String(x);
        return (x * 100).toFixed(2) + "%";
      }

      function fmtNum(x, d = 2) {
        if (typeof x !== "number" || !Number.isFinite(x)) return String(x);
        return x.toFixed(d);
      }

      function renderStats(data) {
        const s = data && data.stats ? data.stats : {};
        const p = data && data.params ? data.params : {};
        const f = data && data.filter ? data.filter : {};
        const lines = [
          "strategy: " + data.strategy,
          "symbol: " + data.symbol,
          "bars: " + data.bars,
          "filteredBars: " + (data.filteredBars ?? data.bars),
          "",
          "startEquity: " + fmtNum(s.startEquity, 2),
          "endEquity: " + fmtNum(s.endEquity, 2),
          "totalReturn: " + fmtPct(s.totalReturn),
          "maxDrawdown: " + fmtPct(s.maxDrawdown),
          "",
          "trades: " + s.trades,
          "wins: " + s.wins,
          "losses: " + s.losses,
          "winRate: " + fmtPct(s.winRate),
          "profitFactor: " + fmtNum(s.profitFactor, 2),
          "avgWin: " + fmtNum(s.avgWin, 2),
          "avgLoss: " + fmtNum(s.avgLoss, 2),
          "expectancy: " + fmtNum(s.expectancy, 2),
          "commission: " + fmtNum(s.totalCommission, 2),
          "",
          "params: " + JSON.stringify(p),
          "filter: " + JSON.stringify(f),
        ];
        statsEl.textContent = lines.join("\\n");
      }

      function renderTrades(data) {
        const trades = (data && data.trades) || [];
        if (!trades.length) {
          tradesEl.textContent = "No trades.";
          return;
        }
        const maxShow = 60;
        const shown = trades.slice(0, maxShow);
        const lines = shown.map((t, idx) => {
          const side = t.side;
          const pnl = typeof t.pnl === "number" ? t.pnl.toFixed(2) : String(t.pnl);
          const pips = typeof t.pips === "number" ? t.pips.toFixed(1) : String(t.pips);
          return [
            "#" + (idx + 1),
            side,
            "entryIdx=" + t.entryIdx,
            "exitIdx=" + t.exitIdx,
            "entry=" + fmtNum(t.entryPrice, 5),
            "exit=" + fmtNum(t.exitPrice, 5),
            "pnl=" + pnl,
            "pips=" + pips,
          ].join("  ");
        });
        if (trades.length > maxShow) lines.push("... (" + (trades.length - maxShow) + " more)");
        tradesEl.textContent = lines.join("\\n");
      }

      function resizeCanvasToCss() {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const w = Math.max(300, Math.floor(rect.width * dpr));
        const h = Math.max(200, Math.floor(rect.height * dpr));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
      }

      function drawChart(data) {
        resizeCanvasToCss();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const candles = (data && data.candles) || [];
        if (!candles.length) return;
        const trades = (data && data.trades) || [];

        let minP = Infinity;
        let maxP = -Infinity;
        for (const c of candles) {
          if (typeof c.low === "number") minP = Math.min(minP, c.low);
          if (typeof c.high === "number") maxP = Math.max(maxP, c.high);
        }
        if (!Number.isFinite(minP) || !Number.isFinite(maxP) || maxP <= minP) return;

        const pad = Math.floor(canvas.width * 0.03);
        const topPad = Math.floor(canvas.height * 0.08);
        const bottomPad = Math.floor(canvas.height * 0.12);

        const span = maxP - minP;
        const extra = span * 0.05;
        minP -= extra;
        maxP += extra;

        const plotW = canvas.width - 2 * pad;
        const plotH = canvas.height - topPad - bottomPad;
        const n = candles.length;
        const step = plotW / n;
        const bodyW = Math.max(1, Math.floor(step * 0.55));

        const yOf = (p) => topPad + ((maxP - p) / (maxP - minP)) * plotH;
        const xOf = (i) => pad + i * step + step / 2;

        ctx.fillStyle = "#0b0b0b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = "#1f1f1f";
        ctx.lineWidth = 1;
        for (let g = 1; g <= 4; g++) {
          const y = topPad + (plotH * g) / 5;
          ctx.beginPath();
          ctx.moveTo(pad, y);
          ctx.lineTo(canvas.width - pad, y);
          ctx.stroke();
        }

        for (let i = 0; i < n; i++) {
          const c = candles[i];
          const x = xOf(i);
          const yo = yOf(c.open);
          const yc = yOf(c.close);
          const yh = yOf(c.high);
          const yl = yOf(c.low);

          const up = c.close >= c.open;
          ctx.strokeStyle = up ? "#2bd98a" : "#ff4d4d";
          ctx.fillStyle = up ? "#2bd98a" : "#ff4d4d";

          ctx.beginPath();
          ctx.moveTo(x, yh);
          ctx.lineTo(x, yl);
          ctx.stroke();

          const yTop = Math.min(yo, yc);
          const yBot = Math.max(yo, yc);
          const h = Math.max(1, yBot - yTop);
          ctx.fillRect(Math.floor(x - bodyW / 2), Math.floor(yTop), bodyW, Math.floor(h));
        }

        for (const t of trades) {
          const win = typeof t.pnl === "number" ? t.pnl > 0 : false;
          const color = win ? "#2bd98a" : "#ff4d4d";

          const ex = xOf(Math.max(0, Math.min(n - 1, t.entryIdx)));
          const ey = yOf(t.entryPrice);
          const xx = xOf(Math.max(0, Math.min(n - 1, t.exitIdx)));
          const xy = yOf(t.exitPrice);

          ctx.strokeStyle = color;
          ctx.fillStyle = color;
          ctx.lineWidth = 2;

          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(xx, xy);
          ctx.stroke();

          const r = Math.max(4, Math.floor(step * 0.25));
          ctx.beginPath();
          ctx.arc(ex, ey, r, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(xx, xy, r, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = "#bdbdbd";
        ctx.font = String(Math.max(10, Math.floor(canvas.height * 0.03))) + "px ui-sans-serif, system-ui";
        ctx.fillText("max " + fmtNum(maxP, 5), pad, Math.max(14, topPad - 6));
        ctx.fillText("min " + fmtNum(minP, 5), pad, canvas.height - Math.max(6, bottomPad - 16));
      }

      function renderBacktest(data) {
        lastBacktest = data;
        renderStats(data);
        renderTrades(data);
        requestAnimationFrame(() => {
          drawChart(data);
          try {
            canvas.scrollIntoView({ behavior: "smooth", block: "center" });
          } catch {}
        });
      }

      async function post(url, body) {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body ?? {}),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || ("HTTP " + res.status));
        }
        return data;
      }

      function applyInterpretation(cfg) {
        if (!cfg || typeof cfg !== "object") return;
        if (cfg.strategy) strategyEl.value = cfg.strategy;

        if (cfg.params && typeof cfg.params === "object") {
          const p = cfg.params;
          for (const [k, v] of Object.entries(p)) {
            if (v === undefined || v === null || v === "") continue;
            if (k === "cash") setValue("cash", v);
            else if (k === "units") setValue("units", v);
            else if (k === "startDate") setValue("startDate", v);
            else if (k === "barMinutes") setValue("barMinutes", v);
            else setValue(k, v);
          }
        }

        if (cfg.filter && typeof cfg.filter === "object") {
          const f = cfg.filter;
          if (typeof f.fromDate === "string") setValue("fromDate", f.fromDate);
          if (typeof f.toDate === "string") setValue("toDate", f.toDate);
          if (typeof f.dayStart === "string" || typeof f.dayStart === "number") setValue("dayStart", f.dayStart);
          if (typeof f.dayEnd === "string" || typeof f.dayEnd === "number") setValue("dayEnd", f.dayEnd);
          if (Array.isArray(f.months)) setValue("months", f.months.join(","));
        }

        if (cfg.notes) {
          strategyHelpEl.textContent = String(cfg.notes);
        }
      }

      runDemo.addEventListener("click", async () => {
        setBusy(true);
        show("Running demo trade...");
        try {
          const data = await post("/api/demo");
          show(data);
        } catch (e) {
          show(String(e));
        } finally {
          setBusy(false);
        }
      });

      runBacktest.addEventListener("click", async () => {
        setBusy(true);
        show("Running backtest...");
        try {
          const body = {
            symbol: document.getElementById("symbol").value,
            bars: document.getElementById("bars").value,
            strategy: strategyEl.value,
            barMinutes: document.getElementById("barMinutes").value,
            startDate: document.getElementById("startDate").value,
            fromDate: document.getElementById("fromDate").value,
            toDate: document.getElementById("toDate").value,
            dayStart: document.getElementById("dayStart").value,
            dayEnd: document.getElementById("dayEnd").value,
            months: parseMonths(document.getElementById("months").value),
            fast: document.getElementById("fast").value,
            slow: document.getElementById("slow").value,
            swingLen: document.getElementById("swingLen").value,
            rr: document.getElementById("rr").value,
            stopBufferPips: document.getElementById("stopBufferPips").value,
            sweepBufferPips: document.getElementById("sweepBufferPips").value,
            cash: document.getElementById("cash").value,
            units: document.getElementById("units").value,
            startPrice: document.getElementById("startPrice").value,
            spreadPips: document.getElementById("spreadPips").value,
            pipSize: document.getElementById("pipSize").value,
          };
          const data = await post("/api/backtest", body);
          renderBacktest(data);
          show({ ok: true, strategy: data.strategy, symbol: data.symbol, bars: data.bars });
        } catch (e) {
          show(String(e));
        } finally {
          setBusy(false);
        }
      });

      presetEl.addEventListener("change", () => {
        applyPreset(presetEl.value);
      });
      applyPreset(presetEl.value);

      window.addEventListener("resize", () => {
        if (lastBacktest) drawChart(lastBacktest);
      });
    </script>
  </body>
</html>`;

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
      return sendHtml(res, 200, INDEX_HTML);
    }

    if (req.method === "POST" && req.url === "/api/demo") {
      const { broker, entry, exitFill } = demoTrade();
      return sendJson(res, 200, {
        entry,
        exit: exitFill,
        result: {
          cash: broker.cash,
          equity: broker.equity(),
          fills: broker.fills.length,
        },
      });
    }

    if (req.method === "POST" && req.url === "/api/backtest") {
      const body = await readJson(req);

      const symbol = String(body.symbol ?? "EURUSD");
      const strategy = String(body.strategy ?? "sma").toLowerCase();
      const bars = clampNumber(body.bars, { min: 50, max: 20000, fallback: 800 });
      const barMinutes = clampNumber(body.barMinutes, { min: 1, max: 1440, fallback: 15 });
      const startDate = String(body.startDate ?? "2025-01-01");
      const fast = clampNumber(body.fast, { min: 1, max: 5000, fallback: 10 });
      const slow = clampNumber(body.slow, { min: 2, max: 5000, fallback: 30 });
      const swingLen = clampNumber(body.swingLen, { min: 1, max: 50, fallback: 3 });
      const rr = clampNumber(body.rr, { min: 0.1, max: 50, fallback: 2 });
      const stopBufferPips = clampNumber(body.stopBufferPips, { min: 0, max: 2000, fallback: 2 });
      const sweepBufferPips = clampNumber(body.sweepBufferPips, { min: 0, max: 2000, fallback: 0 });
      const startingCash = clampNumber(body.cash, { min: 0, max: 1e12, fallback: 10_000 });
      const units = clampNumber(body.units, { min: 1, max: 1e9, fallback: 10_000 });
      const startPrice = clampNumber(body.startPrice, { min: 0.00001, max: 1e6, fallback: 1.085 });
      const spreadPips = clampNumber(body.spreadPips, { min: 0, max: 1000, fallback: 1.2 });
      const pipSize = clampNumber(body.pipSize, { min: 0.000001, max: 1, fallback: 0.0001 });

      if (strategy !== "sma" && strategy !== "ict") return sendJson(res, 400, { error: "Unknown strategy" });
      if (strategy === "sma" && fast >= slow) return sendJson(res, 400, { error: "Fast SMA must be < Slow SMA" });

      const candlesAll = candlesFromSynthetic({
        startPrice,
        spreadPips,
        pipSize,
        seed: 7,
        bars,
        ticksPerBar: 20,
        startTs: startDate,
        barMinutes,
      });

      const filter = {
        fromDate: String(body.fromDate ?? ""),
        toDate: String(body.toDate ?? ""),
        dayStart: String(body.dayStart ?? ""),
        dayEnd: String(body.dayEnd ?? ""),
        months: parseMonthList(body.months),
      };

      const candles = filterCandles(candlesAll, filter);
      if (candles.length < 30) return sendJson(res, 400, { error: "Filter removed too many candles. Widen the range." });

      const { stats, trades } =
        strategy === "ict"
          ? runBacktestICT({
              symbol,
              candles,
              startingCash,
              units,
              spreadPips,
              pipSize,
              swingLen,
              rr,
              stopBufferPips,
              sweepBufferPips,
              direction: "both",
            })
          : runBacktest({
              symbol,
              candles,
              startingCash,
              units,
              spreadPips,
              pipSize,
              fast,
              slow,
            });

      return sendJson(res, 200, {
        strategy,
        symbol,
        bars: candlesAll.length,
        filteredBars: candles.length,
        params: {
          fast,
          slow,
          swingLen,
          rr,
          stopBufferPips,
          sweepBufferPips,
          startingCash,
          units,
          startPrice,
          spreadPips,
          pipSize,
          barMinutes,
          startDate,
        },
        stats,
        trades,
        candles,
        filter,
      });
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (e) {
    sendJson(res, 500, { error: e && e.message ? e.message : "Server error" });
  }
});

const port = Number(process.env.PORT || 5177);
server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`FX Bot Demo running at http://127.0.0.1:${port}/\n`);
});

