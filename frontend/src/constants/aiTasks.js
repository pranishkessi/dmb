// src/constants/aiTasks.js
import tasks from "../config/ai_tasks.json";

export const AI_TASKS = tasks;

export const AI_TASK_THRESHOLDS = AI_TASKS.map((task) => task.threshold);

export const LEVEL6_WARNING_DELAY_MS = 25000;

export const LEVEL6_WARNING_TEXT =
  "Du machst weiter? Respekt!\nNur noch 1 Stunde treten, und ein 5 Sekunden Video ist mit KI erstellt.\nABER\ngib mal anderen eine Chance (:";
