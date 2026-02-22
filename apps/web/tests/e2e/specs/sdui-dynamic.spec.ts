import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { WebDriver, Builder, By, until } from 'selenium-webdriver';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const chrome = require('selenium-webdriver/chrome');

let driver: WebDriver;

async function createDriver(): Promise<WebDriver> {
  const options = new chrome.Options();
  options.headless = true;
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--disable-gpu');

  driver = new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  return driver;
}

describe('SDUI Dynamic JSON Payload Tests', () => {
  before(async () => {
    driver = await createDriver();
  });

  after(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  it('should update UI when navigating between screens', async () => {
    // Start on login screen
    await driver.get('http://localhost:3001/sdui/login');
    const loginTitle = await driver.wait(
      until.elementLocated(By.css('h5')),
      10000
    );
    expect(await loginTitle.getText()).to.equal('Welcome Back');
    
    // Navigate to dashboard
    await driver.get('http://localhost:3001/sdui/dashboard');
    const dashboardTitle = await driver.wait(
      until.elementLocated(By.css('h4')),
      10000
    );
    expect(await dashboardTitle.getText()).to.equal('Welcome, Administrator');
  });

  it('should render different components based on schema', async () => {
    await driver.get('http://localhost:3001/sdui/login');
    
    // Login has text fields and button
    const emailField = await driver.findElement(By.css('input[name="email"]'));
    const button = await driver.findElement(By.css('button'));
    
    expect(emailField).to.not.be.null;
    expect(button).to.not.be.null;
  });

  it('should handle empty data gracefully', async () => {
    await driver.get('http://localhost:3001/sdui/login');
    
    // Page should load without errors even with no data
    const body = await driver.findElement(By.css('body'));
    const text = await body.getText();
    
    expect(text).to.not.include('Error');
  });
});