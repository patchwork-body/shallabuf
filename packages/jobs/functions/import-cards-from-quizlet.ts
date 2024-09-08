import { chromium } from "playwright";

export const scrapeCardsFromQuizlet = async (url: URL) => {
  const browser = await chromium.launch();

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  });

  const page = await context.newPage();
  await page.goto(url.toString());

  const data = await page.evaluate(() => {
    const elements = document.querySelectorAll("div");
    return Array.from(elements).map((element) => element.textContent);
  });

  await browser.close();

  return data;
};
