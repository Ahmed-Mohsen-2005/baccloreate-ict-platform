import type { Domain } from "@/lib/db/domain";

/**
 * One drawn object per unit world (docs/M0-PLAN.md §5). Pure SVG + CSS: no client JS.
 * Colour comes from the surrounding `.domain-*` class (via currentColor); the animation
 * runs when a parent with class `tile` is hovered, focused or pressed (see globals.css).
 * The object is decoration for sighted users; the unit's title carries the meaning.
 */
const svgProps = {
  viewBox: "0 0 160 120",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
  className: "obj block h-auto w-full",
} as const;

function Society() {
  const n = [[28, 32], [78, 20], [132, 40], [52, 84], [108, 92]] as const;
  const link = (a: number, b: number, draw = false) => (
    <line key={`${a}-${b}`} x1={n[a]![0]} y1={n[a]![1]} x2={n[b]![0]} y2={n[b]![1]} pathLength={100} className={draw ? "draw" : undefined} opacity={draw ? 1 : 0.55} />
  );
  return (
    <svg {...svgProps}>
      {link(0, 1)}
      {link(1, 2)}
      {link(0, 3)}
      {link(2, 4, true)}
      {link(3, 4, true)}
      {link(1, 3, true)}
      {link(1, 4, true)}
      {n.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={7} className="node fill-surface" style={{ ["--d" as string]: i }} />
      ))}
    </svg>
  );
}

function Cipher() {
  const outer = "ABCDEFGHIJKL";
  const inner = "DEFGHIJKLABC";
  const letter = (c: string, i: number, y: number) => (
    <text key={`${c}${i}`} x={80} y={y} transform={`rotate(${i * 30} 80 62)`} textAnchor="middle" fontSize={8} fontWeight={600} className="fill-current stroke-none font-mono">
      {c}
    </text>
  );
  return (
    <svg {...svgProps}>
      <circle cx={80} cy={62} r={50} className="fill-surface" />
      {outer.split("").map((c, i) => letter(c, i, 18))}
      <g className="spin">
        <circle cx={80} cy={62} r={38} className="fill-surface" />
        <circle cx={80} cy={62} r={25} />
        {inner.split("").map((c, i) => letter(c, i, 34))}
      </g>
      <circle cx={80} cy={62} r={4} className="fill-current" />
      <path d="M74 2 L80 11 L86 2 Z" className="fill-current" />
    </svg>
  );
}

function Protocol() {
  return (
    <svg {...svgProps}>
      <rect x={8} y={32} width={36} height={56} rx={5} className="fill-surface" />
      <line x1={15} y1={44} x2={37} y2={44} opacity={0.55} />
      <line x1={15} y1={54} x2={32} y2={54} opacity={0.55} />
      <rect x={116} y={32} width={36} height={56} rx={5} className="fill-surface" />
      <circle cx={134} cy={44} r={3} className="fill-current stroke-none" />
      <circle cx={134} cy={56} r={3} className="fill-current stroke-none" />
      <circle cx={134} cy={68} r={3} className="fill-current stroke-none" />
      <line x1={46} y1={46} x2={114} y2={46} strokeDasharray="3 6" opacity={0.55} />
      <line x1={46} y1={74} x2={114} y2={74} strokeDasharray="3 6" opacity={0.55} />
      <rect className="packet-go fill-current" x={50} y={38} width={22} height={16} rx={3} />
      <rect className="packet-back fill-surface" x={88} y={66} width={22} height={16} rx={3} />
    </svg>
  );
}

function Swatch() {
  return (
    <svg {...svgProps}>
      {[40, 80, 120].map((x) => (
        <line key={x} x1={x} y1={14} x2={x} y2={106} strokeDasharray="2 5" opacity={0.4} />
      ))}
      {[30, 60, 90].map((y) => (
        <line key={y} x1={10} y1={y} x2={150} y2={y} strokeDasharray="2 5" opacity={0.4} />
      ))}
      {[0.2, 0.45, 0.7, 1].map((o, i) => (
        <rect key={i} className="sw fill-current" x={18 + i * 32} y={34} width={26} height={56} rx={4} fillOpacity={o} style={{ ["--r" as string]: `${(i - 1.5) * 8}deg` }} />
      ))}
    </svg>
  );
}

function Data() {
  return (
    <svg {...svgProps}>
      <rect x={20} y={16} width={120} height={88} rx={5} className="fill-surface" />
      <rect x={20} y={16} width={120} height={24} rx={5} className="fill-current stroke-none" fillOpacity={0.2} />
      <line x1={60} y1={16} x2={60} y2={104} />
      <line x1={100} y1={16} x2={100} y2={104} />
      <line x1={20} y1={40} x2={140} y2={40} />
      <line x1={20} y1={64} x2={140} y2={64} />
      {[[28, 52, 24], [28, 76, 18], [68, 52, 22], [108, 52, 26], [108, 76, 16], [68, 94, 14]].map(([x, y, w], i) => (
        <line key={i} x1={x} y1={y} x2={x! + w!} y2={y} opacity={0.55} />
      ))}
      <g className="dirty">
        <line x1={72} y1={70} x2={88} y2={86} />
        <line x1={88} y1={70} x2={72} y2={86} />
      </g>
      <path d="M70 78 L77 85 L90 70" pathLength={100} className="draw" />
    </svg>
  );
}

function Signal() {
  const dots = [[38, 84], [54, 74], [66, 80], [82, 60], [98, 62], [112, 44], [128, 40]] as const;
  return (
    <svg {...svgProps}>
      <path d="M24 12 V102 H148" opacity={0.7} />
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4} className="fill-current stroke-none" />
      ))}
      <path d="M30 92 L142 30" pathLength={100} className="draw" />
    </svg>
  );
}

function Neuron() {
  const layers = [[30, [30, 60, 90]], [80, [22, 47, 72, 97]], [130, [45, 75]]] as const;
  return (
    <svg {...svgProps}>
      {layers.slice(0, 2).flatMap(([x, ys], li) =>
        ys.flatMap((y1) => layers[li + 1]![1].map((y2) => <line key={`${li}-${y1}-${y2}`} x1={x} y1={y1} x2={layers[li + 1]![0]} y2={y2} opacity={0.35} />)),
      )}
      {layers.flatMap(([x, ys], li) =>
        ys.map((y, i) => <circle key={`${li}-${i}`} cx={x} cy={y} r={7} className="node fill-surface" style={{ ["--d" as string]: li * 2 + i }} />),
      )}
    </svg>
  );
}

function Programming() {
  const boxes = [
    { label: "x", value: "5" },
    { label: "name", value: "Sara" },
    { label: "ok", value: "True" },
  ];
  return (
    <svg {...svgProps}>
      {boxes.map((b, i) => (
        <g key={b.label} className="vbox" style={{ ["--i" as string]: i }}>
          <text x={14 + i * 46 + 19} y={36} textAnchor="middle" fontSize={11} className="fill-current stroke-none font-mono">
            {b.label}
          </text>
          <rect x={14 + i * 46} y={44} width={38} height={38} rx={5} className="fill-surface" />
          <text x={14 + i * 46 + 19} y={68} textAnchor="middle" fontSize={b.value.length > 3 ? 9 : 13} fontWeight={700} className="fill-current stroke-none font-mono">
            {b.value}
          </text>
        </g>
      ))}
    </svg>
  );
}

const OBJECTS: Record<Domain, () => React.ReactElement> = {
  society: Society,
  cipher: Cipher,
  protocol: Protocol,
  swatch: Swatch,
  data: Data,
  signal: Signal,
  neuron: Neuron,
  programming: Programming,
};

export function UnitObject({ domain }: { domain: Domain }) {
  const Object = OBJECTS[domain];
  return <Object />;
}
