import { test, expect } from '@playwright/test';

test.describe('Planning Poker Session', () => {
  test('user can create session and join as estimator, then see themselves in participants', async ({ page }) => {
    // Create a new session
    await page.goto('/');
    await page.fill('#sessionName', 'Test Sprint');
    await page.click('button[type="submit"]');

    // Wait for redirect to session page
    await expect(page).toHaveURL(/\/session\/[a-f0-9-]+/);

    // Join as estimator (default)
    await page.fill('#name', 'Alice');
    await page.click('button[type="submit"]');

    // Verify participant is visible in the Estimators section
    await expect(page.getByText('Estimators')).toBeVisible();
    await expect(page.getByText('Alice')).toBeVisible();
  });

  test('user can join as observer and see themselves in participants', async ({ page }) => {
    // Create a new session
    await page.goto('/');
    await page.fill('#sessionName', 'Test Sprint');
    await page.click('button[type="submit"]');

    // Wait for redirect to session page
    await expect(page).toHaveURL(/\/session\/[a-f0-9-]+/);

    // Join as observer
    await page.fill('#name', 'Bob');
    await page.click('input[value="observer"]');
    await page.click('button[type="submit"]');

    // Verify participant is visible in the Observers section
    await expect(page.getByText('Observers')).toBeVisible();
    await expect(page.getByText('Bob')).toBeVisible();
  });

  test('observer cannot see voting cards', async ({ page }) => {
    // Create a new session
    await page.goto('/');
    await page.fill('#sessionName', 'Test Sprint');
    await page.click('button[type="submit"]');

    // Join as observer
    await page.fill('#name', 'Observer');
    await page.click('input[value="observer"]');
    await page.click('button[type="submit"]');

    // Verify voting cards are NOT visible
    await expect(page.getByText('Your Vote')).not.toBeVisible();
    // Verify observer notice is visible
    await expect(page.getByText('You are observing this session')).toBeVisible();
  });

  test('estimator can see voting cards', async ({ page }) => {
    // Create a new session
    await page.goto('/');
    await page.fill('#sessionName', 'Test Sprint');
    await page.click('button[type="submit"]');

    // Join as estimator
    await page.fill('#name', 'Estimator');
    await page.click('button[type="submit"]');

    // Verify voting cards ARE visible
    await expect(page.getByText('Your Vote')).toBeVisible();
    // Verify we can see card buttons
    await expect(page.getByRole('button', { name: '5' })).toBeVisible();
  });

  test('multi-user session: 2 estimators vote, observer reveals, all see results', async ({ browser }) => {
    // Create a new session and get the URL
    const context1 = await browser.newContext();
    const estimator1 = await context1.newPage();

    await estimator1.goto('/');
    await estimator1.fill('#sessionName', 'Multi-User Sprint');
    await estimator1.click('button[type="submit"]');
    await expect(estimator1).toHaveURL(/\/session\/[a-f0-9-]+/);
    const sessionUrl = estimator1.url();

    // Estimator 1 joins
    await estimator1.fill('#name', 'Estimator1');
    await estimator1.click('button[type="submit"]');
    await expect(estimator1.getByText('Estimators')).toBeVisible();

    // Estimator 2 joins the same session
    const context2 = await browser.newContext();
    const estimator2 = await context2.newPage();
    await estimator2.goto(sessionUrl);
    await estimator2.fill('#name', 'Estimator2');
    await estimator2.click('button[type="submit"]');
    await expect(estimator2.getByText('Estimator1')).toBeVisible();
    await expect(estimator2.getByText('Estimator2')).toBeVisible();

    // Observer 1 joins the same session
    const context3 = await browser.newContext();
    const observer1 = await context3.newPage();
    await observer1.goto(sessionUrl);
    await observer1.fill('#name', 'Observer1');
    await observer1.click('input[value="observer"]');
    await observer1.click('button[type="submit"]');
    await expect(observer1.getByText('Observers')).toBeVisible({ timeout: 10000 });

    // Observer 2 joins the same session
    const context4 = await browser.newContext();
    const observer2 = await context4.newPage();
    await observer2.goto(sessionUrl);
    await observer2.fill('#name', 'Observer2');
    await observer2.click('input[value="observer"]');
    await observer2.click('button[type="submit"]');

    // Verify all participants see each other
    for (const page of [estimator1, estimator2, observer1, observer2]) {
      await expect(page.getByText('Estimator1')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Estimator2')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Observer1')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Observer2')).toBeVisible({ timeout: 10000 });
    }

    // Estimators place their votes
    await estimator1.getByRole('button', { name: '5' }).click();
    await estimator2.getByRole('button', { name: '8' }).click();

    // Verify votes are shown (cards turn dark when voted, not revealed yet)
    for (const page of [estimator1, estimator2, observer1, observer2]) {
      // Wait for the dark card backgrounds to appear (votes placed but not revealed)
      await expect(page.locator('.bg-zinc-700').first()).toBeVisible();
    }

    // Observer 1 clicks "Reveal Votes"
    await observer1.getByRole('button', { name: 'Reveal Votes' }).click();

    // All participants should see the revealed votes and results
    for (const page of [estimator1, estimator2, observer1, observer2]) {
      await expect(page.getByText('Results')).toBeVisible();
      // Check average is shown (5+8)/2 = 6.5
      await expect(page.getByText('6.5')).toBeVisible();
      // Check min is 5
      await expect(page.getByText('Min').locator('..').getByText('5')).toBeVisible();
      // Check max is 8
      await expect(page.getByText('Max').locator('..').getByText('8')).toBeVisible();
    }

    // Cleanup
    await context1.close();
    await context2.close();
    await context3.close();
    await context4.close();
  });

  test('estimator can toggle vote on and off', async ({ page }) => {
    // Create a new session
    await page.goto('/');
    await page.fill('#sessionName', 'Toggle Vote Sprint');
    await page.click('button[type="submit"]');

    // Join as estimator
    await page.fill('#name', 'Toggler');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Estimators')).toBeVisible({ timeout: 10000 });

    // Initially, participant card should show not-voted state (white background)
    await expect(page.locator('.bg-white.border-zinc-300')).toBeVisible();
    await expect(page.locator('.bg-zinc-700')).not.toBeVisible();

    // Vote for 5
    await page.getByRole('button', { name: '5' }).click();

    // Card should now show voted state (dark background)
    await expect(page.locator('.bg-zinc-700')).toBeVisible();
    // Vote button should be highlighted
    const voteButton = page.getByRole('button', { name: '5' });
    await expect(voteButton).toHaveClass(/bg-blue-600/);

    // Click the same button again to toggle off
    await page.getByRole('button', { name: '5' }).click();

    // Card should return to not-voted state (white background)
    await expect(page.locator('.bg-white.border-zinc-300')).toBeVisible();
    await expect(page.locator('.bg-zinc-700')).not.toBeVisible();
    // Vote button should no longer be highlighted
    await expect(voteButton).not.toHaveClass(/bg-blue-600/);
  });

  test('new round clears all vote selections for all participants', async ({ browser }) => {
    // Create a new session
    const context1 = await browser.newContext();
    const estimator1 = await context1.newPage();

    await estimator1.goto('/');
    await estimator1.fill('#sessionName', 'New Round Test');
    await estimator1.click('button[type="submit"]');
    await expect(estimator1).toHaveURL(/\/session\/[a-f0-9-]+/);
    const sessionUrl = estimator1.url();

    // Estimator 1 joins
    await estimator1.fill('#name', 'Estimator1');
    await estimator1.click('button[type="submit"]');
    await expect(estimator1.getByText('Estimators')).toBeVisible();

    // Estimator 2 joins
    const context2 = await browser.newContext();
    const estimator2 = await context2.newPage();
    await estimator2.goto(sessionUrl);
    await estimator2.fill('#name', 'Estimator2');
    await estimator2.click('button[type="submit"]');
    await expect(estimator2.getByText('Estimator1')).toBeVisible({ timeout: 10000 });

    // Both estimators vote
    await estimator1.getByRole('button', { name: '5' }).click();
    await estimator2.getByRole('button', { name: '8' }).click();

    // Verify both have voted (dark card backgrounds visible)
    await expect(estimator1.locator('.bg-zinc-700').first()).toBeVisible();
    await expect(estimator2.locator('.bg-zinc-700').first()).toBeVisible();

    // Verify vote buttons are highlighted
    await expect(estimator1.getByRole('button', { name: '5' })).toHaveClass(/bg-blue-600/, { timeout: 10000 });
    await expect(estimator2.getByRole('button', { name: '8' })).toHaveClass(/bg-blue-600/, { timeout: 10000 });

    // Estimator 1 clicks "New Round"
    await estimator1.getByRole('button', { name: 'New Round' }).click();

    // Both estimators should have their vote selections cleared
    // Cards should return to not-voted state (white background)
    await expect(estimator1.locator('.bg-white.border-zinc-300').first()).toBeVisible();
    await expect(estimator2.locator('.bg-white.border-zinc-300').first()).toBeVisible({ timeout: 10000 });

    // Vote buttons should no longer be highlighted for either user
    await expect(estimator1.getByRole('button', { name: '5' })).not.toHaveClass(/bg-blue-600/);
    await expect(estimator2.getByRole('button', { name: '8' })).not.toHaveClass(/bg-blue-600/);

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('participant can close browser and rejoin with same profile', async ({ browser }) => {
    // Create a session and join as estimator
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    await page1.goto('/');
    await page1.fill('#sessionName', 'Rejoin Test Sprint');
    await page1.click('button[type="submit"]');
    await expect(page1).toHaveURL(/\/session\/[a-f0-9-]+/);
    const sessionUrl = page1.url();

    // Join as estimator
    await page1.fill('#name', 'RejoiningUser');
    await page1.click('button[type="submit"]');
    await expect(page1.getByText('Estimators')).toBeVisible();
    await expect(page1.getByText('RejoiningUser')).toBeVisible();

    // Place a vote
    await page1.getByRole('button', { name: '13' }).click();

    // Wait for vote to be registered (card turns dark)
    await expect(page1.locator('.bg-zinc-700')).toBeVisible();

    // Simulate closing browser - close the context but keep localStorage
    // Get localStorage before closing
    const storageState = await context1.storageState();
    await context1.close();

    // Open a new browser context with the same storage state (simulates reopening browser)
    const context2 = await browser.newContext({ storageState });
    const page2 = await context2.newPage();

    // Navigate back to the same session URL
    await page2.goto(sessionUrl);

    // Should automatically rejoin without showing the join form
    // Should see the session directly with the same name
    await expect(page2.getByText('Estimators')).toBeVisible();
    await expect(page2.getByText('RejoiningUser')).toBeVisible();

    // Should NOT see the join form
    await expect(page2.locator('#name')).not.toBeVisible();

    // Vote should still be highlighted (card 13 should have the selected style)
    const card13 = page2.getByRole('button', { name: '13' });
    await expect(card13).toHaveClass(/bg-blue-600/, { timeout: 10000 });

    // Cleanup
    await context2.close();
  });
});
