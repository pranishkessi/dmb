// src/components/AITaskImageGrid.jsx
import React from "react";
import { HStack, VStack, Box, Text } from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { AI_TASKS } from "../constants/aiTasks";

const TASKS = AI_TASKS;

function AITaskImageGrid({ energy }) {
  const hasCelebrated = React.useRef(Array(TASKS.length).fill(false));

  const currentLevelIndex = TASKS.reduce((currentIndex, task, idx) => {
    return Number(energy) >= Number(task.threshold) ? idx : currentIndex;
  }, -1);

  React.useEffect(() => {
    TASKS.forEach((task, idx) => {
      if (energy >= task.threshold && !hasCelebrated.current[idx]) {
        hasCelebrated.current[idx] = true;
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.6 },
          scalar: 0.85,
        });
      }
    });
  }, [energy]);

  return (
    <HStack
      spacing="42px"
      w="100%"
      h="100%"
      align="stretch"
      justify="center"
    >
      {TASKS.map((task, idx) => {
        const unlocked = Number(energy) >= Number(task.threshold);
        const isCurrentLevel = idx === currentLevelIndex;

        return (
          <VStack
            key={task.id}
            w="215px"
            h="350px"
            spacing="0"
            align="center"
            justify="flex-start"
            bg={isCurrentLevel ? "rgba(255, 220, 0, 0.60)" : "rgba(255,255,255,0.72)"}
            boxShadow={
              isCurrentLevel
                ? "0 0 26px rgba(255, 220, 0, 0.60), 0 8px 18px rgba(0,0,0,0.18)"
                : "0 6px 14px rgba(0,0,0,0.14)"
            }
            border={isCurrentLevel ? "4px solid rgba(255, 240, 0, 0.60)" : "0"}
            p={isCurrentLevel ? "10px 10px 8px" : "14px 14px 12px"}
            transition="background 0.35s ease, box-shadow 0.35s ease, border 0.35s ease"
          >
            <Box
              w="168px"
              h="255px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              overflow="hidden"
              bg="transparent"
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={`${task.id}-${unlocked ? "unlocked" : "locked"}`}
                  src={unlocked ? task.unlockedImg : task.lockedImg}
                  alt={unlocked ? `${task.shortLabel} freigeschaltet` : `${task.shortLabel} gesperrt`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    background: "transparent",
                    display: "block",
                  }}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: isCurrentLevel ? 1.03 : 1 }}
                  exit={{ opacity: 0, scale: 1.04 }}
                  transition={{ duration: 0.35 }}
                />
              </AnimatePresence>
            </Box>

            <Text
              mt="18px"
              color="#111827"
              fontSize="31px"
              fontWeight="900"
              lineHeight="1"
              whiteSpace="nowrap"
              textAlign="center"
            >
              Level {idx + 1}
            </Text>
          </VStack>
        );
      })}
    </HStack>
  );
}

export default AITaskImageGrid;