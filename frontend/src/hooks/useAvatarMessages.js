// src/hooks/useAvatarMessages.js
import { useState, useEffect, useRef } from "react";
import {
  UNLOCKS,
  ENERGY_BANDS,
  BAND_MESSAGES,
  getShuffledBandMessages,
} from "../constants/unlocks";

const WELCOME_MSG =
  "Willkommen!\nDrück den grünen Startknopf und los gehts. Tritt in die Pedale und lass dich überraschen.";

const SESSION_END_DISPLAY_MS = 30000;

// Controls how often "Wussten Sie?" messages can appear.
// At 160 W, 0.0007 kWh takes roughly 16 seconds, so this avoids message spam.
const MIN_SECONDS_BETWEEN_MSGS = 14;
const MIN_DELTA_ENERGY = 0.0007;

export function useAvatarMessages({
  energy = 0,
  elapsedTime = 0,
  sessionActive = false,
  unlockedTasks = [],
}) {
  const [message, setMessage] = useState({
    text: WELCOME_MSG,
    kind: "info",
  });

  const prevEnergyRef = useRef(0);
  const prevSessionActiveRef = useRef(sessionActive);
  const lastSessionEnergyRef = useRef(0);

  const revertTimerRef = useRef(null);
  const clearRevertTimer = () => {
    if (revertTimerRef.current) {
      clearTimeout(revertTimerRef.current);
      revertTimerRef.current = null;
    }
  };

  const lastMotivEnergyRef = useRef(0);
  const lastMotivAtSecRef = useRef(0);
  const bandIndexRef = useRef(0);
  const bandCursorRef = useRef({});

  const shuffledBandMessagesRef = useRef(getShuffledBandMessages());

  // Use active tasks from DashboardLayout if available, otherwise fall back.
  // DashboardLayout should pass task.label as label so unlock messages show the full reference text.
  const activeTasks =
    Array.isArray(unlockedTasks) && unlockedTasks.length > 0 ? unlockedTasks : UNLOCKS;

  const countUnlockedFromTasks = (value) =>
    activeTasks.filter((task) => Number(value) >= Number(task.threshold)).length;

  const resetBandCursors = () => {
    const cursors = {};
    Object.keys(BAND_MESSAGES).forEach((bandKey) => {
      cursors[bandKey] = 0;
    });
    bandCursorRef.current = cursors;
  };

  // -------- SESSION START/STOP --------
  useEffect(() => {
    const wasActive = prevSessionActiveRef.current;

    if (!wasActive && sessionActive) {
      clearRevertTimer();

      setMessage({
        text: "Los geht’s! Du erzeugst jetzt Energie.",
        kind: "success",
      });

      // Reset motivation state for a new session
      lastMotivEnergyRef.current = 0;
      lastMotivAtSecRef.current = 0;
      bandIndexRef.current = 0;
      resetBandCursors();

      // Shuffle messages once per new session
      shuffledBandMessagesRef.current = getShuffledBandMessages();
    }

    if (sessionActive) {
      lastSessionEnergyRef.current = energy;
    }

    if (wasActive && !sessionActive) {
      const finalEnergy = lastSessionEnergyRef.current ?? energy ?? 0;
      const unlockedCount = countUnlockedFromTasks(finalEnergy);
      const totalTasks = activeTasks.length;

      setMessage({
        text: `Session beendet. Energie: ${Number(finalEnergy)
          .toFixed(4)
          .replace(".", ",")} kWh • Aufgaben: ${unlockedCount} / ${totalTasks}`,
        kind: "info",
      });

      clearRevertTimer();
      revertTimerRef.current = setTimeout(() => {
        setMessage({ text: WELCOME_MSG, kind: "info" });
        revertTimerRef.current = null;
      }, SESSION_END_DISPLAY_MS);
    }

    prevSessionActiveRef.current = sessionActive;
  }, [sessionActive, energy, activeTasks]);

  // -------- TASK UNLOCKS --------
  useEffect(() => {
    const prevEnergy = prevEnergyRef.current;

    if (energy > prevEnergy) {
      const newlyUnlocked = activeTasks.find(
        (task) => energy >= task.threshold && prevEnergy < task.threshold
      );

      if (newlyUnlocked) {
        setMessage({
          text: newlyUnlocked.label,
          kind: "unlock",
        });

        // Avoid immediate "Wussten Sie?" message right after an unlock.
        lastMotivEnergyRef.current = energy;
        lastMotivAtSecRef.current = elapsedTime || 0;
      }
    }

    prevEnergyRef.current = energy;
  }, [energy, activeTasks, elapsedTime]);

  // -------- ENERGY-BASED MOTIVATION / DID-YOU-KNOW --------
  useEffect(() => {
    if (!sessionActive) return;

    const bandIdx = ENERGY_BANDS.findIndex((b) => energy >= b.min && energy < b.max);
    const safeBandIdx = bandIdx === -1 ? ENERGY_BANDS.length - 1 : bandIdx;
    bandIndexRef.current = safeBandIdx;

    // Throttle by time
    const sinceSec = (elapsedTime || 0) - (lastMotivAtSecRef.current || 0);
    if (sinceSec < MIN_SECONDS_BETWEEN_MSGS) return;

    // Throttle by energy increase
    const dE = energy - (lastMotivEnergyRef.current || 0);
    if (dE < MIN_DELTA_ENERGY) return;

    const pool =
      shuffledBandMessagesRef.current[safeBandIdx] ||
      BAND_MESSAGES[safeBandIdx] ||
      [];

    if (pool.length === 0) return;

    const currentCursor = bandCursorRef.current[safeBandIdx] || 0;
    const nextIdx = currentCursor % pool.length;
    const nextText = pool[nextIdx];

    setMessage({
      text: nextText,
      kind: "info",
    });

    bandCursorRef.current[safeBandIdx] = nextIdx + 1;
    lastMotivEnergyRef.current = energy;
    lastMotivAtSecRef.current = elapsedTime || 0;
  }, [energy, elapsedTime, sessionActive]);

  // Cleanup on unmount
  useEffect(() => () => clearRevertTimer(), []);

  return { message, setMessage };
}