import { WebDriver, By, until } from 'selenium-webdriver';

export class SDUITestHelper {
  private driver: WebDriver;

  constructor(driver: WebDriver) {
    this.driver = driver;
  }

  async waitForElement(selector: string, timeout = 10000) {
    return this.driver.wait(until.elementLocated(By.css(selector)), timeout);
  }

  async findElement(selector: string) {
    return this.driver.findElement(By.css(selector));
  }

  async getText(selector: string) {
    const element = await this.findElement(selector);
    return element.getText();
  }

  async click(selector: string) {
    const element = await this.findElement(selector);
    await element.click();
  }

  async type(selector: string, text: string) {
    const element = await this.findElement(selector);
    await element.clear();
    await element.sendKeys(text);
  }

  async getAttribute(selector: string, attribute: string) {
    const element = await this.findElement(selector);
    return element.getAttribute(attribute);
  }

  async isDisplayed(selector: string): Promise<boolean> {
    try {
      const element = await this.findElement(selector);
      return element.isDisplayed();
    } catch {
      return false;
    }
  }
}

export async function takeScreenshot(driver: WebDriver, name: string): Promise<void> {
  const image = await driver.takeScreenshot();
  console.log(`Screenshot saved: ${name}.png`);
}
