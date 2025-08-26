export default function PriceChart() {
  return (
    <div className="card ascii-border">
      <div className="card-header">
        <h3 className="card-title">CANDLE_CHART ▷ MODULE</h3>
        <span className="badge-green">PLACEHOLDER</span>
      </div>
      <div className="text-green-300/80 text-sm">
        High-quality candlestick charts will render here. Replace with your preferred chart module later.
      </div>
      <div className="mt-4 p-4 border border-green-500/20 rounded">
        <pre className="text-xs text-green-300/70">{`loading module: chart/candles@v1.0.0
source: github.com/your/repo
status: pending…`}</pre>
      </div>
    </div>
  )
}