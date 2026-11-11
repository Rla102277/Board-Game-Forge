import { test, expect, type Page } from "@playwright/test";
import { importReplay } from "@workspace/game-core";

async function finishGame(page: Page) {
  const gather = page.getByRole("button", { name: "Gather wood", exact: true });
  for (let i = 0; i < 48 && (await gather.isEnabled()); i++) {
    const self = page.getByRole("article", { name: "You resources" });
    const resources = await self.locator("dd").allTextContents();
    const wood = Number(resources[0]),
      gold = Number(resources[1]);
    await page
      .getByRole("button", {
        name:
          wood < 2
            ? "Gather wood"
            : gold < 1
              ? "Mine gold"
              : "Build outpost · 2 wood + 1 gold",
        exact: true,
      })
      .click();
  }
  await expect(gather).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: /wins?!|Draw:/ }),
  ).toBeVisible();
}

test("human completes a match, reloads it and exports a replay", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/play");
  await expect(
    page.getByRole("heading", { name: "Outpost Race", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Build outpost · 2 wood + 1 gold",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Gather wood", exact: true }).click();
  await expect(page.getByText("Turn 2 / 24", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Turn 2 / 24", { exact: false })).toBeVisible();
  await finishGame(page);
  await expect(
    page.getByRole("heading", { name: "You win!", exact: true }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export verified replay" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("outpost-race-42");
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const state = importReplay(JSON.parse(Buffer.concat(chunks).toString()));
  expect(state.ended).toBe(true);
  expect(state.winner).toBe("You");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "You win!", exact: true }),
  ).toBeVisible();
  await page.screenshot({path: test.info().outputPath("completed-game.png"), fullPage: true});
  expect(errors).toEqual([]);
});

test("four-player seeded game, AI opening turn, validation and restart", async ({
  page,
}) => {
  await page.goto("/play");
  await page.getByLabel("Players", { exact: true }).selectOption("4");
  await page.getByLabel("Your seat", { exact: true }).selectOption("3");
  await page.getByLabel("Opponent", { exact: true }).selectOption("random");
  await page.getByLabel("Seed", { exact: true }).fill("invalid");
  await page.getByRole("button", { name: "New game" }).click();
  await expect(page.getByText("Enter a whole-number seed.")).toBeVisible();
  await page.getByLabel("Seed", { exact: true }).fill("777");
  await page.getByRole("button", { name: "New game" }).click();
  await expect(page.getByText("Turn 3 / 48", { exact: false })).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(4);
  await finishGame(page);
  await page.getByRole("button", { name: "New game" }).click();
  await expect(page.getByText("Turn 3 / 48", { exact: false })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Gather wood", exact: true }),
  ).toBeEnabled();
});

test("invalid local replay recovers to a legal new game", async ({page}) => {
  await page.goto('/play');
  await page.evaluate(() => localStorage.setItem('boardforge:outpost-race:0.2:demo', JSON.stringify({replay:{game:'outpost-race',version:'0.2.0',players:['You','AI'],seed:42,events:[{turn:1,playerId:'You',action:'buildOutpost'}]},opponent:'builder'})));
  await page.reload();
  await expect(page.getByText('Turn 0 / 24',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'Gather wood',exact:true})).toBeEnabled();
});
