import { useMemo, useRef, useState } from 'react';
import { PanResponder, View, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const INK = '#0B1F66';

export type SigBox = { x: number; y: number; w: number; h: number };

/** Renders saved signature paths scaled into the parent box. */
export function SignatureView({ paths, box, color = INK, style }: { paths: string[]; box: SigBox; color?: string; style?: ViewStyle }) {
  return (
    <Svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} style={[{ width: '100%', height: '100%' }, style]} preserveAspectRatio="xMidYMid meet">
      {paths.map((d, i) => (
        <Path key={i} d={d} stroke={color} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

/** Finger drawing area; reports all paths at the end of each stroke. Remount (key) to clear. */
export function SignaturePad({ onChange, style }: { onChange: (paths: string[]) => void; style?: ViewStyle }) {
  const [paths, setPaths] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const cur = useRef('');
  const start = useRef({ x: 0, y: 0 });
  const all = useRef<string[]>([]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          start.current = { x, y };
          cur.current = `M${x.toFixed(1)} ${y.toFixed(1)}`;
          setCurrent(cur.current);
        },
        onPanResponderMove: (e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          cur.current += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
          setCurrent(cur.current);
        },
        onPanResponderRelease: () => {
          // A single tap becomes a dot.
          const { x, y } = start.current;
          const d = cur.current.includes('L') ? cur.current : `${cur.current} L${(x + 0.5).toFixed(1)} ${y.toFixed(1)}`;
          all.current = [...all.current, d];
          setPaths(all.current);
          setCurrent('');
          onChange(all.current);
        },
      }),
    [onChange],
  );

  return (
    <View
      {...responder.panHandlers}
      style={[{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' }, style]}
    >
      <Svg style={{ width: '100%', height: '100%' }} pointerEvents="none">
        {[...paths, current].filter(Boolean).map((d, i) => (
          <Path key={i} d={d} stroke={INK} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </Svg>
    </View>
  );
}

/** Tight box around the strokes (with a small margin), used as the signature viewBox. */
export function pathsBox(paths: string[]): SigBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const d of paths) {
    const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      minX = Math.min(minX, nums[i]);
      maxX = Math.max(maxX, nums[i]);
      minY = Math.min(minY, nums[i + 1]);
      maxY = Math.max(maxY, nums[i + 1]);
    }
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 1, h: 1 };
  const pad = 6;
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}
