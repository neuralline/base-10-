import { cyre } from "cyre";

// Types
interface Timer {
  id: string;
  hours: number;
  minutes: number;
  startTime: number;
  remaining: number;
}

interface Alarm {
  id: string;
  hours: number;
  minutes: number;
  active: boolean;
}

// Constants
const SECOND = 1000;
const NEW_MINUTE = SECOND * 100;
const NEW_HOUR = NEW_MINUTE * 100;
const DAY = 24 * 60 * 60 * 1000;
const DECIMAL_HOURS_PER_DAY = 8.64;

// Initialize Cyre actions
cyre.action([
  {
    id: "clock-tick",
    interval: 16,
    repeat: "infinite",
    detectChanges: false,
  },
  {
    id: "timer-check",
    interval: 100,
    repeat: "infinite",
    detectChanges: false,
  },
  {
    id: "alarm-check",
    interval: 1000,
    repeat: "infinite",
    detectChanges: false,
  },
]);

// State management
cyre.action({
  id: "app-state",
  payload: {
    timers: [] as Timer[],
    alarms: [] as Alarm[],
    lastTick: Date.now(),
  },
});

// Utility functions
export const toDecimalTime = (
  date: Date
): { hours: number; minutes: number; seconds: number; millis: number } => {
  const totalMillis =
    date.getHours() * 3600000 +
    date.getMinutes() * 60000 +
    date.getSeconds() * 1000 +
    date.getMilliseconds();
  const decimalMillis = (totalMillis / DAY) * (DECIMAL_HOURS_PER_DAY * 10000);

  const hours = Math.floor(decimalMillis / 10000);
  const minutes = Math.floor((decimalMillis % 10000) / 100);
  const seconds = Math.floor((decimalMillis % 100) / 1);
  const millis = Math.floor((decimalMillis % 1) * 1000);

  return { hours, minutes, seconds, millis };
};

export const formatTime = (
  hours: number,
  minutes: number,
  seconds: number,
  millis: number
): string => {
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${millis
    .toString()
    .padStart(3, "0")}`;
};

// Clock tick handler
cyre.on("clock-tick", () => {
  const now = Date.now();
  const decimalTime = toDecimalTime(new Date(now));

  // Update DOM elements
  document.getElementById("hours")!.textContent = decimalTime.hours
    .toString()
    .padStart(2, "0");
  document.getElementById("minutes")!.textContent = decimalTime.minutes
    .toString()
    .padStart(2, "0");
  document.getElementById("seconds")!.textContent = decimalTime.seconds
    .toString()
    .padStart(2, "0");
  document.getElementById("millis")!.textContent = decimalTime.millis
    .toString()
    .padStart(3, "0");

  // Update standard time
  const standardTime = new Date(now);
  document.getElementById(
    "standard-time"
  )!.textContent = `Standard Time: ${standardTime.toLocaleTimeString()}`;

  // Update day progress
  const dayProgress = (now % DAY) / DAY;
  document.getElementById("day-progress")!.style.width = `${
    dayProgress * 100
  }%`;
  document.getElementById("decimal-hour")!.textContent = `${(
    dayProgress * DECIMAL_HOURS_PER_DAY
  ).toFixed(2)} / ${DECIMAL_HOURS_PER_DAY}`;
  document.getElementById("day-percentage")!.textContent = `${(
    dayProgress * 100
  ).toFixed(2)}%`;
});

// Timer management
export const addTimer = (hours: number, minutes: number): void => {
  const timer: Timer = {
    id: Date.now().toString(),
    hours,
    minutes,
    startTime: Date.now(),
    remaining: (hours * 100 + minutes) * NEW_MINUTE,
  };

  cyre.action({
    id: "app-state",
    payload: (state: { timers: Timer[] }) => ({
      timers: [...state.timers, timer],
    }),
  });

  updateTimerList();
};

export const removeTimer = (id: string): void => {
  cyre.action({
    id: "app-state",
    payload: (state: { timers: Timer[] }) => ({
      timers: state.timers.filter((t) => t.id !== id),
    }),
  });

  updateTimerList();
};

const updateTimerList = (): void => {
  const timerList = document.getElementById("active-timers")!;
  const state = cyre.getState("app-state");

  timerList.innerHTML = state.timers
    .map(
      (timer) => `
    <div class="list-item">
      <span>${timer.hours}:${timer.minutes.toString().padStart(2, "0")}</span>
      <button class="btn" onclick="removeTimer('${timer.id}')">Stop</button>
    </div>
  `
    )
    .join("");
};

// Timer check handler
cyre.on("timer-check", () => {
  const now = Date.now();
  const state = cyre.getState("app-state");

  state.timers = state.timers.filter((timer) => {
    const elapsed = now - timer.startTime;
    const remaining = timer.remaining - elapsed;

    if (remaining <= 0) {
      new Audio(
        "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
      ).play();
      return false;
    }

    return true;
  });

  updateTimerList();
});

// Alarm management
export const addAlarm = (hours: number, minutes: number): void => {
  const alarm: Alarm = {
    id: Date.now().toString(),
    hours,
    minutes,
    active: true,
  };

  cyre.action({
    id: "app-state",
    payload: (state: { alarms: Alarm[] }) => ({
      alarms: [...state.alarms, alarm],
    }),
  });

  updateAlarmList();
};

export const removeAlarm = (id: string): void => {
  cyre.action({
    id: "app-state",
    payload: (state: { alarms: Alarm[] }) => ({
      alarms: state.alarms.filter((a) => a.id !== id),
    }),
  });

  updateAlarmList();
};

const updateAlarmList = (): void => {
  const alarmList = document.getElementById("alarm-list")!;
  const state = cyre.getState("app-state");

  alarmList.innerHTML = state.alarms
    .map(
      (alarm) => `
    <div class="list-item">
      <span>${alarm.hours}:${alarm.minutes.toString().padStart(2, "0")}</span>
      <button class="btn" onclick="removeAlarm('${alarm.id}')">Remove</button>
    </div>
  `
    )
    .join("");
};

// Alarm check handler
cyre.on("alarm-check", () => {
  const now = new Date();
  const decimalTime = toDecimalTime(now);
  const state = cyre.getState("app-state");

  state.alarms.forEach((alarm) => {
    if (
      alarm.active &&
      alarm.hours === decimalTime.hours &&
      alarm.minutes === decimalTime.minutes &&
      decimalTime.seconds === 0
    ) {
      new Audio(
        "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
      ).play();
    }
  });
});

// Event listeners
document.getElementById("start-timer")!.addEventListener("click", () => {
  const hours =
    parseInt(
      (document.getElementById("timer-hours") as HTMLInputElement).value
    ) || 0;
  const minutes =
    parseInt(
      (document.getElementById("timer-minutes") as HTMLInputElement).value
    ) || 0;

  if (hours >= 0 && hours <= 8 && minutes >= 0 && minutes < 100) {
    addTimer(hours, minutes);
  }
});

document.getElementById("set-alarm")!.addEventListener("click", () => {
  const hours =
    parseInt(
      (document.getElementById("alarm-hours") as HTMLInputElement).value
    ) || 0;
  const minutes =
    parseInt(
      (document.getElementById("alarm-minutes") as HTMLInputElement).value
    ) || 0;

  if (hours >= 0 && hours <= 8 && minutes >= 0 && minutes < 100) {
    addAlarm(hours, minutes);
  }
});
