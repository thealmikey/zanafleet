import { describe, it, before, after, beforeEach } from 'mocha';
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

describe('SDUI Component Rendering Tests', () => {
  before(async () => {
    driver = await createDriver();
    
    await driver.manage().setTimeouts({ implicit: 10000 });
  });

  after(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  beforeEach(async () => {
    await driver.get('http://localhost:3001');
  });

  it('should render typography component from JSON schema', async () => {
    // Navigate to SDUI page that renders login schema
    await driver.get('http://localhost:3001/sdui/login');
    
    // Wait for typography element
    const title = await driver.wait(
      until.elementLocated(By.css('h5')),
      10000
    );
    
    const text = await title.getText();
    expect(text).to.equal('Welcome Back');
  });

  it('should render text field components', async () => {
    await driver.get('http://localhost:3001/sdui/login');
    
    // Wait for form fields
    const emailField = await driver.wait(
      until.elementLocated(By.css('input[name="email"]')),
      10000
    );
    const passwordField = await driver.findElement(By.css('input[name="password"]'));
    
    expect(emailField).to.not.be.null;
    expect(passwordField).to.not.be.null;
  });

  it('should render button components', async () => {
    await driver.get('http://localhost:3001/sdui/login');
    
    const button = await driver.wait(
      until.elementLocated(By.css('button[type="submit"]')),
      10000
    );
    
    const buttonText = await button.getText();
    expect(buttonText).to.equal('Sign In');
  });

  it('should render card components', async () => {
    await driver.get('http://localhost:3001/sdui/dashboard');
    
    const card = await driver.wait(
      until.elementLocated(By.css('.MuiCard-root')),
      10000
    );
    
    expect(card).to.not.be.null;
  });
});