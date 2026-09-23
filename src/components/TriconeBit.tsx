export function TriconeBit({ x, y }: { x: number; y: number }) {
  const inserts = [-16, -8, 0, 8, 16];

  const Cone = ({
    tx,
    ty,
    rotate,
    scale = 1
  }: {
    tx: number;
    ty: number;
    rotate: number;
    scale?: number;
  }) => (
    <g transform={`translate(${tx} ${ty}) rotate(${rotate}) scale(${scale})`}>
      {/* Cone shell */}
      <path
        d="M-24 -8
           C-18 -18, 15 -18, 25 -5
           C18 9, 8 16, -10 14
           C-19 11, -24 3, -24 -8 Z"
        fill="url(#bitCone)"
        stroke="#d8e4e9"
        strokeWidth="1.5"
      />

      {/* Cone rings */}
      <path
        d="M-17 -11 C-10 -4, -10 8, -14 12"
        fill="none"
        stroke="#667781"
        strokeWidth="2"
      />
      <path
        d="M-5 -14 C2 -5, 2 9, -2 14"
        fill="none"
        stroke="#667781"
        strokeWidth="2"
      />
      <path
        d="M8 -13 C14 -5, 14 6, 10 11"
        fill="none"
        stroke="#667781"
        strokeWidth="2"
      />

      {/* Tungsten carbide inserts */}
      {inserts.map((px, i) => (
        <circle
          key={i}
          cx={px}
          cy={i % 2 === 0 ? -10 : 9}
          r="2.8"
          fill="#d7dce0"
          stroke="#ffffff"
          strokeWidth="0.7"
        />
      ))}

      <circle cx="-10" cy="1" r="2.6" fill="#c8d0d4" />
      <circle cx="2" cy="-1" r="2.6" fill="#c8d0d4" />
      <circle cx="13" cy="2" r="2.6" fill="#c8d0d4" />
    </g>
  );

  return (
    <g transform={`translate(${x} ${y})`} className="bit">
      <defs>
        <linearGradient id="bitBody" x1="0" x2="1">
          <stop offset="0" stopColor="#44535c" />
          <stop offset=".22" stopColor="#d9e3e8" />
          <stop offset=".48" stopColor="#687983" />
          <stop offset=".72" stopColor="#eef4f6" />
          <stop offset="1" stopColor="#3d4b53" />
        </linearGradient>

        <linearGradient id="bitCone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e2e7e9" />
          <stop offset=".3" stopColor="#89979e" />
          <stop offset=".65" stopColor="#4d5b62" />
          <stop offset="1" stopColor="#b9c4c9" />
        </linearGradient>
      </defs>

      {/* API pin / connection */}
      <path
        d="M-13 -39 L13 -39 L16 -23 L-16 -23 Z"
        fill="url(#bitBody)"
        stroke="#e8f3f7"
        strokeWidth="1.5"
      />

      {/* Connection grooves */}
      <g stroke="#52636c" strokeWidth="1.5">
        <line x1="-12" y1="-35" x2="12" y2="-35" />
        <line x1="-13" y1="-31" x2="13" y2="-31" />
        <line x1="-14" y1="-27" x2="14" y2="-27" />
      </g>

      {/* Main bit body */}
      <path
        d="M-17 -23
           L17 -23
           L27 -8
           L25 11
           L16 26
           L-16 26
           L-25 11
           L-27 -8 Z"
        fill="url(#bitBody)"
        stroke="#e6f1f4"
        strokeWidth="1.8"
      />

      {/* Shirttails / legs */}
      <path
        d="M-24 -2 L-31 14 L-26 31 L-17 24 L-14 4 Z"
        fill="url(#bitBody)"
        stroke="#bdcbd1"
      />
      <path
        d="M24 -2 L31 14 L26 31 L17 24 L14 4 Z"
        fill="url(#bitBody)"
        stroke="#bdcbd1"
      />

      {/* Rear cone */}
      <Cone tx={0} ty={28} rotate={0} scale={0.9} />

      {/* Left cone */}
      <Cone tx={-19} ty={25} rotate={-28} scale={0.82} />

      {/* Right cone */}
      <Cone tx={19} ty={25} rotate={28} scale={0.82} />

      {/* Nozzles */}
      <circle cx="-9" cy="8" r="3.4" fill="#07151c" stroke="#68dfff" strokeWidth="1.3" />
      <circle cx="9" cy="8" r="3.4" fill="#07151c" stroke="#68dfff" strokeWidth="1.3" />
      <circle cx="0" cy="17" r="3" fill="#07151c" stroke="#68dfff" strokeWidth="1.2" />

      {/* Short mud jets */}
      <g
        className="jet"
        stroke="#35d5ff"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity=".8"
      >
        <path d="M-9 12 L-24 49" />
        <path d="M9 12 L24 49" />
        <path d="M0 20 L0 54" />
      </g>

      {/* Body highlights */}
      <path
        d="M-13 -18 L-18 2"
        stroke="#ffffff"
        strokeWidth="2"
        opacity=".35"
        strokeLinecap="round"
      />
      <path
        d="M13 -18 L18 2"
        stroke="#ffffff"
        strokeWidth="1.5"
        opacity=".25"
        strokeLinecap="round"
      />
    </g>
  );
}