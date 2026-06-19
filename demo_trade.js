const Side = Object.freeze({ BUY: "BUY", SELL: "SELL" });
const fs = require("fs");
const path = require("path");

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

class RandomWalkFeed {
  constructor({ symbol, startPrice, spreadPips, pipSize, seed = 7 }) {
    this.symbol = symbol;
    this.mid = startPrice;
    this.spread = spreadPips * pipSize;
    this.pip = pipSize;
    this.rng = mulberry32(seed);
    this.ts = Date.now();
  }

  tick(stepMs = 250) {
    this.ts += stepMs;
    const drift = gaussian(this.rng) * 0.25 * this.pip;
    this.mid = Math.max(0.00001, this.mid + drift);
    const bid = this.mid - this.spread / 2.0;
    const ask = this.mid + this.spread / 2.0;
    return { ts: new Date(this.ts), bid, ask };
  }
}

class PaperBroker {
  constructor({ startingCash, commissionPerMillion = 30.0 }) {
    this.cash = startingCash;
    this.positions = new Map();
    this.lastTick = new Map();
    this.fills = [];
    this.commissionPerMillion = commissionPerMillion;
  }

  updateTick(symbol, tick) {
    this.lastTick.set(symbol, tick);
  }

  commission(notional) {
    return (notional / 1_000_000.0) * this.commissionPerMillion;
  }

  fillAtPrice({ ts, symbol, side, units, price }) {
    if (!(units > 0)) throw new Error("units must be > 0");
    if (!Number.isFinite(price)) throw new Error("price must be a finite number");

    const notional = price * units;
    const commission = this.commission(notional);

    const pos = this.positions.get(symbol) ?? { units: 0, avgPrice: 0.0 };
    const signedUnits = side === Side.BUY ? units : -units;

    if (pos.units === 0) {
      pos.units = signedUnits;
      pos.avgPrice = price;
    } else {
      const newUnits = pos.units + signedUnits;
      if ((pos.units > 0 && newUnits > 0) || (pos.units < 0 && newUnits < 0)) {
        const totalNotional = Math.abs(pos.units) * pos.avgPrice + Math.abs(signedUnits) * price;
        pos.units = newUnits;
        pos.avgPrice = totalNotional / Math.abs(pos.units);
      } else {
        pos.units = newUnits;
        if (pos.units === 0) pos.avgPrice = 0.0;
      }
    }
    this.positions.set(symbol, pos);

    if (side === Side.BUY) this.cash -= notional;
    else this.cash += notional;
    this.cash -= commission;

    const fill = { ts: ts ?? new Date(), symbol, side, units, price, commission };
    this.fills.push(fill);
    return fill;
  }

  marketOrder(symbol, side, units) {
    const tick = this.lastTick.get(symbol);
    if (!tick) throw new Error(`No market data for ${symbol}. Call updateTick() first.`);

    const price = side === Side.BUY ? tick.ask : tick.bid;
    return this.fillAtPrice({ ts: tick.ts, symbol, side, units, price });
  }

  equity() {
    let total = this.cash;
    for (const [symbol, pos] of this.positions.entries()) {
      if (pos.units === 0) continue;
      const tick = this.lastTick.get(symbol);
      if (!tick) continue;
      const mkt = pos.units > 0 ? tick.bid : tick.ask;
      total += pos.units * mkt;
    }
    return total;
  }
}

function money(x) {
  const s = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(x);
  return s;
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      args._.push(a);
      continue;
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i++;
  }
  return args;
}

function parseDateTime(s) {
  const trimmed = String(s).trim().replace(/^"|"$/g, "");
  if (!trimmed) return null;

  if (/^\d{13}$/.test(trimmed)) return new Date(Number(trimmed));
  if (/^\d{10}$/.test(trimmed)) return new Date(Number(trimmed) * 1000);

  const iso = new Date(trimmed);
  if (!Number.isNaN(iso.getTime())) return iso;

  const m1 = trimmed.match(/^(\d{4})[.-](\d{2})[.-](\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m1) {
    const [, Y, M, D, hh = "00", mm = "00", ss = "00"] = m1;
    const dt = new Date(Date.UTC(Number(Y), Number(M) - 1, Number(D), Number(hh), Number(mm), Number(ss)));
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  return null;
}

function detectDelimiter(headerLine) {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = -1;
  for (const d of candidates) {
    const c = headerLine.split(d).length;
    if (c > bestCount) {
      bestCount = c;
      best = d;
    }
  }
  return best;
}

function toNum(x) {
  const s = String(x).trim().replace(/^"|"$/g, "");
  if (!s) return NaN;
  return Number(s.replace(/,/g, ""));
}

function loadCandlesFromCsv(csvPath) {
  const text = fs.readFileSync(csvPath, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV has no data rows.");

  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0]
    .split(delimiter)
    .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());

  const idx = (name) => headers.indexOf(name);
  const iOpen = idx("open");
  const iHigh = idx("high");
  const iLow = idx("low");
  const iClose = idx("close");

  const iTimestamp = idx("timestamp");
  const iTime = idx("time");
  const iDate = idx("date");

  if ([iOpen, iHigh, iLow, iClose].some((i) => i < 0)) {
    throw new Error('CSV must include headers: "Open,High,Low,Close" (case-insensitive).');
  }

  const candles = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter);
    let ts = null;
    if (iTimestamp >= 0) ts = parseDateTime(cols[iTimestamp]);
    else if (iTime >= 0 && iDate >= 0) ts = parseDateTime(`${cols[iDate]} ${cols[iTime]}`);
    else if (iTime >= 0) ts = parseDateTime(cols[iTime]);
    else if (iDate >= 0) ts = parseDateTime(cols[iDate]);

    if (!ts) continue;

    const open = toNum(cols[iOpen]);
    const high = toNum(cols[iHigh]);
    const low = toNum(cols[iLow]);
    const close = toNum(cols[iClose]);
    if (![open, high, low, close].every((v) => Number.isFinite(v))) continue;

    candles.push({ ts, open, high, low, close });
  }

  candles.sort((a, b) => a.ts - b.ts);
  if (candles.length < 30) throw new Error("Not enough candles after parsing (need at least 30).");
  return candles;
}

function candlesFromSynthetic({
  startPrice,
  spreadPips,
  pipSize,
  seed = 7,
  bars = 500,
  ticksPerBar = 20,
  startTs = null,
  barMinutes = 15,
}) {
  const feed = new RandomWalkFeed({ symbol: "SYNTH", startPrice, spreadPips, pipSize, seed });
  const baseTs = startTs ? new Date(startTs).getTime() : Date.now();
  const stepMs = Math.max(1, Number(barMinutes) || 15) * 60 * 1000;
  const candles = [];
  for (let b = 0; b < bars; b++) {
    let open = null;
    let high = -Infinity;
    let low = Infinity;
    let close = null;
    let ts = new Date(baseTs + b * stepMs);
    for (let t = 0; t < ticksPerBar; t++) {
      const tick = feed.tick(250);
      const mid = (tick.bid + tick.ask) / 2.0;
      if (open === null) open = mid;
      high = Math.max(high, mid);
      low = Math.min(low, mid);
      close = mid;
    }
    candles.push({ ts, open, high, low, close });
  }
  return candles;
}

function smaState(period) {
  return { period, buf: [], sum: 0.0, value: null };
}

function smaUpdate(state, x) {
  state.buf.push(x);
  state.sum += x;
  if (state.buf.length > state.period) state.sum -= state.buf.shift();
  if (state.buf.length === state.period) state.value = state.sum / state.period;
  return state.value;
}

function maxDrawdown(equityCurve) {
  let peak = -Infinity;
  let mdd = 0.0;
  for (const e of equityCurve) {
    if (e > peak) peak = e;
    const dd = peak > 0 ? (peak - e) / peak : 0;
    if (dd > mdd) mdd = dd;
  }
  return mdd;
}

function computeTradeStatsFromTrades({ trades }) {
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const breakeven = trades.filter((t) => t.pnl === 0);

  const sumWins = wins.reduce((a, t) => a + t.pnl, 0);
  const sumLosses = losses.reduce((a, t) => a + t.pnl, 0);
  const totalCommission = trades.reduce((a, t) => a + (t.commission ?? 0), 0);

  const avgWin = wins.length ? sumWins / wins.length : 0;
  const avgLoss = losses.length ? sumLosses / losses.length : 0;
  const winRate = totalTrades ? wins.length / totalTrades : 0;
  const profitFactor = sumLosses < 0 ? sumWins / Math.abs(sumLosses) : sumWins > 0 ? Infinity : 0;
  const expectancy = totalTrades ? (sumWins + sumLosses) / totalTrades : 0;

  const durations = trades.map((t) => t.durationMs).filter((x) => Number.isFinite(x));
  const avgHoldMs = durations.length ? durations.reduce((a, x) => a + x, 0) / durations.length : null;

  const pips = trades.map((t) => t.pips).filter((x) => Number.isFinite(x));
  const avgPips = pips.length ? pips.reduce((a, x) => a + x, 0) / pips.length : null;

  return {
    trades: totalTrades,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    winRate,
    avgWin,
    avgLoss,
    profitFactor,
    expectancy,
    totalCommission,
    avgHoldMs,
    avgPips,
  };
}

function computeTradeStats({ fills, pipSize }) {
  const trades = [];
  let netUnits = 0;
  let current = null;

  for (const f of fills) {
    const signedUnits = f.side === Side.BUY ? f.units : -f.units;
    const signedNotional = (f.side === Side.SELL ? 1 : -1) * f.price * f.units;
    netUnits += signedUnits;

    if (!current && netUnits !== 0) {
      current = {
        entryTs: f.ts,
        entrySide: netUnits > 0 ? "long" : "short",
        entryPrice: f.price,
        signedNotional: signedNotional,
        commission: f.commission,
      };
      continue;
    }

    if (current) {
      current.signedNotional += signedNotional;
      current.commission += f.commission;

      if (netUnits === 0) {
        const pnl = current.signedNotional - current.commission;
        const exitPrice = f.price;
        const side = current.entrySide;
        const pips =
          Number.isFinite(pipSize) && pipSize > 0
            ? (side === "long" ? (exitPrice - current.entryPrice) : (current.entryPrice - exitPrice)) / pipSize
            : null;
        const durationMs = current.entryTs && f.ts ? new Date(f.ts).getTime() - new Date(current.entryTs).getTime() : null;
        trades.push({
          side,
          entryTs: current.entryTs,
          exitTs: f.ts,
          entryPrice: current.entryPrice,
          exitPrice,
          pnl,
          commission: current.commission,
          pips,
          durationMs,
        });
        current = null;
      }
    }
  }

  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const breakeven = trades.filter((t) => t.pnl === 0);

  const sumWins = wins.reduce((a, t) => a + t.pnl, 0);
  const sumLosses = losses.reduce((a, t) => a + t.pnl, 0);
  const totalCommission = trades.reduce((a, t) => a + (t.commission ?? 0), 0);

  const avgWin = wins.length ? sumWins / wins.length : 0;
  const avgLoss = losses.length ? sumLosses / losses.length : 0;
  const winRate = totalTrades ? wins.length / totalTrades : 0;
  const profitFactor = sumLosses < 0 ? sumWins / Math.abs(sumLosses) : sumWins > 0 ? Infinity : 0;
  const expectancy = totalTrades ? (sumWins + sumLosses) / totalTrades : 0;

  const durations = trades.map((t) => t.durationMs).filter((x) => Number.isFinite(x));
  const avgHoldMs = durations.length ? durations.reduce((a, x) => a + x, 0) / durations.length : null;

  return {
    trades: totalTrades,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    winRate,
    avgWin,
    avgLoss,
    profitFactor,
    expectancy,
    totalCommission,
    avgHoldMs,
  };
}

function runBacktest({
  symbol,
  candles,
  startingCash,
  units,
  spreadPips,
  pipSize,
  fast = 10,
  slow = 30,
}) {
  const broker = new PaperBroker({ startingCash });
  const spread = spreadPips * pipSize;

  const fastSma = smaState(fast);
  const slowSma = smaState(slow);

  const equityCurve = [];
  const trades = [];
  let openTrade = null;
  const posOf = () => (broker.positions.get(symbol)?.units ?? 0);

  const priceToTick = (ts, mid) => ({ ts, bid: mid - spread / 2.0, ask: mid + spread / 2.0 });

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];

    broker.updateTick(symbol, priceToTick(c.ts, c.open));

    const f = fastSma.value;
    const s = slowSma.value;
    const desired = f !== null && s !== null && f > s ? 1 : 0;
    const current = posOf() > 0 ? 1 : 0;

    if (desired !== current) {
      if (desired === 1) {
        const fill = broker.marketOrder(symbol, Side.BUY, units);
        openTrade = {
          side: "long",
          entryIdx: i,
          exitIdx: null,
          entryTs: fill.ts,
          exitTs: null,
          entryPrice: fill.price,
          exitPrice: null,
          commission: fill.commission,
          pnl: null,
          pips: null,
          durationMs: null,
        };
      } else {
        const fill = broker.marketOrder(symbol, Side.SELL, units);
        if (openTrade) {
          const commission = (openTrade.commission ?? 0) + (fill.commission ?? 0);
          const pnl = (fill.price - openTrade.entryPrice) * units - commission;
          const pips = Number.isFinite(pipSize) && pipSize > 0 ? (fill.price - openTrade.entryPrice) / pipSize : null;
          const durationMs =
            openTrade.entryTs && fill.ts ? new Date(fill.ts).getTime() - new Date(openTrade.entryTs).getTime() : null;
          trades.push({
            ...openTrade,
            exitIdx: i,
            exitTs: fill.ts,
            exitPrice: fill.price,
            commission,
            pnl,
            pips,
            durationMs,
          });
          openTrade = null;
        }
      }
    }

    smaUpdate(fastSma, c.close);
    smaUpdate(slowSma, c.close);

    broker.updateTick(symbol, priceToTick(c.ts, c.close));
    equityCurve.push(broker.equity());
  }

  const last = candles[candles.length - 1];
  const unitsOpen = posOf();
  if (unitsOpen !== 0) {
    broker.updateTick(symbol, priceToTick(last.ts, last.close));
    const fill = broker.marketOrder(symbol, Side.SELL, Math.abs(unitsOpen));
    if (openTrade) {
      const commission = (openTrade.commission ?? 0) + (fill.commission ?? 0);
      const pnl = (fill.price - openTrade.entryPrice) * Math.abs(unitsOpen) - commission;
      const pips = Number.isFinite(pipSize) && pipSize > 0 ? (fill.price - openTrade.entryPrice) / pipSize : null;
      const durationMs =
        openTrade.entryTs && fill.ts ? new Date(fill.ts).getTime() - new Date(openTrade.entryTs).getTime() : null;
      trades.push({
        ...openTrade,
        exitIdx: candles.length - 1,
        exitTs: fill.ts,
        exitPrice: fill.price,
        commission,
        pnl,
        pips,
        durationMs,
      });
      openTrade = null;
    }
    broker.updateTick(symbol, priceToTick(last.ts, last.close));
  }

  const startEq = equityCurve.length ? equityCurve[0] : startingCash;
  const endEq = broker.equity();
  const ret = startEq > 0 ? (endEq - startEq) / startEq : 0;
  const tradeStats = computeTradeStatsFromTrades({ trades });

  return {
    broker,
    equityCurve,
    trades,
    stats: {
      startEquity: startEq,
      endEquity: endEq,
      totalReturn: ret,
      maxDrawdown: maxDrawdown(equityCurve),
      fills: broker.fills.length,
      ...tradeStats,
    },
  };
}

function runBacktestICT({
  symbol,
  candles,
  startingCash,
  units,
  spreadPips,
  pipSize,
  swingLen = 3,
  sweepBufferPips = 0,
  stopBufferPips = 2,
  rr = 2,
  direction = "both",
}) {
  const broker = new PaperBroker({ startingCash });
  const spread = spreadPips * pipSize;
  const sweepBuf = sweepBufferPips * pipSize;
  const stopBuf = stopBufferPips * pipSize;

  const equityCurve = [];
  const trades = [];

  const priceToTick = (ts, mid) => ({ ts, bid: mid - spread / 2.0, ask: mid + spread / 2.0 });
  const posUnits = () => (broker.positions.get(symbol)?.units ?? 0);

  const longEnabled = direction === "both" || direction === "long";
  const shortEnabled = direction === "both" || direction === "short";

  let lastSwingHigh = null;
  let lastSwingLow = null;

  let stateLong = { phase: "WAIT_SWEEP", sweepLow: null, mssRef: null, pendingEntry: false };
  let stateShort = { phase: "WAIT_SWEEP", sweepHigh: null, mssRef: null, pendingEntry: false };

  let trade = null;

  function confirmSwings(i) {
    const p = i - swingLen;
    if (p - swingLen < 0) return;
    const left = p - swingLen;
    const right = p + swingLen;
    if (right > i) return;

    const ph = candles[p].high;
    let isHigh = true;
    for (let k = left; k <= right; k++) {
      if (k === p) continue;
      if (candles[k].high >= ph) {
        isHigh = false;
        break;
      }
    }
    if (isHigh) lastSwingHigh = { idx: p, price: ph };

    const pl = candles[p].low;
    let isLow = true;
    for (let k = left; k <= right; k++) {
      if (k === p) continue;
      if (candles[k].low <= pl) {
        isLow = false;
        break;
      }
    }
    if (isLow) lastSwingLow = { idx: p, price: pl };
  }

  function enterLong(ts, entryMid) {
    const entryAsk = entryMid + spread / 2.0;
    broker.updateTick(symbol, priceToTick(ts, entryMid));
    const fill = broker.fillAtPrice({ ts, symbol, side: Side.BUY, units, price: entryAsk });
    return fill;
  }

  function enterShort(ts, entryMid) {
    const entryBid = entryMid - spread / 2.0;
    broker.updateTick(symbol, priceToTick(ts, entryMid));
    const fill = broker.fillAtPrice({ ts, symbol, side: Side.SELL, units, price: entryBid });
    return fill;
  }

  function exitLongAt(ts, levelMid) {
    const exitBid = levelMid - spread / 2.0;
    broker.updateTick(symbol, priceToTick(ts, levelMid));
    const fill = broker.fillAtPrice({ ts, symbol, side: Side.SELL, units: Math.abs(posUnits()), price: exitBid });
    return fill;
  }

  function exitShortAt(ts, levelMid) {
    const exitAsk = levelMid + spread / 2.0;
    broker.updateTick(symbol, priceToTick(ts, levelMid));
    const fill = broker.fillAtPrice({ ts, symbol, side: Side.BUY, units: Math.abs(posUnits()), price: exitAsk });
    return fill;
  }

  for (let i = 2; i < candles.length; i++) {
    const c = candles[i];
    confirmSwings(i);

    broker.updateTick(symbol, priceToTick(c.ts, c.open));

    if (trade && posUnits() !== 0) {
      if (trade.side === "long") {
        const hitStop = c.low <= trade.stopMid;
        const hitTp = c.high >= trade.tpMid;
        if (hitStop || hitTp) {
          const level = hitStop ? trade.stopMid : trade.tpMid;
          const fill = exitLongAt(c.ts, level);
          const commission = (trade.commission ?? 0) + (fill.commission ?? 0);
          const pnl = (fill.price - trade.entryPrice) * units - commission;
          const pips = Number.isFinite(pipSize) && pipSize > 0 ? (fill.price - trade.entryPrice) / pipSize : null;
          const durationMs =
            trade.entryTs && fill.ts ? new Date(fill.ts).getTime() - new Date(trade.entryTs).getTime() : null;
          trades.push({
            side: "long",
            entryIdx: trade.entryIdx,
            exitIdx: i,
            entryTs: trade.entryTs,
            exitTs: fill.ts,
            entryPrice: trade.entryPrice,
            exitPrice: fill.price,
            commission,
            pnl,
            pips,
            durationMs,
          });
          trade = null;
        }
      } else if (trade.side === "short") {
        const hitStop = c.high >= trade.stopMid;
        const hitTp = c.low <= trade.tpMid;
        if (hitStop || hitTp) {
          const level = hitStop ? trade.stopMid : trade.tpMid;
          const fill = exitShortAt(c.ts, level);
          const commission = (trade.commission ?? 0) + (fill.commission ?? 0);
          const pnl = (trade.entryPrice - fill.price) * units - commission;
          const pips = Number.isFinite(pipSize) && pipSize > 0 ? (trade.entryPrice - fill.price) / pipSize : null;
          const durationMs =
            trade.entryTs && fill.ts ? new Date(fill.ts).getTime() - new Date(trade.entryTs).getTime() : null;
          trades.push({
            side: "short",
            entryIdx: trade.entryIdx,
            exitIdx: i,
            entryTs: trade.entryTs,
            exitTs: fill.ts,
            entryPrice: trade.entryPrice,
            exitPrice: fill.price,
            commission,
            pnl,
            pips,
            durationMs,
          });
          trade = null;
        }
      }
    }

    if (!trade && posUnits() === 0) {
      if (longEnabled) {
        if (stateLong.pendingEntry) {
          const entryMid = c.open;
          const stopMid = Math.max(0.00001, stateLong.sweepLow - stopBuf);
          const risk = entryMid - stopMid;
          if (risk > 0) {
            const tpMid = entryMid + rr * risk;
            const fill = enterLong(c.ts, entryMid);
            trade = {
              side: "long",
              entryIdx: i,
              entryTs: fill.ts,
              entryPrice: fill.price,
              commission: fill.commission,
              entryMid,
              stopMid,
              tpMid,
            };
          }
          stateLong = { phase: "WAIT_SWEEP", sweepLow: null, mssRef: null, pendingEntry: false };
        } else if (stateLong.phase === "WAIT_SWEEP") {
          if (lastSwingLow && lastSwingHigh) {
            const swept = c.low < lastSwingLow.price - sweepBuf && c.close > lastSwingLow.price;
            if (swept) {
              stateLong = { phase: "WAIT_MSS", sweepLow: c.low, mssRef: lastSwingHigh.price, pendingEntry: false };
            }
          }
        } else if (stateLong.phase === "WAIT_MSS") {
          if (Number.isFinite(stateLong.mssRef) && c.close > stateLong.mssRef) {
            stateLong.phase = "WAIT_ENTRY";
          }
        } else if (stateLong.phase === "WAIT_ENTRY") {
          const fvg = candles[i - 2].high < c.low;
          if (fvg) {
            stateLong.pendingEntry = true;
          }
        }
      }

      if (shortEnabled) {
        if (stateShort.pendingEntry) {
          const entryMid = c.open;
          const stopMid = stateShort.sweepHigh + stopBuf;
          const risk = stopMid - entryMid;
          if (risk > 0) {
            const tpMid = entryMid - rr * risk;
            const fill = enterShort(c.ts, entryMid);
            trade = {
              side: "short",
              entryIdx: i,
              entryTs: fill.ts,
              entryPrice: fill.price,
              commission: fill.commission,
              entryMid,
              stopMid,
              tpMid,
            };
          }
          stateShort = { phase: "WAIT_SWEEP", sweepHigh: null, mssRef: null, pendingEntry: false };
        } else if (stateShort.phase === "WAIT_SWEEP") {
          if (lastSwingHigh && lastSwingLow) {
            const swept = c.high > lastSwingHigh.price + sweepBuf && c.close < lastSwingHigh.price;
            if (swept) {
              stateShort = { phase: "WAIT_MSS", sweepHigh: c.high, mssRef: lastSwingLow.price, pendingEntry: false };
            }
          }
        } else if (stateShort.phase === "WAIT_MSS") {
          if (Number.isFinite(stateShort.mssRef) && c.close < stateShort.mssRef) {
            stateShort.phase = "WAIT_ENTRY";
          }
        } else if (stateShort.phase === "WAIT_ENTRY") {
          const fvg = candles[i - 2].low > c.high;
          if (fvg) {
            stateShort.pendingEntry = true;
          }
        }
      }
    }

    broker.updateTick(symbol, priceToTick(c.ts, c.close));
    equityCurve.push(broker.equity());
  }

  const last = candles[candles.length - 1];
  const u = posUnits();
  if (u !== 0) {
    broker.updateTick(symbol, priceToTick(last.ts, last.close));
    if (u > 0) {
      const fill = broker.marketOrder(symbol, Side.SELL, Math.abs(u));
      if (trade) {
        const commission = (trade.commission ?? 0) + (fill.commission ?? 0);
        const pnl = (fill.price - trade.entryPrice) * Math.abs(u) - commission;
        const pips = Number.isFinite(pipSize) && pipSize > 0 ? (fill.price - trade.entryPrice) / pipSize : null;
        const durationMs =
          trade.entryTs && fill.ts ? new Date(fill.ts).getTime() - new Date(trade.entryTs).getTime() : null;
        trades.push({
          side: "long",
          entryIdx: trade.entryIdx,
          exitIdx: candles.length - 1,
          entryTs: trade.entryTs,
          exitTs: fill.ts,
          entryPrice: trade.entryPrice,
          exitPrice: fill.price,
          commission,
          pnl,
          pips,
          durationMs,
        });
        trade = null;
      }
    } else {
      const fill = broker.marketOrder(symbol, Side.BUY, Math.abs(u));
      if (trade) {
        const commission = (trade.commission ?? 0) + (fill.commission ?? 0);
        const pnl = (trade.entryPrice - fill.price) * Math.abs(u) - commission;
        const pips = Number.isFinite(pipSize) && pipSize > 0 ? (trade.entryPrice - fill.price) / pipSize : null;
        const durationMs =
          trade.entryTs && fill.ts ? new Date(fill.ts).getTime() - new Date(trade.entryTs).getTime() : null;
        trades.push({
          side: "short",
          entryIdx: trade.entryIdx,
          exitIdx: candles.length - 1,
          entryTs: trade.entryTs,
          exitTs: fill.ts,
          entryPrice: trade.entryPrice,
          exitPrice: fill.price,
          commission,
          pnl,
          pips,
          durationMs,
        });
        trade = null;
      }
    }
    broker.updateTick(symbol, priceToTick(last.ts, last.close));
  }

  const startEq = startingCash;
  const endEq = broker.equity();
  const ret = startEq > 0 ? (endEq - startEq) / startEq : 0;
  const tradeStats = computeTradeStatsFromTrades({ trades });

  return {
    broker,
    equityCurve,
    trades,
    stats: {
      startEquity: startEq,
      endEquity: endEq,
      totalReturn: ret,
      maxDrawdown: maxDrawdown(equityCurve),
      fills: broker.fills.length,
      ...tradeStats,
    },
  };
}

function demoTrade() {
  const symbol = "EURUSD";
  const feed = new RandomWalkFeed({
    symbol,
    startPrice: 1.085,
    spreadPips: 1.2,
    pipSize: 0.0001,
    seed: 7,
  });
  const broker = new PaperBroker({ startingCash: 10_000.0 });

  const firstTick = feed.tick();
  broker.updateTick(symbol, firstTick);

  const entry = broker.marketOrder(symbol, Side.BUY, 10_000);

  let lastTick = firstTick;
  for (let i = 0; i < 120; i++) {
    lastTick = feed.tick();
    broker.updateTick(symbol, lastTick);
  }

  const exitFill = broker.marketOrder(symbol, Side.SELL, 10_000);
  broker.updateTick(symbol, lastTick);

  return { broker, entry, exitFill };
}

module.exports = {
  Side,
  RandomWalkFeed,
  PaperBroker,
  money,
  loadCandlesFromCsv,
  candlesFromSynthetic,
  runBacktest,
  runBacktestICT,
  demoTrade,
};

if (require.main === module) {
  const args = parseArgs(process.argv);
  const mode = args._[0] ?? "demo";

  if (mode === "demo") {
    const { broker, entry, exitFill } = demoTrade();

    console.log("ENTRY");
    console.log(`  time: ${entry.ts.toISOString()}`);
    console.log(`  ${entry.side} ${entry.units.toLocaleString()} ${entry.symbol} @ ${entry.price.toFixed(5)}`);
    console.log(`  commission: ${money(entry.commission)}`);

    console.log("EXIT");
    console.log(`  time: ${exitFill.ts.toISOString()}`);
    console.log(`  ${exitFill.side} ${exitFill.units.toLocaleString()} ${exitFill.symbol} @ ${exitFill.price.toFixed(5)}`);
    console.log(`  commission: ${money(exitFill.commission)}`);

    console.log("RESULT");
    console.log(`  cash:   ${money(broker.cash)}`);
    console.log(`  equity: ${money(broker.equity())}`);
    process.exit(0);
  }

  if (mode === "backtest") {
    const symbol = String(args.symbol ?? "EURUSD");
    const startingCash = Number(args.cash ?? 10_000);
    const units = Number(args.units ?? 10_000);
    const spreadPips = Number(args.spreadPips ?? 1.2);
    const pipSize = Number(args.pipSize ?? 0.0001);
    const fast = Number(args.fast ?? 10);
    const slow = Number(args.slow ?? 30);
    const strategy = String(args.strategy ?? "sma").toLowerCase();

    let candles;
    if (args.csv) {
      const csvPath = path.resolve(String(args.csv));
      candles = loadCandlesFromCsv(csvPath);
    } else {
      candles = candlesFromSynthetic({
        startPrice: Number(args.startPrice ?? 1.085),
        spreadPips,
        pipSize,
        seed: Number(args.seed ?? 7),
        bars: Number(args.bars ?? 800),
        ticksPerBar: Number(args.ticksPerBar ?? 20),
      });
    }

    const { stats } =
      strategy === "ict"
        ? runBacktestICT({
            symbol,
            candles,
            startingCash,
            units,
            spreadPips,
            pipSize,
            swingLen: Number(args.swingLen ?? 3),
            sweepBufferPips: Number(args.sweepBufferPips ?? 0),
            stopBufferPips: Number(args.stopBufferPips ?? 2),
            rr: Number(args.rr ?? 2),
            direction: String(args.direction ?? "both").toLowerCase(),
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

    console.log("BACKTEST");
    console.log(`  symbol: ${symbol}`);
    console.log(`  bars:   ${candles.length.toLocaleString()}`);
    if (strategy === "ict") console.log("  strategy: ICT (sweep + MSS + FVG)");
    else console.log(`  fast/slow SMA: ${fast}/${slow}`);
    console.log(`  spreadPips: ${spreadPips}`);
    console.log(`  start:  ${money(stats.startEquity)}`);
    console.log(`  end:    ${money(stats.endEquity)}`);
    console.log(`  return: ${(stats.totalReturn * 100).toFixed(2)}%`);
    console.log(`  maxDD:  ${(stats.maxDrawdown * 100).toFixed(2)}%`);
    console.log(`  fills:  ${stats.fills}`);
    console.log(`  trades: ${stats.trades}`);
    console.log(`  winRate: ${(stats.winRate * 100).toFixed(2)}%`);
    console.log(`  profitFactor: ${Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : String(stats.profitFactor)}`);
    console.log(`  avgWin: ${money(stats.avgWin)}`);
    console.log(`  avgLoss: ${money(stats.avgLoss)}`);
    console.log(`  expectancy: ${money(stats.expectancy)}`);
    console.log(`  commission: ${money(stats.totalCommission)}`);
    process.exit(0);
  }

  console.log('Unknown mode. Use: node demo_trade.js demo | backtest [--csv path] [--fast N --slow N]');
  process.exit(1);
}

