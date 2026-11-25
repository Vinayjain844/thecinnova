import React, { useState } from 'react';
import { Film } from 'lucide-react';
import { Movie } from '../types/cinema';

interface PosterArtworkProps {
  movie: Movie;
  className?: string;
}

export const PosterArtwork: React.FC<PosterArtworkProps> = ({ movie, className = '' }) => {
  const [imgError, setImgError] = useState(false);

  if (movie.posterImage && !imgError) {
    return (
      <img
        src={movie.posterImage}
        alt={`${movie.title} theatrical poster`}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`h-full w-full object-cover ${className}`}
        loading="lazy"
      />
    );
  }

  const theme = movie.artworkTheme || {
    bgFrom: '#1E293B',
    bgTo: '#090B10',
    accent: '#F43F5E',
    motif: 'reel',
    subtitle: 'CINNOVA FEATURE',
  };

  const renderMotif = () => {
    switch (theme.motif) {
      case 'eclipse':
        return (
          <g>
            <circle cx="150" cy="170" r="68" fill={theme.accent} opacity="0.22" />
            <circle cx="150" cy="170" r="54" fill="none" stroke={theme.accent} strokeWidth="2" opacity="0.8" />
            <circle cx="156" cy="166" r="48" fill="#090D16" />
            <path d="M50 280 Q150 235 250 280" fill="none" stroke={theme.accent} strokeWidth="1.2" opacity="0.45" />
          </g>
        );
      case 'piano':
        return (
          <g>
            <line x1="95" y1="0" x2="120" y2="320" stroke="#FFFFFF" strokeWidth="28" opacity="0.08" />
            <line x1="165" y1="0" x2="190" y2="320" stroke="#FFFFFF" strokeWidth="18" opacity="0.06" />
            <rect x="65" y="185" width="170" height="44" rx="4" fill="#09090B" stroke={theme.accent} strokeWidth="1.2" opacity="0.85" />
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <rect key={i} x={74 + i * 15} y="190" width="11" height="32" rx="1" fill="#F8FAFC" opacity="0.9" />
            ))}
            {[0, 1, 3, 4, 5, 7, 8].map((i) => (
              <rect key={`b-${i}`} x={81 + i * 15} y="190" width="7" height="20" rx="1" fill="#18181B" />
            ))}
          </g>
        );
      case 'skyline':
        return (
          <g>
            <rect x="45" y="140" width="32" height="170" fill="#09090B" opacity="0.7" />
            <rect x="86" y="95" width="42" height="215" fill="#09090B" opacity="0.85" />
            <rect x="136" y="68" width="38" height="242" fill="#09090B" stroke={theme.accent} strokeWidth="1" opacity="0.95" />
            <rect x="182" y="118" width="44" height="192" fill="#09090B" opacity="0.78" />
            <rect x="234" y="155" width="28" height="155" fill="#09090B" opacity="0.6" />
            <line x1="155" y1="42" x2="155" y2="68" stroke={theme.accent} strokeWidth="2" />
            <circle cx="155" cy="40" r="4" fill={theme.accent} />
          </g>
        );
      case 'waves':
        return (
          <g>
            <circle cx="150" cy="140" r="48" fill="none" stroke={theme.accent} strokeWidth="1.5" opacity="0.5" />
            <circle cx="150" cy="140" r="24" fill="none" stroke={theme.accent} strokeWidth="1.5" opacity="0.85" />
            <path d="M0 215 Q75 185 150 215 T300 215" fill="none" stroke={theme.accent} strokeWidth="2" opacity="0.8" />
            <path d="M0 238 Q75 208 150 238 T300 238" fill="none" stroke={theme.accent} strokeWidth="1.5" opacity="0.55" />
            <path d="M0 262 Q75 232 150 262 T300 262" fill="none" stroke={theme.accent} strokeWidth="1" opacity="0.35" />
          </g>
        );
      case 'prism':
        return (
          <g>
            <polygon points="150,82 225,222 75,222" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.85" />
            <line x1="15" y1="175" x2="115" y2="152" stroke="#FFFFFF" strokeWidth="2.5" opacity="0.8" />
            <line x1="185" y1="150" x2="290" y2="128" stroke={theme.accent} strokeWidth="3" opacity="0.85" />
            <line x1="188" y1="160" x2="290" y2="162" stroke="#38BDF8" strokeWidth="2.5" opacity="0.75" />
            <line x1="191" y1="170" x2="290" y2="196" stroke="#FB7185" strokeWidth="2.5" opacity="0.75" />
          </g>
        );
      case 'clockwork':
        return (
          <g>
            <circle cx="150" cy="160" r="64" fill="none" stroke={theme.accent} strokeWidth="2.5" strokeDasharray="8 6" />
            <circle cx="150" cy="160" r="44" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.5" />
            <line x1="150" y1="160" x2="150" y2="118" stroke={theme.accent} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="150" y1="160" x2="184" y2="176" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            <circle cx="150" cy="160" r="5" fill={theme.accent} />
          </g>
        );
      case 'mountain':
        return (
          <g>
            <polygon points="20,275 110,120 195,275" fill="#0F172A" opacity="0.8" />
            <polygon points="95,275 185,95 280,275" fill="#020617" stroke={theme.accent} strokeWidth="1.2" opacity="0.95" />
            <polygon points="185,95 160,145 182,138 205,148" fill={theme.accent} opacity="0.85" />
            <circle cx="72" cy="88" r="18" fill={theme.accent} opacity="0.3" />
          </g>
        );
      case 'reel':
        return (
          <g>
            <circle cx="150" cy="158" r="62" fill="none" stroke={theme.accent} strokeWidth="2.5" opacity="0.85" />
            <circle cx="150" cy="158" r="16" fill={theme.accent} opacity="0.9" />
            {[0, 60, 120, 180, 240, 300].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const cx = 150 + Math.cos(rad) * 38;
              const cy = 158 + Math.sin(rad) * 38;
              return <circle key={deg} cx={cx} cy={cy} r="10" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.7" />;
            })}
          </g>
        );
      case 'compass':
        return (
          <g>
            <circle cx="150" cy="158" r="62" fill="none" stroke={theme.accent} strokeWidth="1.5" opacity="0.75" />
            <polygon points="150,86 164,158 150,148 136,158" fill={theme.accent} />
            <polygon points="150,230 164,158 150,168 136,158" fill="#FFFFFF" opacity="0.65" />
            <circle cx="150" cy="158" r="5" fill="#0F172A" stroke={theme.accent} strokeWidth="2" />
          </g>
        );
      case 'lotus':
        return (
          <g>
            <path d="M150 96 C175 135 175 185 150 212 C125 185 125 135 150 96 Z" fill={theme.accent} opacity="0.8" />
            <path d="M150 212 C110 190 95 148 106 116 C132 135 146 168 150 212 Z" fill={theme.accent} opacity="0.5" />
            <path d="M150 212 C190 190 205 148 194 116 C168 135 154 168 150 212 Z" fill={theme.accent} opacity="0.5" />
            <line x1="75" y1="224" x2="225" y2="224" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.4" />
          </g>
        );
      case 'neon-rain':
        return (
          <g>
            {[55, 85, 115, 145, 175, 205, 235].map((x, idx) => (
              <line
                key={x}
                x1={x}
                y1={40 + (idx % 3) * 20}
                x2={x - 14}
                y2={190 + (idx % 2) * 35}
                stroke={idx % 2 === 0 ? theme.accent : '#FFFFFF'}
                strokeWidth={idx % 2 === 0 ? '2' : '1'}
                opacity={idx % 2 === 0 ? '0.65' : '0.25'}
              />
            ))}
            <rect x="85" y="180" width="130" height="70" rx="2" fill="#090D16" stroke={theme.accent} strokeWidth="1.5" opacity="0.85" />
          </g>
        );
      case 'arch':
        return (
          <g>
            <path d="M82 260 L82 155 A68 68 0 0 1 218 155 L218 260" fill="none" stroke={theme.accent} strokeWidth="2.5" opacity="0.85" />
            <path d="M104 260 L104 160 A46 46 0 0 1 196 160 L196 260" fill="none" stroke={theme.accent} strokeWidth="1.2" opacity="0.5" />
            <circle cx="150" cy="148" r="14" fill={theme.accent} opacity="0.8" />
          </g>
        );
      case 'flame':
        return (
          <g>
            <path d="M150 86 C188 134 198 182 150 226 C102 182 112 134 150 86 Z" fill={theme.accent} opacity="0.75" />
            <path d="M150 132 C170 158 174 188 150 218 C126 188 130 158 150 132 Z" fill="#FEF3C7" opacity="0.85" />
          </g>
        );
      case 'orbit':
        return (
          <g>
            <circle cx="150" cy="156" r="34" fill={theme.accent} opacity="0.85" />
            <ellipse cx="150" cy="156" rx="92" ry="28" transform="rotate(-22 150 156)" fill="none" stroke="#FFFFFF" strokeWidth="1.8" opacity="0.75" />
            <ellipse cx="150" cy="156" rx="70" ry="20" transform="rotate(24 150 156)" fill="none" stroke={theme.accent} strokeWidth="1.2" opacity="0.6" />
          </g>
        );
      case 'curtain':
        return (
          <g>
            <path d="M35 30 Q70 140 50 270 L110 270 Q95 140 120 30 Z" fill={theme.accent} opacity="0.55" />
            <path d="M265 30 Q230 140 250 270 L190 270 Q205 140 180 30 Z" fill={theme.accent} opacity="0.55" />
            <circle cx="150" cy="155" r="26" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.8" />
          </g>
        );
      case 'crown':
        return (
          <g>
            <polygon points="75,205 90,122 128,162 150,104 172,162 210,122 225,205" fill="none" stroke={theme.accent} strokeWidth="2.5" strokeLinejoin="round" />
            <line x1="75" y1="222" x2="225" y2="222" stroke={theme.accent} strokeWidth="2.5" />
          </g>
        );
      case 'train':
        return (
          <g>
            <line x1="65" y1="275" x2="132" y2="155" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.55" />
            <line x1="235" y1="275" x2="168" y2="155" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.55" />
            <rect x="116" y="108" width="68" height="72" rx="12" fill="#090D16" stroke={theme.accent} strokeWidth="2" />
            <circle cx="135" cy="158" r="6" fill={theme.accent} />
            <circle cx="165" cy="158" r="6" fill={theme.accent} />
          </g>
        );
      case 'forest':
        return (
          <g>
            <polygon points="90,248 122,125 154,248" fill="#022C22" stroke={theme.accent} strokeWidth="1" opacity="0.85" />
            <polygon points="145,248 182,102 218,248" fill="#022C22" stroke={theme.accent} strokeWidth="1.4" opacity="0.95" />
            <circle cx="110" cy="86" r="16" fill={theme.accent} opacity="0.35" />
          </g>
        );
      case 'radar':
        return (
          <g>
            <circle cx="150" cy="155" r="70" fill="none" stroke={theme.accent} strokeWidth="1.2" opacity="0.4" />
            <circle cx="150" cy="155" r="46" fill="none" stroke={theme.accent} strokeWidth="1.2" opacity="0.65" />
            <circle cx="150" cy="155" r="22" fill="none" stroke={theme.accent} strokeWidth="1.2" opacity="0.9" />
            <line x1="150" y1="155" x2="205" y2="112" stroke={theme.accent} strokeWidth="2.5" />
            <circle cx="192" cy="122" r="4" fill="#FFFFFF" />
          </g>
        );
      case 'vinyl':
        return (
          <g>
            <circle cx="150" cy="156" r="68" fill="#09090B" stroke="#FFFFFF" strokeWidth="1" opacity="0.85" />
            <circle cx="150" cy="156" r="48" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.25" />
            <circle cx="150" cy="156" r="24" fill={theme.accent} />
            <circle cx="150" cy="156" r="5" fill="#09090B" />
          </g>
        );
      case 'saturn':
      default:
        return (
          <g>
            <circle cx="150" cy="155" r="42" fill={theme.accent} opacity="0.8" />
            <ellipse cx="150" cy="155" rx="95" ry="22" transform="rotate(-18 150 155)" fill="none" stroke="#FFFFFF" strokeWidth="2.2" opacity="0.85" />
          </g>
        );
    }
  };

  const titleWords = movie.title.split(' ');
  const firstLine = titleWords.slice(0, Math.ceil(titleWords.length / 2)).join(' ');
  const secondLine = titleWords.slice(Math.ceil(titleWords.length / 2)).join(' ');

  return (
    <div
      className={`relative h-full w-full overflow-hidden select-none ${className}`}
      style={{
        background: `linear-gradient(155deg, ${theme.bgFrom} 0%, ${theme.bgTo} 100%)`,
      }}
    >
      <svg
        viewBox="0 0 300 400"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-label={`${movie.title} poster artwork`}
      >
        <defs>
          <radialGradient id={`glow-${movie.id}`} cx="50%" cy="38%" r="55%">
            <stop offset="0%" stopColor={theme.accent} stopOpacity="0.24" />
            <stop offset="100%" stopColor={theme.bgTo} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="300" height="400" fill={`url(#glow-${movie.id})`} />
        {renderMotif()}
        {/* Subtle theatrical poster framing */}
        <rect x="14" y="14" width="272" height="372" fill="none" stroke="#FFFFFF" strokeOpacity="0.14" strokeWidth="1" />
        <text
          x="150"
          y="42"
          textAnchor="middle"
          fill={theme.accent}
          fontSize="9.5"
          fontWeight="600"
          letterSpacing="3"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          {theme.subtitle}
        </text>
        <text
          x="150"
          y={secondLine ? '316' : '332'}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="21"
          fontWeight="700"
          letterSpacing="0.5"
          fontFamily="Outfit, sans-serif"
        >
          {firstLine}
        </text>
        {secondLine && (
          <text
            x="150"
            y="342"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="21"
            fontWeight="700"
            letterSpacing="0.5"
            fontFamily="Outfit, sans-serif"
          >
            {secondLine}
          </text>
        )}
        <text
          x="150"
          y="368"
          textAnchor="middle"
          fill="#CBD5E1"
          fontSize="9"
          letterSpacing="1.8"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          {movie.director.toUpperCase()}
        </text>
      </svg>
      {imgError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-white/80">
          <Film className="mb-2 h-8 w-8 opacity-60" />
          <span className="font-display text-sm font-semibold">{movie.title}</span>
        </div>
      )}
    </div>
  );
};
