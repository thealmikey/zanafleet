import { Builder, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

export interface TestConfig {
  baseUrl: string;
  apiUrl: string;
  timeout: number;
}

export const config: TestConfig = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3001',
  apiUrl: process.env.API_URL || 'http://localhost:3000/api',
  timeout: 30000,
};

export async function createDriver(): Promise<WebDriver> {
  const options = new chrome.Options()
    .headless()
    .addArguments('--no-sandbox')
    .addArguments('--disable-dev-shm-usage')
    .addArguments('--disable-gpu');

  return new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
}
