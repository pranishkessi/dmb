// src/components/DashboardLayout.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Grid,
  Text,
  Image,
  Flex,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
} from "@chakra-ui/react";

import SpeedometerChart from "./SpeedometerChart";
import AITaskImageGrid from "./AITaskImageGrid";
import AvatarDisplay from "./AvatarDisplay";
import { useAvatarMessages } from "../hooks/useAvatarMessages";

import useIdleTimer from "../hooks/useIdleTimer";
import ScreensaverOverlay from "./ScreensaverOverlay";
import InstructionContent from "./InstructionContent";
import {
  AI_TASKS,
  LEVEL6_WARNING_DELAY_MS,
  LEVEL6_WARNING_TEXT,
} from "../constants/aiTasks";
import { THEME_COLORS } from "../constants/themeColors";

const ACTIVE_TASKS = AI_TASKS;

const DESIGN_WIDTH = 1600;
const DESIGN_HEIGHT = 900;

function DashboardLayout({ metrics, onStart, onStop, sessionActive }) {
  const energy = metrics?.energy_kwh ?? 0;
  const power = metrics?.power_watts ?? 0;
  const stroke = metrics?.stroke_rate ?? 0;
  const distance = metrics?.distance_meters ?? 0;
  const time = metrics?.elapsed_time ?? 0;
  const isConnected = metrics?.connected === true;

  const [canvasScale, setCanvasScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const scaleX = window.innerWidth / DESIGN_WIDTH;
      const scaleY = window.innerHeight / DESIGN_HEIGHT;
      setCanvasScale(Math.min(scaleX, scaleY));
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const TASK_THRESHOLDS = ACTIVE_TASKS.map((task) => task.threshold);
  const FINAL_UNLOCK_DELAY_MS = 2500;
  const IDLE_LIMIT_SEC = 60;
  const WARNING_BEFORE_END_SEC = 10;
  const SESSION_START_GRACE_SEC = 5;
  const MIN_ACTIVE_POWER = 3;

  const level5Threshold = ACTIVE_TASKS[4]?.threshold ?? Infinity;
  const level6Threshold = ACTIVE_TASKS[5]?.threshold ?? Infinity;

   const unlockedTasks = ACTIVE_TASKS.map((task) => ({
    label: task.label,
    shortLabel: task.shortLabel,
    threshold: task.threshold,
  }));

  const { message } = useAvatarMessages({
    energy,
    elapsedTime: time,
    sessionActive,
    unlockedTasks,
  });

  const welcomeMessage = {
    kind: "info",
    text:
      "Willkommen!\nDrück den grünen Startknopf und los gehts. Tritt in die Pedale und lass dich überraschen.",
  };

  const [overrideMessage, setOverrideMessage] = useState(null);

  const allUnlockedRef = useRef(false);
  const finalUnlockTimerRef = useRef(null);

  const level6WarningTimerRef = useRef(null);
  const hasScheduledLevel6WarningRef = useRef(false);
  const hasShownLevel6WarningRef = useRef(false);

  const lastActiveRef = useRef(Date.now());
  const idleTickerRef = useRef(null);
  const infoTimeoutRef = useRef(null);

  const onStopRef = useRef(onStop);
  useEffect(() => {
    onStopRef.current = onStop;
  }, [onStop]);

  const [, setIdleSeconds] = useState(0);
  const [idleCountdown, setIdleCountdown] = useState(null);

  useEffect(() => {
    if (sessionActive) {
      lastActiveRef.current = Date.now();
      setIdleSeconds(0);
      setIdleCountdown(null);
      setOverrideMessage(null);

      hasScheduledLevel6WarningRef.current = false;
      hasShownLevel6WarningRef.current = false;
      clearTimeout(level6WarningTimerRef.current);

      clearTimeout(infoTimeoutRef.current);
      setOverrideMessage({ kind: "info", text: "Sitzung gestartet — los geht’s 🚴" });
      infoTimeoutRef.current = setTimeout(() => setOverrideMessage(null), 1500);
    }

    return () => clearTimeout(infoTimeoutRef.current);
  }, [sessionActive]);

  useEffect(() => {
    if (!sessionActive) return;

    const isActiveNow = (power ?? 0) > MIN_ACTIVE_POWER || (stroke ?? 0) > 0;
    if (isActiveNow) {
      lastActiveRef.current = Date.now();

      if (
        idleCountdown !== null ||
        (overrideMessage?.kind === "warning" && overrideMessage?.source === "idle")
      ) {
        setIdleCountdown(null);
        setOverrideMessage({
          kind: "info",
          text: "Toll! Countdown abgebrochen — weiter geht’s",
        });
        clearTimeout(infoTimeoutRef.current);
        infoTimeoutRef.current = setTimeout(() => setOverrideMessage(null), 2000);
      }
    }
  }, [power, stroke, sessionActive, idleCountdown, overrideMessage]);

  useEffect(() => {
    if (!sessionActive) return;

    clearInterval(idleTickerRef.current);
    idleTickerRef.current = setInterval(() => {
      const idleSec = Math.floor((Date.now() - lastActiveRef.current) / 1000);
      setIdleSeconds(idleSec);

      if (idleSec < SESSION_START_GRACE_SEC) {
        if (idleCountdown !== null) setIdleCountdown(null);
        if (overrideMessage?.kind === "warning" && overrideMessage?.source === "idle") {
          setOverrideMessage(null);
        }
        return;
      }

      const warnAt = IDLE_LIMIT_SEC - WARNING_BEFORE_END_SEC;
      if (idleSec >= warnAt && idleSec < IDLE_LIMIT_SEC) {
        const remaining = IDLE_LIMIT_SEC - idleSec;
        if (idleCountdown !== remaining) setIdleCountdown(remaining);
        setOverrideMessage({
          kind: "warning",
          source: "idle",
          text: `Bist du noch da?\nTritt weiter in die Pedale oder die Sitzung endet in ${remaining} Sekunde${remaining === 1 ? "" : "n"}…`,
        });
      } else if (idleSec >= IDLE_LIMIT_SEC) {
        setIdleCountdown(null);
        setOverrideMessage(null);
        onStopRef.current && onStopRef.current({ reason: "idle-timeout" });
      } else {
        if (idleCountdown !== null) setIdleCountdown(null);
        if (overrideMessage?.kind === "warning" && overrideMessage?.source === "idle") {
          setOverrideMessage(null);
        }
      }
    }, 1000);

    return () => clearInterval(idleTickerRef.current);
  }, [sessionActive, idleCountdown, overrideMessage]);

  useEffect(() => {
    if (!sessionActive) return;

    const level5Reached = energy >= level5Threshold;
    const level6Reached = energy >= level6Threshold;

    if (level6Reached) {
      clearTimeout(level6WarningTimerRef.current);
      return;
    }

    if (
      level5Reached &&
      !level6Reached &&
      !hasScheduledLevel6WarningRef.current &&
      !hasShownLevel6WarningRef.current
    ) {
      hasScheduledLevel6WarningRef.current = true;

      clearTimeout(level6WarningTimerRef.current);
      level6WarningTimerRef.current = setTimeout(() => {
        const stillInLevel5Window =
          sessionActive &&
          energy >= level5Threshold &&
          energy < level6Threshold &&
          !allUnlockedRef.current;

                if (stillInLevel5Window) {
          hasShownLevel6WarningRef.current = true;
          setOverrideMessage({
            kind: "warning",
            source: "level6",
            text: LEVEL6_WARNING_TEXT,
          });

          // Show the Level 6 warning only temporarily, then allow
          // normal "Wussten Sie?" messages to continue during the long final phase.
          clearTimeout(infoTimeoutRef.current);
          infoTimeoutRef.current = setTimeout(() => {
            setOverrideMessage((current) =>
              current?.source === "level6" ? null : current
            );
          }, 12000);
        }
      }, LEVEL6_WARNING_DELAY_MS);
    }
  }, [energy, sessionActive, level5Threshold, level6Threshold]);

  useEffect(() => {
    if (!sessionActive) return;

    const unlocked = TASK_THRESHOLDS.filter((t) => energy >= t).length;
    if (unlocked === TASK_THRESHOLDS.length && !allUnlockedRef.current) {
      allUnlockedRef.current = true;

      clearTimeout(level6WarningTimerRef.current);

      setOverrideMessage({
        kind: "success",
        text: "Erstaunlich! Du hast alle KI-Aufgaben freigeschaltet. Die Sitzung endet gleich automatisch.",
      });

      clearTimeout(finalUnlockTimerRef.current);
      finalUnlockTimerRef.current = setTimeout(() => {
        setOverrideMessage(null);
        onStopRef.current && onStopRef.current({ reason: "completed" });
      }, FINAL_UNLOCK_DELAY_MS);
    }
  }, [energy, sessionActive, TASK_THRESHOLDS]);

  useEffect(() => {
    if (!sessionActive) {
      allUnlockedRef.current = false;
      hasScheduledLevel6WarningRef.current = false;
      hasShownLevel6WarningRef.current = false;

      setOverrideMessage(null);
      setIdleCountdown(null);
      setIdleSeconds(0);

      clearInterval(idleTickerRef.current);
      clearTimeout(finalUnlockTimerRef.current);
      clearTimeout(infoTimeoutRef.current);
      clearTimeout(level6WarningTimerRef.current);
    }

    return () => {
      clearInterval(idleTickerRef.current);
      clearTimeout(finalUnlockTimerRef.current);
      clearTimeout(infoTimeoutRef.current);
      clearTimeout(level6WarningTimerRef.current);
    };
  }, [sessionActive]);

  const { isIdle: isUiIdle, reset: resetUiIdle } = useIdleTimer({
    timeoutMs: 10 * 60 * 1000,
    isPaused: sessionActive,
  });

  const { isOpen, onOpen, onClose } = useDisclosure();

  const displayMessage = overrideMessage || (sessionActive ? message : welcomeMessage);

  const metricItems = [
    { label: "Leistung", value: `${Math.round(power)} W` },
    { label: "Trittfrequenz", value: `${Math.round(stroke)} U/min` },
    { label: "Distanz", value: `${Math.round(distance)} m` },
    { label: "Zeit", value: formatTime(time) },
    { label: "Energie", value: `${formatKwh(energy)} kWh` },
  ];

  const logos = [
    { src: "/BMFTR_Logo2.png", alt: "BMFTR Logo" },
    { src: "/INIT_Logo.png", alt: "inIT TH OWL Logo" },
    { src: "/KI_Akademie_OWL_Logo.png", alt: "KI Akademie OWL Logo" },
    { src: "/visual.png", alt: "Deutsches Museum Bonn Logo" },
  ];

  return (
    <Box
      w="100vw"
      h="100vh"
      overflow="hidden"
      bg="#f26a1b"
      position="relative"
    >
      <Box
        position="absolute"
        left="50%"
        top="50%"
        w={`${DESIGN_WIDTH}px`}
        h={`${DESIGN_HEIGHT}px`}
        transform={`translate(-50%, -50%) scale(${canvasScale})`}
        transformOrigin="center center"
        bg="#f26a1b"
        bgImage="url('/Background_orange.png')"
        bgSize="cover"
        bgPosition="center"
        bgRepeat="no-repeat"
        overflow="hidden"
      >
              {/* Bluetooth / ergometer connection indicator */}
        <Box
          position="absolute"
          left="1470px"
          top="18px"
          w="28px"
          h="28px"
          borderRadius="full"
          bg={isConnected ? "#22c55e" : "#dc2626"}
          border="4px solid rgba(255,255,255,0.95)"
          boxShadow={
            isConnected
              ? "0 0 18px rgba(34,197,94,0.95)"
              : "0 0 18px rgba(220,38,38,0.95)"
          }
          zIndex="20"
          title={isConnected ? "Bluetooth verbunden" : "Bluetooth getrennt"}
        />
        {/* Left control buttons */}
        <Button
          position="absolute"
          left="46px"
          top="45px"
          w="152px"
          h="122px"
          onClick={onStart}
          isDisabled={sessionActive}
          bg="#38b54a"
          color="white"
          borderRadius="52px"
          fontSize="32px"
          fontWeight="900"
          letterSpacing="0.5px"
          boxShadow="0 8px 18px rgba(0,0,0,0.22)"
          border="4px solid rgba(255,255,255,0.9)"
          _hover={{ bg: "#2f9d40" }}
          _disabled={{
            opacity: 0.55,
            cursor: "not-allowed",
            _hover: { bg: "#38b54a" },
          }}
        >
          START
        </Button>

        <Button
          position="absolute"
          left="46px"
          top="195px"
          w="152px"
          h="118px"
          onClick={onOpen}
          bg="rgba(255,255,255,0.94)"
          color="#111827"
          borderRadius="52px"
          fontSize="31px"
          fontWeight="900"
          boxShadow="0 8px 18px rgba(0,0,0,0.18)"
          border="4px solid rgba(255,255,255,0.9)"
          _hover={{ bg: "#ffffff" }}
        >
          Info
        </Button>

        <Button
          position="absolute"
          left="46px"
          top="342px"
          w="152px"
          h="122px"
          onClick={() => onStop && onStop({ reason: "manual" })}
          bg="#d71920"
          color="white"
          borderRadius="52px"
          fontSize="32px"
          fontWeight="900"
          letterSpacing="0.5px"
          boxShadow="0 8px 18px rgba(0,0,0,0.22)"
          border="4px solid rgba(255,255,255,0.9)"
          _hover={{ bg: "#b9151b" }}
        >
          STOP
        </Button>

        {/* Metrics */}
        <Grid
          position="absolute"
          left="268px"
          top="48px"
          w="1110px"
          h="122px"
          templateColumns="repeat(5, 1fr)"
          gap="12px"
        >
          {metricItems.map((item) => (
            <Flex
              key={item.label}
              direction="column"
              align="center"
              justify="center"
              bg="rgba(255,255,255,0.88)"
              borderRadius="0px"
              border="0"
              boxShadow="0 4px 12px rgba(0,0,0,0.10)"
              textAlign="center"
            >
              <Text
                fontSize="29px"
                lineHeight="1.05"
                color="#111827"
                fontWeight="900"
              >
                {item.label}
              </Text>
              <Text
                mt="9px"
                fontSize="34px"
                lineHeight="1"
                color="#111827"
                fontWeight="900"
              >
                {item.value}
              </Text>
            </Flex>
          ))}
        </Grid>

                {/* Message panel */}
        <Flex
          position="absolute"
          left="288px"
          top="220px"
          w="560px"
          h="228px"
          bg="rgba(255,245,235,0.72)"
          border="2px solid #f28b3c"
          borderRadius="10px"
          boxShadow="0 4px 14px rgba(0,0,0,0.12)"
          align="center"
          justify="center"
          p="18px"
          overflow="hidden"
        >
          <AvatarDisplay message={displayMessage} />
        </Flex>

        {/* Gauge panel */}
        <Flex
          position="absolute"
          left="865px"
          top="220px"
          w="515px"
          h="228px"
          bg="rgba(255,238,222,0.88)"
          border="0"
          boxShadow="0 4px 14px rgba(0,0,0,0.12)"
          align="center"
          justify="center"
          p="10px"
          overflow="hidden"
        >
          <SpeedometerChart energy={energy} />
        </Flex>

        {/* Logos */}
        <Flex
          position="absolute"
          left="1410px"
          top="48px"
          w="155px"
          h="425px"
          direction="column"
          align="center"
          justify="space-between"
        >
          {logos.map((logo) => (
            <Flex
              key={logo.src}
              w="155px"
              h="76px"
              bg="rgba(255,255,255,0.92)"
              align="center"
              justify="center"
              p="8px"
              boxShadow="0 4px 10px rgba(0,0,0,0.12)"
            >
              <Image
                src={logo.src}
                alt={logo.alt}
                maxW="140px"
                maxH="62px"
                objectFit="contain"
              />
            </Flex>
          ))}
        </Flex>

        {/* Level cards */}
        <Box
          position="absolute"
          left="47px"
          top="508px"
          w="1510px"
          h="350px"
        >
          <AITaskImageGrid energy={energy} />
        </Box>

        <Modal isOpen={isOpen} onClose={onClose} size="6xl">
          <ModalOverlay />
          <ModalContent rounded="2xl" p={2} bg={THEME_COLORS.cardBg}>
            <ModalCloseButton />
            <ModalBody p={{ base: 4, md: 8 }}>
              <InstructionContent lang="de" />
            </ModalBody>
          </ModalContent>
        </Modal>

        <ScreensaverOverlay
          isOpen={isUiIdle}
          onDismiss={resetUiIdle}
          lang="de"
        />
      </Box>
    </Box>
  );
}

const formatTime = (s) => {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

const formatKwh = (value) => {
  return Number(value || 0).toFixed(4).replace(".", ",");
};

export default DashboardLayout;
