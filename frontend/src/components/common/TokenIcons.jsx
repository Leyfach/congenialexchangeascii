// src/components/TokenIcon.jsx
export default function TokenIcon({ symbol, className = "w-4 h-4 text-green-300" }) {
    switch ((symbol || "").toUpperCase()) {
      case "BTC":
        return (
          <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 8h5a2 2 0 0 1 0 4H9h5a2 2 0 0 1 0 4H9" />
            <path d="M11 6v2M13 6v2M11 16v2M13 16v2" />
          </svg>
        )
      case "ETH":
        return (
          <svg viewBox="0 0 24 24" className={className} fill="currentColor">
            <polygon points="12,3 6.5,12 12,9.5 17.5,12" />
            <polygon points="12,20.5 6.5,13 12,15.8 17.5,13" />
          </svg>
        )
      case "SOL":
        return (
          <svg viewBox="0 0 24 24" className={className} fill="currentColor">
            <rect x="6" y="5" width="12" height="2" transform="skewX(-15)" />
            <rect x="6" y="11" width="12" height="2" transform="skewX(-15)" />
            <rect x="6" y="17" width="12" height="2" transform="skewX(-15)" />
          </svg>
        )
      case "ADA":
        return (
          <svg viewBox="0 0 24 24" className={className} fill="currentColor">
            <circle cx="12" cy="12" r="1.6" />
            {[...Array(6)].map((_, i) => {
              const a = (i * Math.PI) / 3
              return <circle key={i} cx={12 + 6*Math.cos(a)} cy={12 + 6*Math.sin(a)} r="1.1" />
            })}
            {[...Array(6)].map((_, i) => {
              const a = (i * Math.PI) / 3 + Math.PI/6
              return <circle key={`o${i}`} cx={12 + 9.5*Math.cos(a)} cy={12 + 9.5*Math.sin(a)} r="0.9" />
            })}
          </svg>
        )
      case "DOT":
        return (
          <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="10" r="5" />
            <circle cx="12" cy="19" r="1.8" fill="currentColor" stroke="none" />
          </svg>
        )
      case "LINK":
        return (
          <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
            <polygon points="12,3 5,7 5,17 12,21 19,17 19,7" />
          </svg>
        )
      case "AVAX":
        return (
          <svg viewBox="0 0 24 24" className={className} fill="currentColor">
            <path d="M12 3l7.5 13H4.5L12 3z" />
            <path d="M14.8 17L12 21l-2.8-4h5.6z" />
          </svg>
        )
      case "MATIC":
        return (
          <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M7 9l5-3 5 3v6l-5 3-5-3V9z" />
            <path d="M12 6v12" />
          </svg>
        )
      case "USD":
        return (
          <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 10c0-1.1 1.1-2 3-2s3 .9 3 2-1.1 1.8-3 2-3 .9-3 2 1.1 2 3 2 3-.9 3-2" />
            <path d="M12 6v12" />
          </svg>
        )
      default:
        return (
          <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12h8M12 8v8" />
          </svg>
        )
    }
  }
  