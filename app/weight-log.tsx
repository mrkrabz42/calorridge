import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Svg, { Line, Circle, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { Colors, Typography, Spacing, Radius } from '../constants';
import { useAdaptiveStore } from '../store/adaptiveStore';
import { calculateEMA, WeightPoint } from '../utils/adaptiveUtils';

const CHART_WIDTH = 340;
const CHART_HEIGHT = 180;
const CHART_PADDING = { top: 16, right: 16, bottom: 28, left: 44 };

function getTodayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export default function WeightLogScreen() {
  const {
    weighIns,
    latestWeight,
    lastAdjustment,
    adjustmentHistory,
    isLoading,
    error,
    logWeighIn,
    fetchLast30Days,
    fetchLatest,
    fetchHistory,
    runAdjustment,
  } = useAdaptiveStore();

  const [weightInput, setWeightInput] = useState('');

  useEffect(() => {
    fetchLast30Days();
    fetchLatest();
    fetchHistory();
  }, []);

  const todayStr = getTodayDateString();
  const todayLogged = weighIns.some((w) => w.weigh_in_date === todayStr);

  const handleLog = async () => {
    const value = parseFloat(weightInput);
    if (isNaN(value) || value < 20 || value > 300) {
      Alert.alert('Invalid weight', 'Please enter a weight between 20 and 300 kg.');
      return;
    }
    await logWeighIn(todayStr, value);
    setWeightInput('');
  };

  const handleRunAdjustment = async () => {
    try {
      await runAdjustment();
      Alert.alert('Adjustment complete', 'Your calorie target has been updated.');
    } catch (err) {
      Alert.alert('Cannot adjust', (err as Error).message);
    }
  };

  // -- Chart data --
  const points: WeightPoint[] = useMemo(
    () => weighIns.map((w) => ({ date: w.weigh_in_date, value: Number(w.weight_kg) })),
    [weighIns]
  );
  const emaValues = useMemo(() => calculateEMA(points), [points]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Weight input card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {todayLogged ? 'Weight logged today' : 'Log today\'s weight'}
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.weightInput}
            value={weightInput}
            onChangeText={setWeightInput}
            placeholder={latestWeight ? String(Number(latestWeight.weight_kg)) : '75.0'}
            placeholderTextColor={Colors.text.muted}
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={handleLog}
          />
          <Text style={styles.unitLabel}>kg</Text>
          <TouchableOpacity
            style={[styles.logBtn, isLoading && styles.logBtnDisabled]}
            onPress={handleLog}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.text.inverse} />
            ) : (
              <Text style={styles.logBtnText}>Log</Text>
            )}
          </TouchableOpacity>
        </View>
        {latestWeight && (
          <Text style={styles.latestText}>
            Latest: {Number(latestWeight.weight_kg)} kg on {formatShortDate(latestWeight.weigh_in_date)}
          </Text>
        )}
      </View>

      {/* Weight trend chart */}
      {points.length >= 2 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>30-day weight trend</Text>
          <WeightChart points={points} emaValues={emaValues} />
        </View>
      )}

      {/* Run adjustment */}
      <TouchableOpacity
        style={styles.adjustBtn}
        onPress={handleRunAdjustment}
        disabled={isLoading}
      >
        <Text style={styles.adjustBtnText}>
          {isLoading ? 'Calculating...' : 'Run weekly adjustment'}
        </Text>
      </TouchableOpacity>

      {/* Latest adjustment card */}
      {lastAdjustment && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Latest adjustment</Text>
          <View style={styles.statRow}>
            <StatItem label="Estimated TDEE" value={`${lastAdjustment.estimated_tdee} kcal`} />
            <StatItem
              label="Target"
              value={`${lastAdjustment.previous_target} -> ${lastAdjustment.new_target}`}
            />
          </View>
          <View style={styles.statRow}>
            <StatItem label="Avg weight" value={`${lastAdjustment.avg_weight_kg} kg`} />
            <StatItem label="Avg intake" value={`${lastAdjustment.avg_daily_intake} kcal`} />
          </View>
          {lastAdjustment.adjustment_reason && (
            <Text style={styles.reasonText}>{lastAdjustment.adjustment_reason}</Text>
          )}
        </View>
      )}

      {/* Adjustment history */}
      {adjustmentHistory.length > 1 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Adjustment history</Text>
          {adjustmentHistory.map((adj) => (
            <View key={adj.id} style={styles.historyRow}>
              <Text style={styles.historyDate}>
                {formatShortDate(adj.week_start_date)} - {formatShortDate(adj.week_end_date)}
              </Text>
              <Text style={styles.historyTarget}>
                {adj.new_target} kcal
              </Text>
              <Text style={styles.historyTDEE}>
                TDEE {adj.estimated_tdee}
              </Text>
            </View>
          ))}
        </View>
      )}

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// -- Chart component using react-native-svg --

function WeightChart({
  points,
  emaValues,
}: {
  points: WeightPoint[];
  emaValues: number[];
}) {
  const plotW = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotH = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  const allValues = [...points.map((p) => p.value), ...emaValues];
  const minVal = Math.floor(Math.min(...allValues) - 0.5);
  const maxVal = Math.ceil(Math.max(...allValues) + 0.5);
  const range = maxVal - minVal || 1;

  const toX = (i: number) =>
    CHART_PADDING.left + (i / Math.max(points.length - 1, 1)) * plotW;
  const toY = (val: number) =>
    CHART_PADDING.top + plotH - ((val - minVal) / range) * plotH;

  // Raw weight polyline
  const rawPolyline = points.map((p, i) => `${toX(i)},${toY(p.value)}`).join(' ');
  // EMA polyline
  const emaPolyline = emaValues.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');

  // Y-axis labels (4 ticks)
  const yTicks = [0, 1, 2, 3].map((i) => minVal + (range * i) / 3);

  // X-axis labels (first, middle, last)
  const xLabelIndices = [0, Math.floor(points.length / 2), points.length - 1];

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
      {/* Background */}
      <Rect
        x={CHART_PADDING.left}
        y={CHART_PADDING.top}
        width={plotW}
        height={plotH}
        fill={Colors.bg.primary}
        rx={4}
      />

      {/* Horizontal grid lines */}
      {yTicks.map((tick, i) => (
        <Line
          key={`grid-${i}`}
          x1={CHART_PADDING.left}
          y1={toY(tick)}
          x2={CHART_PADDING.left + plotW}
          y2={toY(tick)}
          stroke={Colors.border.default}
          strokeWidth={0.5}
        />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((tick, i) => (
        <SvgText
          key={`ylabel-${i}`}
          x={CHART_PADDING.left - 6}
          y={toY(tick) + 4}
          fill={Colors.text.muted}
          fontSize={10}
          textAnchor="end"
        >
          {tick.toFixed(1)}
        </SvgText>
      ))}

      {/* X-axis labels */}
      {xLabelIndices
        .filter((idx, pos, arr) => arr.indexOf(idx) === pos && idx < points.length)
        .map((idx) => (
          <SvgText
            key={`xlabel-${idx}`}
            x={toX(idx)}
            y={CHART_HEIGHT - 4}
            fill={Colors.text.muted}
            fontSize={10}
            textAnchor="middle"
          >
            {formatShortDate(points[idx].date)}
          </SvgText>
        ))}

      {/* Raw weight line */}
      <Polyline
        points={rawPolyline}
        fill="none"
        stroke={Colors.text.secondary}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* EMA trend line */}
      <Polyline
        points={emaPolyline}
        fill="none"
        stroke={Colors.brand.primary}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Raw weight dots */}
      {points.map((p, i) => (
        <Circle
          key={`dot-${i}`}
          cx={toX(i)}
          cy={toY(p.value)}
          r={3}
          fill={Colors.text.secondary}
        />
      ))}
    </Svg>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing.md, gap: Spacing.md },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: Spacing.sm,
  },
  cardTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  weightInput: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.text.primary,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  unitLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.medium,
  },
  logBtn: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  logBtnDisabled: {
    opacity: 0.5,
  },
  logBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  latestText: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  adjustBtn: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  adjustBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  statRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statItem: {
    flex: 1,
    gap: 2,
  },
  statLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  statValue: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  reasonText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontStyle: 'italic',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    gap: Spacing.sm,
  },
  historyDate: {
    flex: 1,
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
  },
  historyTarget: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  historyTDEE: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    width: 70,
    textAlign: 'right',
  },
  errorText: {
    color: Colors.status.error,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },
});
