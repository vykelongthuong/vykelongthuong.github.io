import { dom } from "../ui/dom.js";
import { state } from "../state.js";

export function startTimer() {
  stopTimer();
  state.startTime = Date.now();
  dom.timerDisplay.textContent = "Thời gian: 00:00.0";
  dom.timerDisplay.classList.remove("hidden");
  state.timerInterval = setInterval(updateTimer, 100);
}

export function updateTimer() {
  const elapsedTime = Date.now() - state.startTime;
  const totalSeconds = Math.floor(elapsedTime / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  const milliseconds = String(Math.floor((elapsedTime % 1000) / 100)).slice(
    0,
    1
  );
  dom.timerDisplay.textContent = `Thời gian: ${minutes}:${seconds}.${milliseconds}`;
}

export function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}
