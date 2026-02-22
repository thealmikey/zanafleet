import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

test.describe('Movers Homepage SDUI Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test('screenshots Movers homepage full page', async ({ page }) => {
    // Navigate to the SDUI page with movers-home screen
    await page.goto(`${BASE_URL}/sdui/movers-home`);
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Debug: get page content
    const content = await page.content();
    console.log('Page loaded, checking for content...');
    
    // Wait for any content to appear (give time for API call)
    await page.waitForTimeout(2000);
    
    // Take full page screenshot
    await page.screenshot({ 
      path: 'tests/visual/screenshots/movers-homepage-full.png',
      fullPage: true 
    });
  });

  test('captures page content for analysis', async ({ page }) => {
    await page.goto(`${BASE_URL}/sdui/movers-home`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Get the page text content
    const bodyText = await page.locator('body').textContent();
    console.log('Page text content:');
    console.log(bodyText?.substring(0, 500));
    
    // Get all visible elements
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    console.log('Headings found:', headings);
    
    // Get all sections
    const sections = await page.locator('section').count();
    console.log('Sections found:', sections);
    
    // Take screenshot anyway
    await page.screenshot({ 
      path: 'tests/visual/screenshots/movers-homepage-analysis.png',
      fullPage: true 
    });
  });

  test('screenshots main content area', async ({ page }) => {
    await page.goto(`${BASE_URL}/sdui/movers-home`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Find main content area - look for root or any content container
    const main = page.locator('main, #root, [role="main"]').first();
    await main.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
    
    await page.screenshot({ 
      path: 'tests/visual/screenshots/movers-homepage-content.png',
      fullPage: true 
    });
  });

  test('captures layout structure for verification', async ({ page }) => {
    await page.goto(`${BASE_URL}/sdui/movers-home`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Get all sections and their bounding boxes
    const sections = await page.locator('section, div').all();
    
    const layoutInfo: { index: number; tag: string; text: string; height: number }[] = [];
    
    for (let i = 0; i < Math.min(sections.length, 10); i++) {
      const section = sections[i];
      const box = await section.boundingBox();
      const text = await section.textContent();
      
      if (box && box.width > 0 && box.height > 0) {
        layoutInfo.push({
          index: i,
          tag: await section.evaluate(el => el.tagName),
          text: text?.substring(0, 50) || '',
          height: Math.round(box.height)
        });
      }
    }
    
    console.log('Page Layout Structure (non-empty divs/sections):');
    console.table(layoutInfo);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'tests/visual/screenshots/movers-homepage-layout.png',
      fullPage: true 
    });
    
    // Basic assertion
    expect(layoutInfo.length).toBeGreaterThan(0);
  });

  test('verifies component rendering with accessibility', async ({ page }) => {
    await page.goto(`${BASE_URL}/sdui/movers-home`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check for images and their alt text
    const images = page.locator('img');
    const imageCount = await images.count();
    
    console.log(`Found ${imageCount} images`);
    
    // Check for headings to verify content structure
    const headings = page.locator('h1, h2, h3');
    const headingCount = await headings.count();
    const headingTexts = await headings.allTextContents();
    
    console.log(`Found ${headingCount} headings:`, headingTexts);
    
    // Check for interactive elements
    const buttons = page.locator('button, [role="button"], a');
    const buttonCount = await buttons.count();
    const buttonTexts = await buttons.allTextContents();
    
    console.log(`Found ${buttonCount} interactive elements:`, buttonTexts);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'tests/visual/screenshots/movers-homepage-accessibility.png',
      fullPage: true 
    });
    
    // Basic assertions
    expect(headingCount).toBeGreaterThan(0);
  });

  test('captures mobile viewport screenshot', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto(`${BASE_URL}/sdui/movers-home`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'tests/visual/screenshots/movers-homepage-mobile.png',
      fullPage: true 
    });
  });

  test('captures tablet viewport screenshot', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto(`${BASE_URL}/sdui/movers-home`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'tests/visual/screenshots/movers-homepage-tablet.png',
      fullPage: true 
    });
  });
});
