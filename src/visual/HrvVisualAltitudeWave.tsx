import Svg, { Circle, Line, Path, Rect, Text } from "react-native-svg";

type Props = {
  displayY: number;
  heartRate: number;
  rmssd: number;
  delta: number;
  phase: number;
};

const WIDTH = 390;
const HEIGHT = 500;

function makeWavePath({
  displayY,
  heartRate,
  rmssd,
  delta,
  phase,
}: Props): string {
  const frequency = 0.055 + Math.min(Math.max(heartRate, 45), 150) / 900;
  const amplitude = Math.max(4, Math.min(34, 8 + rmssd * 0.28));
  const irregularity = Math.max(0.4, Math.min(2.2, Math.abs(delta) / 18 + 0.6));

  const points: { x: number; y: number }[] = [];
  const left = 18;
  const right = WIDTH - 18;
  const step = 7;

  for (let x = left; x <= right; x += step) {
    const local = x * frequency + phase;
    const primary = Math.sin(local) * amplitude;
    const secondary = Math.sin(local * 0.47 + 1.7) * amplitude * 0.24;
    const micro = Math.sin(local * 1.9) * irregularity * 1.4;
    const fade = Math.sin(((x - left) / (right - left)) * Math.PI);

    points.push({
      x,
      y: displayY + (primary + secondary + micro) * fade,
    });
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;

    d += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  return d;
}

export function HrvAltitudeWave(props: Props) {
  const wavePath = makeWavePath(props);
  const markerX = 350;
  const markerY = props.displayY;

  return (
    <Svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      <Rect x={0} y={0} width={390} height={125} fill="transparent" stroke="rgba(20,20,20,0.11)" />
      <Rect x={0} y={125} width={390} height={125} fill="transparent" stroke="rgba(20,20,20,0.11)" />
      <Rect x={0} y={250} width={390} height={125} fill="transparent" stroke="rgba(20,20,20,0.11)" />
      <Rect x={0} y={375} width={390} height={125} fill="transparent" stroke="rgba(20,20,20,0.11)" />

      {[125, 250, 375].map((y) => (
        <Line
          key={y}
          x1={0}
          y1={y}
          x2={390}
          y2={y}
          stroke="rgba(20,20,20,0.16)"
          strokeDasharray="5 7"
        />
      ))}

      <Text x={22} y={38} fontSize={10} fill="rgba(20,20,20,0.48)" fontWeight="700">RESTORED</Text>
      <Text x={22} y={163} fontSize={10} fill="rgba(20,20,20,0.48)" fontWeight="700">ADAPTIVE</Text>
      <Text x={22} y={288} fontSize={10} fill="rgba(20,20,20,0.48)" fontWeight="700">LOADED</Text>
      <Text x={22} y={413} fontSize={10} fill="rgba(20,20,20,0.48)" fontWeight="700">STRAINED</Text>

      <Line
        x1={18}
        y1={props.displayY}
        x2={372}
        y2={props.displayY}
        stroke="rgba(20,20,20,0.18)"
        strokeWidth={1.5}
        strokeDasharray="3 7"
      />

      <Path d={wavePath} fill="none" stroke="rgba(20,20,20,0.10)" strokeWidth={11} strokeLinecap="round" />
      <Path d={wavePath} fill="none" stroke="#151515" strokeWidth={3.25} strokeLinecap="round" />

      <Circle cx={markerX} cy={markerY} r={13} fill="rgba(244,241,234,0.94)" stroke="#151515" strokeWidth={2.5} />
      <Circle cx={markerX} cy={markerY} r={4.5} fill="#151515" />
    </Svg>
  );
}
