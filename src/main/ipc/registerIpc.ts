import { ipcMain } from "electron";
import type { AppService } from "../services/appService";
import type { AppSettings } from "../../shared/schemas/settings";
import type { FinancialProfile, Goal } from "../../shared/types/domain";
import type { AdvisorMessage } from "../../ai/schemas/advisor";

export function registerIpc(service: AppService): void {
  ipcMain.handle("state:load", () => service.loadState());
  ipcMain.handle("profile:save", (_event, profile: FinancialProfile) =>
    service.saveProfile(profile),
  );
  ipcMain.handle("goal:save", (_event, goal: Goal) => service.saveGoal(goal));
  ipcMain.handle("settings:save", (_event, settings: AppSettings) =>
    service.saveSettings(settings),
  );
  ipcMain.handle("ollama:status", () => service.ollama().status());
  ipcMain.handle("ollama:profile-patch", (_event, instruction: string) =>
    service.proposeProfilePatch(instruction),
  );
  ipcMain.handle("ollama:financial-advisor", (_event, messages: AdvisorMessage[]) =>
    service.askFinancialAdvisor(messages),
  );
  ipcMain.handle("public-data:refresh-products", () => service.refreshProducts());
  ipcMain.handle("public-data:refresh-now", () => service.refreshPublicDataNow());
  ipcMain.handle("profile:export", () => service.exportProfile());
  ipcMain.handle("profile:import", () => service.importProfile());
  ipcMain.handle("data:delete-all", () => service.deleteAllData());
  ipcMain.handle("notification:demo", (_event, kind: "OPPORTUNITY" | "PROMOTION" | "MILESTONE") =>
    service.showDemoNotification(kind),
  );
}
