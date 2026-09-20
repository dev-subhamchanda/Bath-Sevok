import { create } from "zustand";
import type { WeatherSnapshot } from "@/types/domain";

interface WeatherState {
  weather: WeatherSnapshot[];
  setWeather: (weather: WeatherSnapshot[]) => void;
  applyPatch: (weather: WeatherSnapshot[]) => void;
}

export const useWeatherStore = create<WeatherState>((set) => ({
  weather: [],
  setWeather: (weather) => set({ weather }),
  applyPatch: (weather) => set({ weather })
}));
