import { TradingView } from '@mathieuc/tradingview';

const MAP = {
  'BTC/USD': 'BINANCE:BTCUSDT',
  'ETH/USD': 'BINANCE:ETHUSDT',
};

export async function fetchCandles({ pair, timeframe = '1m', limit = 500 }) {
  const symbol = MAP[pair] || pair;
  const tv = new TradingView();                 // creates a client
  const chart = new tv.Chart(symbol, {          // attaches to a symbol
    timeframe,                                   // '1m','5','15','60','240','1D'
    range: limit,                                // number of bars
  });

  const bars = [];
  await chart.onUpdate(async () => {
    const series = await chart.getSeries();      // latest downloaded series
    for (const b of series) {
      bars.push({
        time: Math.floor(b.time / 1000),         // seconds epoch for LW charts
        open: b.open,
        high: b.high,
        low:  b.low,
        close:b.close,
        volume: b.volume ?? 0,
      });
    }
    chart.delete();
  });

  await chart.init();                            // triggers download
  return bars.slice(-limit);
}
