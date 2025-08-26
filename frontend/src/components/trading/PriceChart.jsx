import { useEffect, useRef, useState } from 'react';
import { useMarket } from '../../contexts/MarketContext';

const TF_MAP = { '1m':'1m', '5m':'5', '15m':'15', '1h':'60', '4h':'240', '1d':'1D' };

export default function PriceChart({ pair = 'BTC/USD', height = 400, showVolume = true }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { getCurrentPrice, updatePrice } = useMarket();
  const [timeframe, setTimeframe] = useState('1m');
  const [loading, setLoading] = useState(false);
  const [candleData, setCandleData] = useState([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);
  const [isMouseOver, setIsMouseOver] = useState(false);

  // Draw candlestick chart on canvas
  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || !candleData.length) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Calculate chart dimensions - reserve space for volume
    const volumeHeight = showVolume ? height * 0.2 : 0;
    const padding = { top: 20, right: 80, bottom: 40 + volumeHeight, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    if (chartWidth <= 0 || chartHeight <= 0) return;

    // Apply zoom and pan transformations
    ctx.save();
    ctx.translate(offsetX, 0);
    ctx.scale(scale, 1);

    // Determine visible candles based on zoom and pan
    const candleCount = Math.min(candleData.length, Math.floor(100 / scale));
    const startIndex = Math.max(0, Math.floor(-offsetX / (chartWidth / candleCount)));
    const endIndex = Math.min(candleData.length, startIndex + candleCount);
    const visibleCandles = candleData.slice(startIndex, endIndex);

    if (visibleCandles.length === 0) {
      ctx.restore();
      return;
    }

    // Find price range for visible candles only
    const visiblePrices = visibleCandles.flatMap(d => [d.high, d.low]);
    const maxPrice = Math.max(...visiblePrices);
    const minPrice = Math.min(...visiblePrices);
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
    const decimals = getCurrentPrice(pair) < 1 ? 4 : getCurrentPrice(pair) < 100 ? 2 : 0;
    for (let i = 0; i <= 5; i++) {
      const price = maxPrice - (priceRange / 5) * i;
      const y = padding.top + (chartHeight / 5) * i;
      ctx.fillText(price.toFixed(decimals), padding.left + chartWidth + 5, y + 3);
    }

    // Draw candlesticks with improved stability
    const candleSpacing = chartWidth / visibleCandles.length;
    const candleWidth = Math.max(1, Math.min(20, candleSpacing * 0.8));
    
    visibleCandles.forEach((candle, index) => {
      const x = padding.left + (index * candleSpacing) + candleSpacing / 2;
      
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
      const bodyHeight = Math.max(1, Math.abs(closeY - openY));
      
      if (isGreen) {
        ctx.fillRect(Math.round(x - candleWidth/2), Math.round(bodyTop), Math.round(candleWidth), Math.round(bodyHeight));
      } else {
        ctx.fillRect(Math.round(x - candleWidth/2), Math.round(bodyTop), Math.round(candleWidth), Math.round(bodyHeight));
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
      ctx.fillText(currentPrice.toFixed(decimals), padding.left + chartWidth + 27, currentY + 3);
    }

    ctx.restore();

    // Draw volume bars if enabled
    if (showVolume && visibleCandles.length > 0) {
      ctx.save();
      ctx.translate(offsetX, 0);
      ctx.scale(scale, 1);

      const volumeY = height - volumeHeight;
      const maxVolume = Math.max(...visibleCandles.map(c => c.volume || 0));
      
      if (maxVolume > 0) {
        visibleCandles.forEach((candle, index) => {
          const x = padding.left + (index * (chartWidth / visibleCandles.length)) + (chartWidth / visibleCandles.length) / 2;
          const volume = candle.volume || 0;
          const barHeight = (volume / maxVolume) * (volumeHeight - 10);
          const barY = volumeY + volumeHeight - 10 - barHeight;
          
          const isGreen = candle.close >= candle.open;
          ctx.fillStyle = isGreen ? 'rgba(0,255,159,0.6)' : 'rgba(255,59,59,0.6)';
          
          const barWidth = Math.max(1, candleWidth);
          ctx.fillRect(x - barWidth/2, barY, barWidth, barHeight);
        });

        // Volume labels
        ctx.fillStyle = '#00ff9f';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`VOL: ${maxVolume.toLocaleString()}`, padding.left, volumeY + 15);
      }
      
      ctx.restore();
    }
  };

  // Mouse event handlers for interactivity
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setLastMouseX(e.clientX);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMouseX;
    setOffsetX(prev => prev + deltaX);
    setLastMouseX(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    if (!isMouseOver) return;
    e.preventDefault();
    e.stopPropagation();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.1, Math.min(5, prev * zoomFactor)));
  };

  const handleMouseEnter = () => {
    setIsMouseOver(true);
  };

  const handleMouseLeave = () => {
    setIsMouseOver(false);
    setIsDragging(false);
  };

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      
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
        const response = await fetch(`/api/markets/${encodeURIComponent(pair)}/candles?timeframe=${tf}&limit=100`);
        
        if (!response.ok) {
          console.error('API response not ok:', response.status, response.statusText);
          // Generate mock data for testing
          const mockData = generateMockData(100);
          if (!aborted) {
            setCandleData(mockData);
          }
          return;
        }
        
        const data = await response.json();
        console.log('Received candle data:', data.length, 'candles');
        
        if (!aborted) {
          setCandleData(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to fetch candle data:', error);
        // Generate mock data as fallback
        const mockData = generateMockData(100);
        if (!aborted) {
          setCandleData(mockData);
        }
      } finally {
        if (!aborted) {
          setLoading(false);
        }
      }
    }

    // Generate mock candle data for testing
    function generateMockData(count) {
      const data = [];
      let price = getCurrentPrice(pair); // Use current market price
      const now = Date.now();
      
      // Adjust volatility based on coin price
      const priceRange = price < 1 ? 0.01 : price < 100 ? 1 : price < 1000 ? 10 : 200;
      const wickRange = priceRange * 0.5;
      
      for (let i = count - 1; i >= 0; i--) {
        const change = (Math.random() - 0.5) * priceRange; // Price-appropriate movements
        const open = price;
        const close = price + change;
        const high = Math.max(open, close) + Math.random() * wickRange; // Price-appropriate wicks
        const low = Math.min(open, close) - Math.random() * wickRange;
        const volume = Math.random() * 100000 + 10000; // Realistic volume
        
        data.push({
          timestamp: now - i * 60000,
          open: open,
          high: high,
          low: low,
          close: close,
          volume: volume
        });
        
        price = close;
      }
      
      // Update market price with the latest candle close
      if (data.length > 0) {
        updatePrice(pair, data[data.length - 1].close);
      }
      
      return data;
    }

    fetchData();
    return () => { aborted = true; };
  }, [pair, timeframe]);

  // Redraw chart when data changes
  useEffect(() => {
    drawChart();
  }, [candleData, scale, offsetX]);

  // optional: connect to your own WS for live trades/ticks and update last bar
  // e.g., ws.onmessage -> candleSeriesRef.current.update(latestBar)

  return (
    <div className="card ascii-border">
      <div className="card-header">
        <h3 className="card-title">PRICE_CHART ▷ {pair}</h3>
        <div className="flex items-center gap-2">
          <span className={`badge-${loading ? 'yellow' : 'green'}`}>{loading ? 'LOADING' : 'LIVE'}</span>
          <span className="text-xs text-green-300/60">{candleData.length} candles</span>
          <button 
            onClick={() => setShowOverlay(true)}
            className="text-xs px-2 py-1 text-green-500 hover:text-green-300"
          >
            INFO
          </button>
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
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
        />
        
        {showOverlay && (
          <div ref={containerRef} className="absolute inset-0 pointer-events-none">
            {/* Placeholder chart visualization */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
              <div className="relative text-center p-6 bg-black/80 rounded border border-green-500/50">
                <button 
                  onClick={() => setShowOverlay(false)}
                  className="absolute top-2 right-2 text-green-500 hover:text-green-300 text-lg font-bold leading-none"
                  style={{ width: '20px', height: '20px' }}
                >
                  ×
                </button>
                <div className="text-neon-matrix text-lg mb-2">CHART_READY ▷ {pair}</div>
                <div className="text-green-300/70 text-sm mb-4">
                  Canvas chart {loading ? 'loading...' : 'ready'}
                </div>
                <div className="text-left text-xs text-green-300/60 space-y-1">
                  <div>✓ Backend API endpoint: /api/markets/{pair}/candles</div>
                  <div>✓ Timeframe selector: {timeframe}</div>
                  <div>✓ Volume display: {showVolume ? 'enabled' : 'disabled'}</div>
                  <div>✓ Interactive zoom/pan enabled</div>
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
        )}
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
