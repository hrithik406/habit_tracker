"use client";
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  ReactNode,
  ReactElement,
} from "react";
import type {
  AppState,
  CompleteHabitResponse,
  CreateHabitForm,
  Habit,
  LastReward,
  ToggleMilestoneResponse,
  User,
} from "../types/types";
import { getDateIsoInTimeZone } from "../utils/date";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

// ── Typed fetch helper ────────────────────────────────────────────
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? `Request failed: ${res.status}`);
  return json as T;
}

// ── API calls — direct to Express backend ─────────────────────────
const api = {
  getHabits(userId: string): Promise<{ habits: Habit[] }> {
    return apiFetch(`/habits?userId=${encodeURIComponent(userId)}`);
  },

  getUser(userId: string): Promise<{ user: User }> {
    return apiFetch(`/users/${encodeURIComponent(userId)}`);
  },

  updateTimezone(userId: string, timezone: string): Promise<{ user: User }> {
    return apiFetch(`/users/${encodeURIComponent(userId)}/timezone`, {
      method: "PUT",
      body: JSON.stringify({ timezone }),
    });
  },

  createHabit(form: CreateHabitForm, userId: string): Promise<{ habit: Habit }> {
    return apiFetch("/habits", {
      method: "POST",
      body: JSON.stringify({ userId, ...form }),
    });
  },

  completeHabit(habitId: string, userId: string, timeZone = "UTC"): Promise<CompleteHabitResponse> {
    const clientDate = getDateIsoInTimeZone(timeZone);
    return apiFetch(`/habits/${habitId}/complete`, {
      method: "POST",
      body: JSON.stringify({ userId, clientDate }),
    });
  },

  toggleMilestone(
    habitId: string,
    milestoneId: string,
    userId: string,
  ): Promise<ToggleMilestoneResponse> {
    return apiFetch(`/habits/${habitId}/milestone/${milestoneId}`, {
      method: "PUT",
      body: JSON.stringify({ userId }),
    });
  },

  deleteHabit(habitId: string, userId: string): Promise<void> {
    return apiFetch(`/habits/${habitId}?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
  },
};

// ── Reducer ───────────────────────────────────────────────────────
type Action =
  | { type: "SET_LOADING";     payload: boolean }
  | { type: "SET_ERROR";       payload: string | null }
  | { type: "SET_USER";        payload: User }
  | { type: "SET_HABITS";      payload: Habit[] }
  | { type: "UPDATE_HABIT";    payload: Habit }
  | { type: "ADD_HABIT";       payload: Habit }
  | { type: "REMOVE_HABIT";    payload: string }
  | { type: "SET_LAST_REWARD"; payload: LastReward }
  | { type: "CLEAR_REWARD" };

const initialState: AppState = {
  user:       null,
  habits:     [],
  loading:    false,
  error:      null,
  lastReward: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "SET_USER":
      return { ...state, user: action.payload };
    case "SET_HABITS":
      return { ...state, habits: action.payload };
    case "UPDATE_HABIT":
      return {
        ...state,
        habits: state.habits.map((h) =>
          h._id === action.payload._id ? action.payload : h,
        ),
      };
    case "ADD_HABIT":
      return { ...state, habits: [...state.habits, action.payload] };
    case "REMOVE_HABIT":
      return { ...state, habits: state.habits.filter((h) => h._id !== action.payload) };
    case "SET_LAST_REWARD":
      return { ...state, lastReward: action.payload };
    case "CLEAR_REWARD":
      return { ...state, lastReward: null };
    default:
      return state;
  }
}

// ── Context shape ─────────────────────────────────────────────────
interface AppContextValue extends AppState {
  userId: string;
  fetchHabits:     ()                                      => Promise<void>;
  completeHabit:   (habitId: string)                       => Promise<CompleteHabitResponse>;
  createHabit:     (form: CreateHabitForm)                 => Promise<Habit>;
  toggleMilestone: (habitId: string, milestoneId: string)  => Promise<ToggleMilestoneResponse>;
  deleteHabit:     (habitId: string)                       => Promise<void>;
  clearReward:     ()                                      => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────
interface AppProviderProps {
  children: ReactNode;
  userId: string;
}

export function AppProvider({ children, userId }: AppProviderProps): ReactElement {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load user once on mount
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    api
      .updateTimezone(userId, timezone)
      .then(({ user }) => dispatch({ type: "SET_USER", payload: user }))
      .catch(() => {
        api
          .getUser(userId)
          .then(({ user }) => dispatch({ type: "SET_USER", payload: user }))
          .catch(() => {});
      });
  }, [userId]);

  // ── fetchHabits ───────────────────────────────────────────────
  const fetchHabits = useCallback(async (): Promise<void> => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const { habits } = await api.getHabits(userId);
      dispatch({ type: "SET_HABITS", payload: habits });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        payload: err instanceof Error ? err.message : "Failed to load habits",
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [userId]);

  // ── completeHabit ─────────────────────────────────────────────
  const completeHabit = useCallback(
    async (habitId: string): Promise<CompleteHabitResponse> => {
      const timeZone = state.user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
      const data = await api.completeHabit(habitId, userId, timeZone).catch((err) => {
        throw new Error(err instanceof Error ? err.message : "Could not complete habit");
      });
      dispatch({ type: "UPDATE_HABIT",    payload: data.habit });
      dispatch({ type: "SET_USER",        payload: data.user });
      dispatch({
        type: "SET_LAST_REWARD",
        payload: { ...data.rewards, ...data.levelResult, ...data.streakResult },
      });
      return data;
    },
    [userId, state.user?.timezone],
  );

  // ── createHabit ───────────────────────────────────────────────
  const createHabit = useCallback(
    async (form: CreateHabitForm): Promise<Habit> => {
      const { habit } = await api.createHabit(form, userId).catch((err) => {
        throw new Error(err instanceof Error ? err.message : "Failed to create habit");
      });
      dispatch({ type: "ADD_HABIT", payload: habit });
      return habit;
    },
    [userId],
  );

  // ── toggleMilestone ───────────────────────────────────────────
  const toggleMilestone = useCallback(
    async (habitId: string, milestoneId: string): Promise<ToggleMilestoneResponse> => {
      const data = await api
        .toggleMilestone(habitId, milestoneId, userId)
        .catch((err) => {
          throw new Error(
            err instanceof Error ? err.message : "Failed to toggle milestone",
          );
        });
      dispatch({ type: "UPDATE_HABIT", payload: data.habit });
      if (data.completion) {
        dispatch({ type: "SET_USER",        payload: data.completion.user });
        dispatch({
          type: "SET_LAST_REWARD",
          payload: {
            ...data.completion.rewards,
            ...data.completion.levelResult,
            ...data.completion.streakResult,
          },
        });
      }
      return data;
    },
    [userId],
  );

  // ── deleteHabit ───────────────────────────────────────────────
  const deleteHabit = useCallback(
    async (habitId: string): Promise<void> => {
      await api.deleteHabit(habitId, userId).catch((err) => {
        throw new Error(err instanceof Error ? err.message : "Failed to delete habit");
      });
      dispatch({ type: "REMOVE_HABIT", payload: habitId });
    },
    [userId],
  );

  const clearReward = useCallback(
    () => dispatch({ type: "CLEAR_REWARD" }),
    [],
  );

  return (
    <AppContext.Provider
      value={{
        ...state,
        userId,
        fetchHabits,
        completeHabit,
        createHabit,
        toggleMilestone,
        deleteHabit,
        clearReward,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}