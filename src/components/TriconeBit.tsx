export function TriconeBit({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className="bit">
      <rect x="-24" y="-35" width="48" height="34" rx="8" fill="url(#steel)" stroke="#e5f6ff" />
      <ellipse cx="-28" cy="22" rx="24" ry="16" fill="#b99048" stroke="#ffe4a8" strokeWidth="2" transform="rotate(-18 -28 22)" />
      <ellipse cx="28" cy="22" rx="24" ry="16" fill="#c89c52" stroke="#ffe4a8" strokeWidth="2" transform="rotate(18 28 22)" />
      <ellipse cx="0" cy="44" rx="24" ry="18" fill="#a87834" stroke="#ffe4a8" strokeWidth="2" />
      {[-40, 0, 40].map((dx, i) => (
        <path key={i} className="jet" d={`M0 55 L${dx} 95`} stroke="#ffd25a" strokeWidth="3" strokeLinecap="round" />
      ))}
    </g>
  );
}
