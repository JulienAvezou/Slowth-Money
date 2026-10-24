import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, type AppSettings } from "../../../shared/schemas/settings";
import type { ManualPublicDataRefreshResult } from "../../../shared/types/ipc";
import { Card, Field, PageHeader, StatusPill } from "../components/Common";

export function SettingsScreen({
  initial,
  demo,
  onExitDemo,
  onDeleted,
  onPublicDataRefresh,
}: {
  initial: Omit<AppSettings, "serpApiKey"> & { hasSerpApiKey: boolean };
  demo: boolean;
  onExitDemo: () => void;
  onDeleted: () => void;
  onPublicDataRefresh: () => Promise<ManualPublicDataRefreshResult>;
}) {
  const [settings, setSettings] = useState<AppSettings>({
    ...DEFAULT_SETTINGS,
    ...initial,
    serpApiKey: "",
  });
  const [status, setStatus] = useState<{
    connected: boolean;
    modelAvailable: boolean;
    model: string;
    message: string;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [hasStoredSerpApiKey, setHasStoredSerpApiKey] = useState(initial.hasSerpApiKey);
  const [refreshingPublicData, setRefreshingPublicData] = useState(false);
  const [publicDataMessage, setPublicDataMessage] = useState("");
  useEffect(() => {
    void window.slowth.ollamaStatus().then(setStatus);
  }, []);
  const save = async () => {
    try {
      await window.slowth.saveSettings(settings);
      setHasStoredSerpApiKey(initial.hasSerpApiKey || settings.serpApiKey.trim().length > 0);
      setMessage("Settings saved securely.");
      setStatus(await window.slowth.ollamaStatus());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save settings.");
    }
  };
  const refreshPublicData = async () => {
    setRefreshingPublicData(true);
    setPublicDataMessage("Checking SerpApi, then refreshing official provider pages…");
    try {
      const result = await onPublicDataRefresh();
      setPublicDataMessage(
        `SerpApi connected: ${result.discoveryResultCount} public result${result.discoveryResultCount === 1 ? "" : "s"}. Official product refresh ${result.productStatus.toLowerCase()}: ${result.productCount} product${result.productCount === 1 ? "" : "s"}, ${result.providerFailures} provider failure${result.providerFailures === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      setPublicDataMessage(
        error instanceof Error ? error.message : "The public-data refresh could not complete.",
      );
    } finally {
      setRefreshingPublicData(false);
    }
  };
  const remove = async () => {
    if (
      !confirm(
        "Delete all encrypted profile, goal, settings, recommendations, and local activity? This cannot be undone.",
      )
    )
      return;
    await window.slowth.deleteAllData();
    onDeleted();
  };
  return (
    <>
      <PageHeader
        eyebrow="Slowth Money"
        title="Settings"
        description="Local AI, privacy, notifications, and demo controls."
        action={
          <button className="primary" onClick={() => void save()}>
            Save settings
          </button>
        }
      />
      <div className="two-column">
        <Card>
          <div className="card-top">
            <div>
              <p className="eyebrow">Local AI</p>
              <h2>Gemma through Ollama</h2>
            </div>
            <StatusPill tone={status?.modelAvailable ? "good" : "warm"}>
              {status?.modelAvailable ? "Ready" : "Setup needed"}
            </StatusPill>
          </div>
          <p>{status?.message ?? "Checking Ollama…"}</p>
          <div className="form-grid">
            <Field label="Ollama base URL" hint="Loopback URLs only">
              <input
                value={settings.ollamaBaseUrl}
                onChange={(e) => setSettings({ ...settings, ollamaBaseUrl: e.target.value })}
              />
            </Field>
            <Field label="Model">
              <input
                value={settings.ollamaModel}
                onChange={(e) => setSettings({ ...settings, ollamaModel: e.target.value })}
              />
            </Field>
          </div>
        </Card>
        <Card>
          <p className="eyebrow">Public discovery</p>
          <h2>SerpApi</h2>
          <p>
            {hasStoredSerpApiKey
              ? "A key is stored with encrypted private settings."
              : "No API key is configured. Official provider adapters can still refresh directly."}
          </p>
          <Field
            label="Replace API key"
            hint="Stored encrypted. Leave blank to keep the current key."
          >
            <input
              type="password"
              value={settings.serpApiKey}
              placeholder={hasStoredSerpApiKey ? "••••••••••••" : "Enter SerpApi key"}
              onChange={(e) => setSettings({ ...settings, serpApiKey: e.target.value })}
            />
          </Field>
        </Card>
        <Card>
          <p className="eyebrow">Notifications</p>
          <h2>Only when meaningful</h2>
          <div className="checkbox-list">
            {Object.entries(settings.notifications).map(([key, value]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, [key]: e.target.checked },
                    })
                  }
                />
                {key.replaceAll(/([A-Z])/g, " $1").toLowerCase()}
              </label>
            ))}
          </div>
        </Card>
        <Card>
          <p className="eyebrow">Local data</p>
          <h2>You stay in control</h2>
          <p>
            Exports are unencrypted JSON and contain sensitive financial information. Store them
            securely.
          </p>
          <div className="button-row">
            <button onClick={() => void window.slowth.exportProfile()}>Export profile</button>
            <button onClick={() => void window.slowth.importProfile()}>Import profile</button>
          </div>
          <button className="danger" onClick={() => void remove()}>
            Delete all my local data
          </button>
        </Card>
        <Card className="wide">
          <p className="eyebrow">Demo lab</p>
          <h2>{demo ? "Demo mode is active" : "Reliable presentation controls"}</h2>
          <p>
            Fixture scenarios stay separate from your encrypted profile and are clearly labelled.
          </p>
          <div className="button-row">
            {demo && <button onClick={onExitDemo}>Use my own data</button>}
            <button onClick={() => void window.slowth.showDemoNotification("OPPORTUNITY")}>
              Test opportunity alert
            </button>
            <button onClick={() => void window.slowth.showDemoNotification("PROMOTION")}>
              Test expiry alert
            </button>
            <button onClick={() => void window.slowth.showDemoNotification("MILESTONE")}>
              Test milestone alert
            </button>
            <button
              onClick={() => void refreshPublicData()}
              disabled={!hasStoredSerpApiKey || refreshingPublicData}
            >
              {refreshingPublicData ? "Refreshing public data…" : "Refresh offers with SerpApi"}
            </button>
          </div>
          {!hasStoredSerpApiKey && (
            <p className="subtle">Save a SerpApi key above to enable the manual refresh.</p>
          )}
          <p className="subtle">
            Uses one generic public SerpApi search, then checks official provider pages. No profile
            values are included in the search query.
          </p>
          {publicDataMessage && <p className="form-message">{publicDataMessage}</p>}
        </Card>
        <Card className="wide disclaimer">
          <strong>Educational planning, not financial advice.</strong>
          <p>
            Slowth Money does not execute transactions, open accounts, or guarantee outcomes. Verify
            eligibility, rates, limits, and product terms with authoritative sources before acting.
          </p>
        </Card>
        {message && <p className="form-message">{message}</p>}
      </div>
    </>
  );
}
