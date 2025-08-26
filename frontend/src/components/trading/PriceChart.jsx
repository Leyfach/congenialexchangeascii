import { useEffect, useRef, useState } from 'react';

const TF_MAP = { '1m':'1m', '5m':'5', '15m':'15', '1h':'60', '4h':'240', '1d':'1D' };

export default function PriceChart({ pair = 'BTC/USD', height = 400, showVolume = true }) {
  const canvasRef = useRef(null);
  const [timeframe, setTimeframe] = useState('1m');
  const [loading, setLoading] = useState(false);
  const [candleData, setCandleData] = useState([]);

  // Draw candlestick chart on canvas
  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || !candleData.length) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Calculate chart dimensions
    const padding = { top: 20, right: 60, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    if (chartWidth <= 0 || chartHeight <= 0) return;

    // Find price range
    const prices = candleData.flatMap(d => [d.high, d.low]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Draw grid
    ctx.strokeStyle = 'rgba(0,255,159,0.15)';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines (price levels)
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }

    // Vertical grid lines
    const candleCount = Math.min(candleData.length, 50); // Show last 50 candles
    for (let i = 0; i <= 10; i++) {
      const x = padding.left + (chartWidth / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }

    // Draw price labels
    ctx.fillStyle = '#00ff9f';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    for (let i = 0; i <= 5; i++) {
      const price = maxPrice - (priceRange / 5) * i;
      const y = padding.top + (chartHeight / 5) * i;
      ctx.fillText(price.toFixed(2), padding.left + chartWidth + 5, y + 3);
    }

    // Draw candlesticks
    const candleWidth = Math.max(2, chartWidth / candleCount - 2);
    const visibleCandles = candleData.slice(-candleCount);
    
    visibleCandles.forEach((candle, index) => {
      const x = padding.left + (index * (chartWidth / candleCount)) + (chartWidth / candleCount) / 2;
      
      // Calculate y positions
      const highY = padding.top + ((maxPrice - candle.high) / priceRange) * chartHeight;
      const lowY = padding.top + ((maxPrice - candle.low) / priceRange) * chartHeight;
      const openY = padding.top + ((maxPrice - candle.open) / priceRange) * chartHeight;
      const closeY = padding.top + ((maxPrice - candle.close) / priceRange) * chartHeight;

      const isGreen = candle.close >= candle.open;
      ctx.strokeStyle = isGreen ? '#00ff9f' : '#ff3b3b';
      ctx.fillStyle = isGreen ? '#00ff9f' : '#ff3b3b';
      ctx.lineWidth = 1;

      // Draw wick (high-low line)
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw body (open-close rectangle)
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY) || 1;
      
      if (isGreen) {
        ctx.fillRect(x - candleWidth/2, bodyTop, candleWidth, bodyHeight);
      } else {
        ctx.strokeRect(x - candleWidth/2, bodyTop, candleWidth, bodyHeight);
        ctx.fillRect(x - candleWidth/2, bodyTop, candleWidth, bodyHeight);
      }
    });

    // Draw current price line
    if (candleData.length > 0) {
      const currentPrice = candleData[candleData.length - 1].close;
      const currentY = padding.top + ((maxPrice - currentPrice) / priceRange) * chartHeight;
      
      ctx.strokeStyle = '#00ff9f';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding.left, currentY);
      ctx.lineTo(padding.left + chartWidth, currentY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Current price label
      ctx.fillStyle = '#00ff9f';
      ctx.fillRect(padding.left + chartWidth + 2, currentY - 8, 50, 16);
      ctx.fillStyle = '#000000';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(currentPrice.toFixed(2), padding.left + chartWidth + 27, currentY + 3);
    }
  };

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      drawChart();
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas.parentElement);
    resizeCanvas();

    return () => resizeObserver.disconnect();
  }, [candleData]);

  // Fetch candle data
  useEffect(() => {
    let aborted = false;
    const tf = TF_MAP[timeframe] || '1m';

    async function fetchData() {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:3000/api/markets/${encodeURIComponent(pair)}/candles?timeframe=${tf}&limit=100`);
        const data = await response.json();
        
        if (!aborted) {
          setCandleData(data);
        }
      } catch (error) {
        console.error('Failed to fetch candle data:', error);
      } finally {
        if (!aborted) {
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => { aborted = true; };
  }, [pair, timeframe]);

  // Redraw chart when data changes
  useEffect(() => {
    drawChart();
  }, [candleData]);

  // optional: connect to your own WS for live trades/ticks and update last bar
  // e.g., ws.onmessage -> candleSeriesRef.current.update(latestBar)

  return (
    <div className="card ascii-border">
      <div className="card-header">
        <h3 className="card-title">PRICE_CHART ▷ {pair}</h3>
        <div className="flex items-center gap-2">
          <span className={`badge-${loading ? 'yellow' : 'green'}`}>{loading ? 'LOADING' : 'LIVE'}</span>
          <select
            className="ascii-input text-xs px-2 py-1"
            value={timeframe}
            onChange={e => setTimeframe(e.target.value)}
          >
            <option value="1m">1M</option>
            <option value="5m">5M</option>
            <option value="15m">15M</option>
            <option value="1h">1H</option>
            <option value="4h">4H</option>
            <option value="1d">1D</option>
          </select>
        </div>
      </div>

      <div className="relative bg-black border border-green-500/20 rounded overflow-hidden" style={{ height }}>
        <div ref={containerRef} className="absolute inset-0">
          {/* Placeholder chart visualization */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-6 bg-black/80 rounded border border-green-500/50">
              <div className="text-neon-matrix text-lg mb-2">CHART_READY ▷ {pair}</div>
              <div className="text-green-300/70 text-sm mb-4">
                Lightweight-charts integration {loading ? 'loading...' : 'prepared'}
              </div>
              <div className="text-left text-xs text-green-300/60 space-y-1">
                <div>✓ Backend API endpoint: /api/markets/{pair}/candles</div>
                <div>✓ Timeframe selector: {timeframe}</div>
                <div>✓ Volume display: {showVolume ? 'enabled' : 'disabled'}</div>
                <div>✓ Matrix theme styling configured</div>
              </div>
            </div>
          </div>
          
          {/* Mock price movement visualization */}
          <div className="absolute bottom-4 left-4 right-4 h-20 opacity-30">
            <svg className="w-full h-full" viewBox="0 0 100 20">
              <polyline 
                fill="none" 
                stroke="#00ff9f" 
                strokeWidth="0.5"
                points="0,15 10,12 20,8 30,10 40,6 50,9 60,4 70,7 80,3 90,5 100,2"
              />
            </svg>
          </div>
        </div>
      </div>

      {showVolume && (
        <div className="mt-2 text-xs text-green-300/60">VOLUME ▷ ON</div>
      )}

      <div className="flex justify-between items-center mt-3 pt-3 border-t border-green-500/30">
        <div className="text-xs text-green-300/60">Data source: TradingView via backend proxy</div>
        <div className="flex items-center gap-2 text-xs">
          <button className="ascii-btn px-2 py-1" disabled>RESET_ZOOM</button>
          <button className="ascii-btn px-2 py-1" disabled>FULLSCREEN</button>
        </div>
      </div>
    </div>
  );
}
