import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../../constants';

interface Props {
  startedAt: string;
}

function formatElapsed(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function SessionTimer({ startedAt }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();

    const tick = () => {
      const now = Date.now();
      setElapsed(Math.floor((now - start) / 1000));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return <Text style={styles.timer}>{formatElapsed(elapsed)}</Text>;
}

const styles = StyleSheet.create({
  timer: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    fontVariant: ['tabular-nums'],
  },
});
