import React, { useEffect, useRef, useState } from 'react';
import './PriceChart.css';

const PriceChart = ({ pair }) => {
  const canvasRef = useRef(null);
  const [chartData, setChartData] = useState([]);
  const [timeframe, setTimeframe] = useState('1m');
  const [currentPrice, setCurrentPrice] = useState(0);

  useEffect(() => {
    generateMockData();
    const interval = setInterval(updateLastCandle, 2000);
    return () => clearInterval(interval);
  }, [pair, timeframe]);

  useEffect(() => {
    drawChart();
  }, [chartData]);

  const generateMockData = () => {
    const basePrice = pair === 'BTC/USD' ? 45000 : pair === 'ETH/USD' ? 3200 : 450;
    const candles = [];
    let price = basePrice;

    // Generate 100 candles
    for (let i = 0; i < 100; i++) {
      const open = price;
      const volatility = basePrice * 0.02; // 2% volatility
      const change = (Math.random() - 0.5) * volatility;
      const close = open + change;
      
      const high = Math.max(open, close) + Math.random() * (volatility * 0.3);
      const low = Math.min(open, close) - Math.random() * (volatility * 0.3);
      
      const volume = Math.random() * 1000 + 100;
      
      candles.push({
        timestamp: Date.now() - (100 - i) * 60000, // 1 minute intervals
        open,
        high,
        low,
        close,
        volume
      });
      
      price = close;
    }
    
    setChartData(candles);
    setCurrentPrice(candles[candles.length - 1].close);
  };

  const updateLastCandle = () => {
    setChartData(prevData => {
      if (prevData.length === 0) return prevData;
      
      const newData = [...prevData];
      const lastCandle = newData[newData.length - 1];
      const volatility = lastCandle.close * 0.005; // 0.5% volatility
      const change = (Math.random() - 0.5) * volatility;
      
      // Update the last candle
      lastCandle.close = lastCandle.close + change;
      lastCandle.high = Math.max(lastCandle.high, lastCandle.close);
      lastCandle.low = Math.min(lastCandle.low, lastCandle.close);
      
      setCurrentPrice(lastCandle.close);
      return newData;
    });
  };

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || chartData.length === 0) return;

    const ctx = canvas.getContext('2d');
    
    // Enable high DPI rendering
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    
    // Clear canvas with dark background
    ctx.fillStyle = '#0f0f10';
    ctx.fillRect(0, 0, width, height);

    // Calculate price range
    const prices = chartData.flatMap(d => [d.high, d.low]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;
    
    // Chart dimensions
    const padding = { left: 60, right: 80, top: 20, bottom: 30 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Draw modern grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines
    for (let i = 0; i <= 8; i++) {
      const y = padding.top + (chartHeight * i) / 8;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      // Price labels
      const price = maxPrice - (priceRange * i) / 8;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('$' + price.toFixed(2), padding.left - 10, y + 4);
    }
    
    // Vertical grid lines
    for (let i = 0; i <= 12; i++) {
      const x = padding.left + (chartWidth * i) / 12;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
    }

    // Draw professional candlesticks
    const candleWidth = Math.max(1, chartWidth / chartData.length * 0.8);
    const candleSpacing = chartWidth / chartData.length;
    
    chartData.forEach((candle, index) => {
      const x = padding.left + index * candleSpacing;
      const centerX = x + candleSpacing / 2;
      
      // Convert prices to canvas coordinates
      const openY = padding.top + ((maxPrice - candle.open) / priceRange) * chartHeight;
      const closeY = padding.top + ((maxPrice - candle.close) / priceRange) * chartHeight;
      const highY = padding.top + ((maxPrice - candle.high) / priceRange) * chartHeight;
      const lowY = padding.top + ((maxPrice - candle.low) / priceRange) * chartHeight;
      
      // Determine candle color
      const isGreen = candle.close > candle.open;
      const color = isGreen ? '#22c55e' : '#ef4444';
      
      // Draw wick with proper styling
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(0.5, candleWidth * 0.1);
      ctx.beginPath();
      ctx.moveTo(centerX, highY);
      ctx.lineTo(centerX, lowY);
      ctx.stroke();
      
      // Draw body with gradient
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1, Math.abs(closeY - openY));
      const bodyX = centerX - candleWidth / 2;
      
      if (bodyHeight < 2) {
        // Doji candle
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bodyX, openY);
        ctx.lineTo(bodyX + candleWidth, openY);
        ctx.stroke();
      } else {
        // Create gradient
        const gradient = ctx.createLinearGradient(0, bodyTop, 0, bodyTop + bodyHeight);
        if (isGreen) {
          gradient.addColorStop(0, '#22c55e');
          gradient.addColorStop(1, '#16a34a');
        } else {
          gradient.addColorStop(0, '#ef4444');
          gradient.addColorStop(1, '#dc2626');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(bodyX, bodyTop, candleWidth, bodyHeight);
        
        // Add subtle border
        ctx.strokeStyle = isGreen ? '#16a34a' : '#dc2626';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(bodyX, bodyTop, candleWidth, bodyHeight);
      }
    });

    // Draw current price line with glow effect
    if (currentPrice > 0) {
      const priceY = padding.top + ((maxPrice - currentPrice) / priceRange) * chartHeight;
      
      // Glow effect
      ctx.shadowColor = '#ff6b35';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, priceY);
      ctx.lineTo(width - padding.right, priceY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
      
      // Price label with modern styling
      const priceText = '$' + currentPrice.toFixed(2);
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'left';
      const textWidth = ctx.measureText(priceText).width;
      
      // Background
      ctx.fillStyle = '#ff6b35';
      ctx.fillRect(width - padding.right + 5, priceY - 10, textWidth + 16, 20);
      
      // Text
      ctx.fillStyle = '#000';
      ctx.fillText(priceText, width - padding.right + 13, priceY + 4);
    }
  };

  return (
    <div className="price-chart">
      <div className="chart-header">
        <h3>{pair} Chart</h3>
        <div className="timeframe-selector">
          {['1m', '5m', '15m', '1h', '4h', '1d'].map(tf => (
            <button
              key={tf}
              className={`timeframe-btn ${timeframe === tf ? 'active' : ''}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      
      <div className="chart-container">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="chart-canvas"
        />
      </div>
      
      <div className="chart-info">
        <span className="current-price">
          Current: ${currentPrice.toFixed(2)}
        </span>
      </div>
    </div>
  );
};

export default PriceChart;