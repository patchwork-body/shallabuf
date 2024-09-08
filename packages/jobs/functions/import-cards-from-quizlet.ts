import { chromium } from "playwright";

export const scrapeCardsFromQuizlet = async (url: URL) => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(url.toString());

  const data = await page.evaluate(() => {
    const elements = document.querySelectorAll("[data-testid='Card']");
    return Array.from(elements).map((element) => element.textContent);
  });

  await browser.close();

  return data;
};
