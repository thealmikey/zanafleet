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

describe('SDUI User Interaction Tests', () => {
  before(async () => {
    driver = await createDriver();
  });

  after(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  it('should allow typing in text fields', async () => {
    await driver.get('http://localhost:3001/sdui/login');
    
    const emailInput = await driver.wait(
      until.elementLocated(By.css('input[name="email"]')),
      10000
    );
    
    await emailInput.sendKeys('test@example.com');
    const value = await emailInput.getAttribute('value');
    
    expect(value).to.equal('test@example.com');
  });

  it('should validate required fields on submit', async () => {
    await driver.get('http://localhost:3001/sdui/login');
    
    // Click submit without filling fields
    const submitButton = await driver.findElement(By.css('button[type="submit"]'));
    await submitButton.click();
    
    // Wait for validation error
    const errorText = await driver.wait(
      until.elementLocated(By.css('.MuiFormHelperText-root')),
      5000
    );
    
    const text = await errorText.getText();
    expect(text).to.equal('Email is required');
  });

  it('should show validation error for invalid email', async () => {
    await driver.get('http://localhost:3001/sdui/login');
    
    // Enter invalid email
    const emailInput = await driver.findElement(By.css('input[name="email"]'));
    await emailInput.sendKeys('invalid-email');
    
    // Enter password
    const passwordInput = await driver.findElement(By.css('input[name="password"]'));
    await passwordInput.sendKeys('password123');
    
    // Submit
    const submitButton = await driver.findElement(By.css('button[type="submit"]'));
    await submitButton.click();
    
    // Wait for error
    const errorText = await driver.wait(
      until.elementLocated(By.css('.MuiFormHelperText-root')),
      5000
    );
    
    const text = await errorText.getText();
    expect(text).to.equal('Invalid email format');
  });
});