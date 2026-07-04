export function WellHead({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <text x="-38" y="-8" fill="#9ddfff" fontSize="12" fontWeight="700">BOP / Wellhead</text>
      <rect x="-58" y="0" width="116" height="25" rx="5" fill="url(#steel)" stroke="#e6f5ff" />
      <rect x="-72" y="25" width="144" height="34" rx="6" fill="#c53326" stroke="#ffad98" />
      <rect x="-92" y="60" width="184" height="42" rx="7" fill="#81241d" stroke="#ff866c" />
      <rect x="-64" y="103" width="128" height="24" rx="5" fill="url(#steel)" stroke="#e6f5ff" />
      <path d="M-145 75 H-90" stroke="url(#steel)" strokeWidth="12" strokeLinecap="round" />
      <path d="M90 75 H145" stroke="url(#steel)" strokeWidth="12" strokeLinecap="round" />
    </g>
  );
}
