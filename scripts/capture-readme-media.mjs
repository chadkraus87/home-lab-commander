import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";
import gifenc from "gifenc";

const { GIFEncoder, applyPalette, quantize } = gifenc;
const baseUrl = process.env.HOMELAB_MEDIA_URL ?? "http://127.0.0.1:3200";
const outputDirectory = resolve("docs/media");
const videoDirectory = resolve("docs/media/.recordings");

await mkdir(outputDirectory, { recursive: true });
await rm(videoDirectory, { recursive: true, force: true });
await mkdir(videoDirectory, { recursive: true });

const browser = await chromium.launch();

try {
  await captureTour("command-center-tour", async ({ page, frame, pause }) => {
    await page.goto(baseUrl);
    await page.request.post(`${baseUrl}/api/state`, {
      data: { action: "reset-demo" },
    });
    await page.reload();
    await frame();
    await pause();

    await page.getByRole("link", { name: "Devices", exact: true }).click();
    await frame();
    await pause(900);
    await page
      .getByRole("link", { name: /Atlas Server/ })
      .first()
      .click();
    await frame();
    await pause(1_100);
    await page.getByText("Resource history").scrollIntoViewIfNeeded();
    await frame();
    await pause(900);

    await page.getByRole("link", { name: "Network", exact: true }).click();
    await frame();
    await pause(1_100);
    await page.locator('.react-flow__node[data-id="atlas"]').click();
    await frame();
    await pause(1_400);
  });

  await captureTour(
    "operator-workflow-tour",
    async ({ page, frame, pause }) => {
      await page.goto(baseUrl);
      await page.request.post(`${baseUrl}/api/state`, {
        data: { action: "reset-demo" },
      });
      await page.reload();

      await page.getByRole("link", { name: /Alerts/, exact: false }).click();
      await frame();
      await pause();
      await page
        .getByTestId("alert-row")
        .first()
        .getByRole("button", { name: "Acknowledge" })
        .click();
      await frame();
      await pause(1_200);

      await page.getByRole("link", { name: "Lab Notes" }).click();
      await frame();
      await pause(800);
      await page.getByRole("button", { name: "New note" }).click();
      await page.getByLabel("Note title").fill("Storage maintenance runbook");
      await page
        .getByLabel("Markdown note content")
        .fill(
          "# Storage maintenance\n\n- Verify the latest snapshot\n- Replace the degraded disk\n- Confirm the pool is healthy",
        );
      await frame();
      await pause(1_100);
      await page.getByRole("button", { name: "Save" }).click();
      await frame();
      await pause(1_400);
    },
  );
} finally {
  await browser.close();
  await rm(videoDirectory, { recursive: true, force: true });
}

async function captureTour(name, run) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    colorScheme: "dark",
    recordVideo: {
      dir: videoDirectory,
      size: { width: 1280, height: 720 },
    },
  });
  const page = await context.newPage();
  const video = page.video();
  const frames = [];
  const frame = async () => {
    frames.push(await page.screenshot({ type: "png" }));
  };
  const pause = (milliseconds = 1_000) => page.waitForTimeout(milliseconds);

  await run({ page, frame, pause });
  await context.close();

  const temporaryVideo = await video.path();
  await rename(temporaryVideo, resolve(outputDirectory, `${name}.webm`));
  await encodeGif(frames, resolve(outputDirectory, `${name}.gif`));
}

async function encodeGif(frames, destination) {
  const width = 800;
  const height = 450;
  const gif = GIFEncoder();

  for (const [index, frame] of frames.entries()) {
    const { data } = await sharp(frame)
      .resize(width, height, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const rgba = new Uint8Array((data.length / 3) * 4);
    for (let source = 0, target = 0; source < data.length; source += 3) {
      rgba[target++] = data[source];
      rgba[target++] = data[source + 1];
      rgba[target++] = data[source + 2];
      rgba[target++] = 255;
    }
    const palette = quantize(rgba, 128, { format: "rgb444" });
    const indexed = applyPalette(rgba, palette, "rgb444");
    gif.writeFrame(indexed, width, height, {
      palette,
      delay: index === frames.length - 1 ? 1_800 : 1_250,
      repeat: 0,
    });
  }
  gif.finish();
  await writeFile(destination, gif.bytes());
}
