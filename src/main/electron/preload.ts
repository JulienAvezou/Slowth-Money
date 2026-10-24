import { contextBridge, ipcRenderer } from "electron";
import type { AppSettings } from "../../shared/schemas/settings";
import type { AdvisorMessage } from "../../ai/schemas/advisor";
import type { FinancialProfile, Goal } from "../../shared/types/domain";
import type { SlowthApi } from "../../shared/types/ipc";

const api: SlowthApi = {
  loadState: () => ipcRenderer.invoke("state:load"),
  saveProfile: (profile: FinancialProfile) => ipcRenderer.invoke("profile:save", profile),
  saveGoal: (goal: Goal) => ipcRenderer.invoke("goal:save", goal),
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke("settings:save", settings),
  ollamaStatus: () => ipcRenderer.invoke("ollama:status"),
  proposeProfilePatch: (instruction: string) =>
    ipcRenderer.invoke("ollama:profile-patch", instruction),
  askFinancialAdvisor: (messages: AdvisorMessage[]) =>
    ipcRenderer.invoke("ollama:financial-advisor", messages),
  refreshProducts: () => ipcRenderer.invoke("public-data:refresh-products"),
  refreshPublicDataNow: () => ipcRenderer.invoke("public-data:refresh-now"),
  exportProfile: () => ipcRenderer.invoke("profile:export"),
  importProfile: () => ipcRenderer.invoke("profile:import"),
  deleteAllData: () => ipcRenderer.invoke("data:delete-all"),
  showDemoNotification: (kind) => ipcRenderer.invoke("notification:demo", kind),
};

contextBridge.exposeInMainWorld("slowth", api);
