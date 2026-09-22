// Weather condition icon. Conditions are the fixed set the backend normalizes
// to (lib/weatherSeverity.ts): Clear/Sunny, Partly Cloudy, Cloudy, Rain, Snow,
// Fog/Mist, Thunder. Sized by the parent (width/height 100%).

const CLOUD =
  "M15 36c-4.4 0-8-3.3-8-7.5 0-3.9 3-7 6.9-7.5C15.3 16 19.4 12.5 24.4 12.5c5.6 0 10.2 4 10.9 9.2 4.2.6 7.7 4 7.7 8 0 3.6-2.9 6.3-6.4 6.3H15Z";
const CLOUD_STROKE = "#b9c0cc";
const CLOUD_FILL = "#f6f8fb";

function Sun({ cx = 24, cy = 24, r = 7.5 }: { cx?: number; cy?: number; r?: number }) {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const x1 = cx + Math.cos(a) * (r + 3.5);
    const y1 = cy + Math.sin(a) * (r + 3.5);
    const x2 = cx + Math.cos(a) * (r + 7);
    const y2 = cy + Math.sin(a) * (r + 7);
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffb400" strokeWidth="2.6" strokeLinecap="round" />;
  });
  return (
    <>
      {rays}
      <circle cx={cx} cy={cy} r={r} fill="#ffc72c" stroke="#ffb400" strokeWidth="1.5" />
    </>
  );
}

function Cloud({ dy = 0, fill = CLOUD_FILL }: { dy?: number; fill?: string }) {
  return (
    <path
      d={CLOUD}
      transform={`translate(0 ${dy})`}
      fill={fill}
      stroke={CLOUD_STROKE}
      strokeWidth="2"
      strokeLinejoin="round"
    />
  );
}

export function WeatherIcon({ condition }: { condition: string }) {
  const c = condition.toLowerCase();
  let body: React.ReactNode;

  if (c.includes("thunder")) {
    body = (
      <>
        <Cloud dy={-3} fill="#e6e9ef" />
        <path d="M25 30l-5 8h4l-2 7 8-10h-4l3-5Z" fill="#ffc72c" stroke="#ffb400" strokeWidth="1.2" strokeLinejoin="round" />
      </>
    );
  } else if (c.includes("snow")) {
    body = (
      <>
        <Cloud dy={-3} />
        {[16, 24, 32].map((x) => (
          <g key={x} stroke="#6cb7f5" strokeWidth="2" strokeLinecap="round">
            <line x1={x} y1="38" x2={x} y2="44" />
            <line x1={x - 3} y1="41" x2={x + 3} y2="41" />
          </g>
        ))}
      </>
    );
  } else if (c.includes("rain")) {
    body = (
      <>
        <Cloud dy={-3} fill="#e6e9ef" />
        {[16, 24, 32].map((x) => (
          <line key={x} x1={x + 2} y1="37" x2={x - 1} y2="44" stroke="#2f8cf0" strokeWidth="2.6" strokeLinecap="round" />
        ))}
      </>
    );
  } else if (c.includes("fog") || c.includes("mist")) {
    body = (
      <>
        <Cloud dy={-5} />
        {[36, 41].map((y) => (
          <line key={y} x1="11" y1={y} x2="37" y2={y} stroke={CLOUD_STROKE} strokeWidth="2.6" strokeLinecap="round" />
        ))}
      </>
    );
  } else if (c.includes("partly")) {
    body = (
      <>
        <Sun cx={19} cy={19} r={6.5} />
        <path
          d={CLOUD}
          transform="translate(4 4)"
          fill={CLOUD_FILL}
          stroke={CLOUD_STROKE}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </>
    );
  } else if (c.includes("clear") || c.includes("sun")) {
    body = <Sun />;
  } else {
    body = <Cloud />;
  }

  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true">
      {body}
    </svg>
  );
}
