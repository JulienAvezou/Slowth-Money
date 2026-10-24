import { _electron as electron, expect, test } from "@playwright/test";

test("demo opportunity appears and respects the visible threshold", async ({
  browserName,
}, testInfo) => {
  const application = await electron.launch({
    args: [".", `--user-data-dir=${testInfo.outputPath(`electron-profile-${browserName}`)}`],
  });
  try {
    const page = await application.firstWindow();
    await expect(page.getByText("Demo mode", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "+$250 opportunity" }).click();
    await page.getByRole("button", { name: "Opportunities" }).click();
    await expect(page.getByText("One possible improvement")).toBeVisible();
    await expect(page.getByText("Above your threshold")).toBeVisible();
    await expect(page.getByText("+$250", { exact: true })).toBeVisible();
  } finally {
    await application.close();
  }
});

test("Ask Slowth opens as a general local planning conversation", async ({
  browserName,
}, testInfo) => {
  const application = await electron.launch({
    args: [".", `--user-data-dir=${testInfo.outputPath(`electron-profile-${browserName}`)}`],
  });
  try {
    const page = await application.firstWindow();
    await page.getByRole("button", { name: "Ask Slowth" }).click();
    await expect(page.getByRole("heading", { name: "Ask Slowth" })).toBeVisible();
    await expect(page.getByText("What would you like to work through?")).toBeVisible();
    await expect(page.getByText("No saved personal profile is active.")).toBeVisible();
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByRole("button", { name: "Refresh offers with SerpApi" })).toBeDisabled();
  } finally {
    await application.close();
  }
});
