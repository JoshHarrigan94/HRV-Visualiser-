import { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { calculateRMSSD, estimateHeartRate } from "../engine/hrvEngine";
import {
  getDelta,
  getStateFromDelta,
  getStateLabel,
  getYFromDelta,
  HrvState,
} from "../engine/stateEngine";
import { HrvAltitudeWave } from "../visual/HrvAltitudeWave";

const RMSSD_WINDOW = 36;

type SimMode = "balanced" | "recovered" | "stressed" | "drift";

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function generateSimulatedRR(mode: SimMode, tick: number): number {
  const breathWave = Math.sin(tick / 3.2);
  const slowWave = Math.sin(tick / 18);

  let baseRR = 960;
  let variability = 42;
  let noise = 12;

  if (mode === "recovered") {
    baseRR = 1030;
    variability = 68;
    noise = 16;
  }

  if (mode === "stressed") {
    baseRR = 760;
    variability = 13;
    noise = 7;
  }

  if (mode === "drift") {
    const drift = Math.min(tick / 180, 1);
    baseRR = 790 + drift * 210;
    variability = 16 + drift * 55;
    noise = 8 + drift * 8;
  }

  return Math.round(
    baseRR +
      breathWave * variability +
      slowWave * variability * 0.22 +
      randomBetween(-noise, noise)
  );
}

export function LiveScreen() {
  const [rrIntervals, setRrIntervals] = useState<number[]>([]);
  const [baseline, setBaseline] = useState("52");
  const [simMode, setSimMode] = useState<SimMode>("balanced");
  const [isSimulating, setIsSimulating] = useState(false);
  const [tick, setTick] = useState(0);
  const [phase, setPhase] = useState(0);
  const [displayY, setDisplayY] = useState(250);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const baselineNumber = Number(baseline) || 52;
  const windowedRR = rrIntervals.slice(-RMSSD_WINDOW);
  const rmssd = calculateRMSSD(windowedRR);
  const heartRate = estimateHeartRate(rrIntervals);
  const delta = rmssd ? getDelta(rmssd, baselineNumber) : 0;
  const state: HrvState = rmssd ? getStateFromDelta(delta) : "adaptive";
  const targetY = rmssd ? getYFromDelta(delta) : 250;

  useEffect(() => {
    const animation = setInterval(() => {
      setDisplayY((current) => current + (targetY - current) * 0.035);
      setPhase((current) => current + 0.08 + (heartRate || 62) / 900);
    }, 16);

    return () => clearInterval(animation);
  }, [targetY, heartRate]);

  function addRRInterval(rr: number) {
    if (!Number.isFinite(rr)) return;
    if (rr < 300 || rr > 2000) return;

    setRrIntervals((current) => {
      const next = [...current, rr];
      return next.slice(-160);
    });
  }

  function startSimulation() {
    if (timerRef.current) return;

    setIsSimulating(true);

    timerRef.current = setInterval(() => {
      setTick((currentTick) => {
        const rr = generateSimulatedRR(simMode, currentTick);
        addRRInterval(rr);
        return currentTick + 1;
      });
    }, 850);
  }

  function stopSimulation() {
    setIsSimulating(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function reset() {
    stopSimulation();
    setRrIntervals([]);
    setTick(0);
    setDisplayY(250);
    setPhase(0);
  }

  function cycleMode() {
    const modes: SimMode[] = ["balanced", "recovered", "stressed", "drift"];
    const index = modes.indexOf(simMode);
    setSimMode(modes[(index + 1) % modes.length]);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.app}>
        <View style={styles.topbar}>
          <View>
            <Text style={styles.eyebrow}>HRV Altitude</Text>
            <Text style={styles.title}>Nervous{"\n"}System State</Text>
          </View>

          <View style={styles.statusPill}>
            <Text style={styles.statusText}>
              {isSimulating ? "Simulating" : "Ready"}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.stateHeader}>
            <View>
              <Text style={styles.eyebrow}>Current State</Text>
              <Text style={styles.stateLabel}>{getStateLabel(state)}</Text>
            </View>

            <View style={styles.meta}>
              <Text style={styles.metaMuted}>RMSSD</Text>
              <Text style={styles.metaStrong}>
                {rmssd ? `${Math.round(rmssd)} ms` : "-- ms"}
              </Text>
            </View>
          </View>

          <View style={styles.chart}>
            <HrvAltitudeWave
              displayY={displayY}
              heartRate={heartRate || 62}
              rmssd={rmssd || baselineNumber}
              delta={delta}
              phase={phase}
            />
          </View>
        </View>

        <View style={styles.metrics}>
          <Metric label="Heart Rate" value={heartRate ? String(heartRate) : "--"} />
          <Metric label="Baseline" value={String(baselineNumber)} />
          <Metric
            label="Delta"
            value={rmssd ? `${delta > 0 ? "+" : ""}${Math.round(delta)}%` : "--"}
          />
        </View>

        <View style={styles.controlsCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Baseline RMSSD</Text>
            <TextInput
              value={baseline}
              onChangeText={setBaseline}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <TouchableOpacity style={styles.modeButton} onPress={cycleMode}>
            <Text style={styles.modeLabel}>Simulation</Text>
            <Text style={styles.modeValue}>{simMode}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          Native skeleton running. Next pass adds Polar BLE as the live data source.
        </Text>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={isSimulating ? stopSimulation : startSimulation}
          >
            <Text style={styles.primaryText}>
              {isSimulating ? "Stop Sim" : "Start Sim"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={reset}>
            <Text style={styles.secondaryText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#eee8dc",
  },
  app: {
    flex: 1,
    padding: 16,
    gap: 14,
  },
  topbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: "#6e6a62",
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    lineHeight: 25,
    letterSpacing: -1.5,
    fontWeight: "800",
    color: "#151515",
  },
  statusPill: {
    borderWidth: 1,
    borderColor: "rgba(20,20,20,0.18)",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 11,
    backgroundColor: "rgba(255,255,255,0.36)",
  },
  statusText: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#151515",
  },
  card: {
    borderWidth: 1,
    borderColor: "rgba(20,20,20,0.18)",
    borderRadius: 28,
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.58)",
  },
  stateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 14,
  },
  stateLabel: {
    fontSize: 42,
    lineHeight: 39,
    letterSpacing: -2.8,
    fontWeight: "900",
    color: "#151515",
  },
  meta: {
    alignItems: "flex-end",
  },
  metaMuted: {
    color: "#6e6a62",
    fontSize: 12,
  },
  metaStrong: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151515",
  },
  chart: {
    overflow: "hidden",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(20,20,20,0.18)",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  metrics: {
    flexDirection: "row",
    gap: 9,
  },
  metric: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(20,20,20,0.18)",
    borderRadius: 18,
    padding: 13,
    backgroundColor: "rgba(255,255,255,0.32)",
  },
  metricLabel: {
    color: "#6e6a62",
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -1,
  },
  controlsCard: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(20,20,20,0.18)",
    borderRadius: 22,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.32)",
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    color: "#6e6a62",
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: 7,
  },
  input: {
    minHeight: 44,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(20,20,20,0.18)",
    paddingHorizontal: 13,
    fontSize: 16,
  },
  modeButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(20,20,20,0.18)",
    padding: 10,
    justifyContent: "center",
  },
  modeLabel: {
    color: "#6e6a62",
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  modeValue: {
    fontSize: 16,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  note: {
    color: "#6e6a62",
    fontSize: 13,
    lineHeight: 19,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
    marginTop: "auto",
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: "#171717",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: "#f5f1e8",
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(20,20,20,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    color: "#151515",
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
});
