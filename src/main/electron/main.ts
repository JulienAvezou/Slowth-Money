import { join } from "node:path";
import { app, BrowserWindow, dialog, shell } from "electron";
import { openDatabase } from "../../data/database/openDatabase";
import { ProfileCipher } from "../../data/encryption/profileCipher";
import { ElectronKeyStore } from "../../data/encryption/electronKeyStore";
import { EncryptedRecordRepository } from "../../data/repositories/encryptedRecordRepository";
import { PublicProductRepository } from "../../data/repositories/publicProductRepository";
import { RefreshStateRepository } from "../../data/repositories/refreshStateRepository";
import { registerIpc } from "../ipc/registerIpc";
import { AppService } from "../services/appService";

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    title: "Slowth Money",
    backgroundColor: "#f4f1e8",
    webPreferences: {
      preload: join(__dirname, "../preload/preload.js"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.on("ready-to-show", () => mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });
  if (process.env.ELECTRON_RENDERER_URL) void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
}

void app.whenReady().then(() => {
  try {
    app.setName("Slowth Money");
    const userData = app.getPath("userData");
    const database = openDatabase(join(userData, "slowth-money.db"));
    const encryptedRecordCount = database
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM private_records) +
          (SELECT COUNT(*) FROM goal_snapshots) AS count`,
      )
      .pluck()
      .get() as number;
    const key = new ElectronKeyStore(join(userData, "slowth-money.key")).getOrCreateKey({
      allowReplacementIfUnreadable: encryptedRecordCount === 0,
    });
    const records = new EncryptedRecordRepository(database, new ProfileCipher(key));
    const service = new AppService(
      records,
      new PublicProductRepository(database),
      new RefreshStateRepository(database),
      () => mainWindow,
    );
    registerIpc(service);
    createWindow();
    void service.refreshStaleData();
    const freshnessTimer = setInterval(() => void service.refreshStaleData(), 60 * 60 * 1000);
    freshnessTimer.unref();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown startup error occurred.";
    dialog.showErrorBox(
      "Slowth Money could not open its secure local data",
      `${message}\n\nNo encrypted data was deleted. See the terminal or README troubleshooting section for recovery steps.`,
    );
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
