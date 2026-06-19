from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum
import random
from typing import Dict, Iterable, Optional, Tuple


class Side(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


@dataclass(frozen=True)
class Tick:
    ts: datetime
    bid: float
    ask: float


@dataclass(frozen=True)
class Fill:
    ts: datetime
    symbol: str
    side: Side
    units: int
    price: float
    commission: float


@dataclass
class Position:
    units: int = 0
    avg_price: float = 0.0


class RandomWalkFeed:
    def __init__(
        self,
        symbol: str,
        start_price: float,
        spread_pips: float,
        pip_size: float,
        seed: int = 7,
    ) -> None:
        self.symbol = symbol
        self._mid = start_price
        self._spread = spread_pips * pip_size
        self._pip = pip_size
        self._rng = random.Random(seed)
        self._ts = datetime.now(timezone.utc).replace(microsecond=0)

    def ticks(self, n: int, step_ms: int = 250) -> Iterable[Tick]:
        for _ in range(n):
            self._ts = self._ts + timedelta(milliseconds=step_ms)
            drift = self._rng.gauss(mu=0.0, sigma=0.25) * self._pip
            self._mid = max(0.00001, self._mid + drift)
            bid = self._mid - self._spread / 2.0
            ask = self._mid + self._spread / 2.0
            yield Tick(ts=self._ts, bid=bid, ask=ask)


class PaperBroker:
    def __init__(self, starting_cash: float, commission_per_million: float = 30.0) -> None:
        self.cash = float(starting_cash)
        self.positions: Dict[str, Position] = {}
        self.fills: list[Fill] = []
        self._last_tick: Dict[str, Tick] = {}
        self._commission_per_million = float(commission_per_million)

    def update_tick(self, symbol: str, tick: Tick) -> None:
        self._last_tick[symbol] = tick

    def _commission(self, notional: float) -> float:
        return (notional / 1_000_000.0) * self._commission_per_million

    def market_order(self, symbol: str, side: Side, units: int) -> Fill:
        if units <= 0:
            raise ValueError("units must be > 0")
        tick = self._last_tick.get(symbol)
        if tick is None:
            raise RuntimeError(f"No market data for {symbol}. Call update_tick() first.")

        price = tick.ask if side == Side.BUY else tick.bid
        notional = price * units
        commission = self._commission(notional)

        pos = self.positions.setdefault(symbol, Position())
        signed_units = units if side == Side.BUY else -units

        if pos.units == 0:
            pos.units = signed_units
            pos.avg_price = price
        else:
            new_units = pos.units + signed_units
            if (pos.units > 0 and new_units > 0) or (pos.units < 0 and new_units < 0):
                total_notional = abs(pos.units) * pos.avg_price + abs(signed_units) * price
                pos.units = new_units
                pos.avg_price = total_notional / abs(pos.units)
            else:
                pos.units = new_units
                if pos.units == 0:
                    pos.avg_price = 0.0

        if side == Side.BUY:
            self.cash -= notional
        else:
            self.cash += notional
        self.cash -= commission

        fill = Fill(ts=tick.ts, symbol=symbol, side=side, units=units, price=price, commission=commission)
        self.fills.append(fill)
        return fill

    def equity(self) -> float:
        total = self.cash
        for symbol, pos in self.positions.items():
            if pos.units == 0:
                continue
            tick = self._last_tick.get(symbol)
            if tick is None:
                continue
            mkt = tick.bid if pos.units > 0 else tick.ask
            total += pos.units * mkt
        return total

    def unrealized_pnl(self, symbol: str) -> float:
        pos = self.positions.get(symbol)
        if pos is None or pos.units == 0:
            return 0.0
        tick = self._last_tick.get(symbol)
        if tick is None:
            return 0.0
        mkt = tick.bid if pos.units > 0 else tick.ask
        return pos.units * (mkt - pos.avg_price)


def format_money(x: float) -> str:
    s = f"{x:,.2f}"
    return f"${s}"


def demo_trade(
    symbol: str = "EURUSD",
    starting_cash: float = 10_000.0,
    units: int = 10_000,
    start_price: float = 1.0850,
    spread_pips: float = 1.2,
    pip_size: float = 0.0001,
) -> Tuple[PaperBroker, Optional[Fill], Optional[Fill]]:
    feed = RandomWalkFeed(
        symbol=symbol,
        start_price=start_price,
        spread_pips=spread_pips,
        pip_size=pip_size,
    )
    broker = PaperBroker(starting_cash=starting_cash)

    first_tick = next(iter(feed.ticks(1)))
    broker.update_tick(symbol, first_tick)

    entry = broker.market_order(symbol, Side.BUY, units)

    last_tick = first_tick
    for tick in feed.ticks(120):
        last_tick = tick
        broker.update_tick(symbol, tick)

    exit_fill = broker.market_order(symbol, Side.SELL, units)
    broker.update_tick(symbol, last_tick)

    return broker, entry, exit_fill


if __name__ == "__main__":
    broker, entry, exit_fill = demo_trade()

    if entry is not None:
        print("ENTRY")
        print(f"  time: {entry.ts.isoformat()}")
        print(f"  {entry.side} {entry.units:,} {entry.symbol} @ {entry.price:.5f}")
        print(f"  commission: {format_money(entry.commission)}")

    if exit_fill is not None:
        print("EXIT")
        print(f"  time: {exit_fill.ts.isoformat()}")
        print(f"  {exit_fill.side} {exit_fill.units:,} {exit_fill.symbol} @ {exit_fill.price:.5f}")
        print(f"  commission: {format_money(exit_fill.commission)}")

    print("RESULT")
    print(f"  cash:   {format_money(broker.cash)}")
    print(f"  equity: {format_money(broker.equity())}")
