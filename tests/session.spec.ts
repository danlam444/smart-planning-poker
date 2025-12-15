import { test, expect } from '@playwright/test';

test.describe('Planning Poker Session', () => {
  test('user can create session and join as voter, then see themselves in participants', async ({ page }) => {
    // Create a new session
    await page.goto('/');
    await page.fill('#sessionName', 'Test Sprint');
    await page.click('button[type="submit"]');

    // Wait for redirect to session page
    await expect(page).toHaveURL(/\/session\/[a-f0-9-]+/);

    // Join as voter (default)
    await page.fill('#name', 'Alice');
    await page.click('button[type="submit"]');

    // Verify participant is visible in the Participants section
    await expect(page.getByText('Participants')).toBeVisible();
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
    await page.getByText('Observer').click();
    await page.click('button[type="submit"]');

    // Verify participant is visible in the Participants section
    await expect(page.getByText('Participants')).toBeVisible();
    await expect(page.getByText('Bob')).toBeVisible();
  });

  test('observer cannot see voting cards', async ({ page }) => {
    // Create a new session
    await page.goto('/');
    await page.fill('#sessionName', 'Test Sprint');
    await page.click('button[type="submit"]');

    // Join as observer
    await page.fill('#name', 'Observer');
    await page.getByText('Observer').click();
    await page.click('button[type="submit"]');

    // Verify voting cards are NOT visible
    await expect(page.getByText('Your Vote')).not.toBeVisible();
    // Verify observer notice is visible
    await expect(page.getByText("You're observing this session")).toBeVisible();
  });

  test('voter can see voting cards', async ({ page }) => {
    // Create a new session
    await page.goto('/');
    await page.fill('#sessionName', 'Test Sprint');
    await page.click('button[type="submit"]');

    // Join as voter
    await page.fill('#name', 'Voter');
    await page.click('button[type="submit"]');

    // Verify voting cards ARE visible
    await expect(page.getByText('Your Vote')).toBeVisible();
    // Verify we can see card buttons
    await expect(page.getByRole('button', { name: '5' })).toBeVisible();
  });

  test('multi-user session: 2 voters vote, observer reveals, all see results', async ({ browser }) => {
    // Create a new session and get the URL
    const context1 = await browser.newContext();
    const estimator1 = await context1.newPage();

    await estimator1.goto('/');
    await estimator1.fill('#sessionName', 'Multi-User Sprint');
    await estimator1.click('button[type="submit"]');
    await expect(estimator1).toHaveURL(/\/session\/[a-f0-9-]+/);
    const sessionUrl = estimator1.url();

    // Voter 1 joins
    await estimator1.fill('#name', 'Voter1');
    await estimator1.click('button[type="submit"]');
    await expect(estimator1.getByText('Participants')).toBeVisible();

    // Voter 2 joins the same session
    const context2 = await browser.newContext();
    const estimator2 = await context2.newPage();
    await estimator2.goto(sessionUrl);
    await estimator2.fill('#name', 'Voter2');
    await estimator2.click('button[type="submit"]');
    await expect(estimator2.getByText('Voter1')).toBeVisible();
    await expect(estimator2.getByText('Voter2')).toBeVisible();

    // Observer 1 joins the same session
    const context3 = await browser.newContext();
    const observer1 = await context3.newPage();
    await observer1.goto(sessionUrl);
    await observer1.fill('#name', 'Observer1');
    await observer1.getByText('Observer').click();
    await observer1.click('button[type="submit"]');
    await expect(observer1.getByText('Participants')).toBeVisible({ timeout: 10000 });

    // Observer 2 joins the same session
    const context4 = await browser.newContext();
    const observer2 = await context4.newPage();
    await observer2.goto(sessionUrl);
    await observer2.fill('#name', 'Observer2');
    await observer2.getByText('Observer').click();
    await observer2.click('button[type="submit"]');

    // Verify all participants see each other
    for (const page of [estimator1, estimator2, observer1, observer2]) {
      await expect(page.getByText('Voter1')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Voter2')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Observer1')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Observer2')).toBeVisible({ timeout: 10000 });
    }

    // Voters place their votes
    await estimator1.getByRole('button', { name: '5' }).click();
    await estimator2.getByRole('button', { name: '8' }).click();

    // Verify votes are shown (cards turn purple/indigo when voted, not revealed yet)
    for (const page of [estimator1, estimator2, observer1, observer2]) {
      // Wait for the voted card backgrounds to appear (votes placed but not revealed)
      await expect(page.locator('.bg-\\[\\#635bff\\]').first()).toBeVisible();
    }

    // Observer 1 clicks "Reveal Votes"
    await observer1.getByRole('button', { name: 'Reveal Votes' }).click();

    // All participants should see the revealed votes and results
    for (const page of [estimator1, estimator2, observer1, observer2]) {
      await expect(page.getByText('Average')).toBeVisible();
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

  test('voter can toggle vote on and off', async ({ page }) => {
    // Create a new session
    await page.goto('/');
    await page.fill('#sessionName', 'Toggle Vote Sprint');
    await page.click('button[type="submit"]');

    // Join as voter
    await page.fill('#name', 'Toggler');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Participants')).toBeVisible({ timeout: 10000 });

    // Initially, participant card should show not-voted state
    // Check that no participant cards have the voted purple background (exclude bell button)
    const participantCards = page.locator('.w-16.h-24.bg-\\[\\#635bff\\]');
    await expect(participantCards).toHaveCount(0);

    // Vote for 5
    await page.getByRole('button', { name: '5' }).click();

    // Card should now show voted state (Stripe purple background)
    await expect(page.locator('.bg-\\[\\#635bff\\]').first()).toBeVisible();
    // Vote button should be highlighted
    const voteButton = page.getByRole('button', { name: '5' });
    await expect(voteButton).toHaveClass(/bg-\[#635bff\]/);

    // Click the same button again to toggle off
    await page.getByRole('button', { name: '5' }).click();

    // Wait for vote button to lose highlight (indicates server processed toggle)
    await expect(voteButton).not.toHaveClass(/bg-\[#635bff\]/, { timeout: 5000 });

    // Card should return to not-voted state (no participant cards with purple background)
    const participantCardsAfterToggle = page.locator('.w-16.h-24.bg-\\[\\#635bff\\]');
    await expect(participantCardsAfterToggle).toHaveCount(0, { timeout: 5000 });
    // Vote button should no longer be highlighted
    await expect(voteButton).not.toHaveClass(/bg-\[#635bff\]/);
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

    // Voter 1 joins
    await estimator1.fill('#name', 'Voter1');
    await estimator1.click('button[type="submit"]');
    await expect(estimator1.getByText('Participants')).toBeVisible();

    // Voter 2 joins
    const context2 = await browser.newContext();
    const estimator2 = await context2.newPage();
    await estimator2.goto(sessionUrl);
    await estimator2.fill('#name', 'Voter2');
    await estimator2.click('button[type="submit"]');
    await expect(estimator2.getByText('Voter1')).toBeVisible({ timeout: 10000 });

    // Both voters vote
    await estimator1.getByRole('button', { name: '5' }).click();
    await estimator2.getByRole('button', { name: '8' }).click();
    // Brief wait for votes to sync via Pusher
    await estimator1.waitForTimeout(300);

    // Verify both have voted (Stripe purple card backgrounds visible)
    await expect(estimator1.locator('.bg-\\[\\#635bff\\]').first()).toBeVisible();
    await expect(estimator2.locator('.bg-\\[\\#635bff\\]').first()).toBeVisible();

    // Verify vote buttons are highlighted
    await expect(estimator1.getByRole('button', { name: '5' })).toHaveClass(/bg-\[#635bff\]/, { timeout: 10000 });
    await expect(estimator2.getByRole('button', { name: '8' })).toHaveClass(/bg-\[#635bff\]/, { timeout: 10000 });

    // Voter 1 reveals votes to open the modal, then clicks "New Round" in the modal
    await estimator1.getByRole('button', { name: 'Reveal Votes' }).click();
    await expect(estimator1.getByText('Average')).toBeVisible({ timeout: 10000 });
    await estimator1.getByRole('button', { name: 'New Round' }).click();

    // Wait for modal to close
    await expect(estimator1.getByText('Average')).not.toBeVisible({ timeout: 10000 });

    // Both voters should have their vote selections cleared
    // Vote buttons should no longer be highlighted for either user
    await expect(estimator1.getByRole('button', { name: '5' })).not.toHaveClass(/bg-\[#635bff\]/);
    await expect(estimator2.getByRole('button', { name: '8' })).not.toHaveClass(/bg-\[#635bff\]/);

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('clicking result value saves story to history when story name is entered', async ({ browser }) => {
    // Create a new session
    const context1 = await browser.newContext();
    const estimator1 = await context1.newPage();

    await estimator1.goto('/');
    await estimator1.fill('#sessionName', 'History Test Sprint');
    await estimator1.click('button[type="submit"]');
    await expect(estimator1).toHaveURL(/\/session\/[a-f0-9-]+/);
    const sessionUrl = estimator1.url();

    // Voter 1 joins
    await estimator1.fill('#name', 'Voter1');
    await estimator1.click('button[type="submit"]');
    await expect(estimator1.getByText('Participants')).toBeVisible();

    // Voter 2 joins
    const context2 = await browser.newContext();
    const estimator2 = await context2.newPage();
    await estimator2.goto(sessionUrl);
    await estimator2.fill('#name', 'Voter2');
    await estimator2.click('button[type="submit"]');
    await expect(estimator2.getByText('Voter1')).toBeVisible({ timeout: 10000 });
    // Brief delay for Pusher events to settle after join
    await estimator1.waitForTimeout(200);

    // Enter a story name and press Enter to lock it
    await estimator1.fill('input[placeholder="Enter story title or ticket number..."]', 'User Login Feature');
    await estimator1.locator('input[placeholder="Enter story title or ticket number..."]').press('Enter');
    // Wait for story to be locked, then brief delay for server sync
    await expect(estimator1.locator('[title="Click to edit"]')).toBeVisible({ timeout: 5000 });
    await estimator1.waitForTimeout(300);

    // Both voters vote the same value (consensus)
    await estimator1.getByRole('button', { name: '5' }).click();
    await estimator2.getByRole('button', { name: '5' }).click();

    // Reveal votes
    await estimator1.getByRole('button', { name: 'Reveal Votes' }).click();
    await expect(estimator1.getByText('Consensus!')).toBeVisible({ timeout: 10000 });

    // Consensus should auto-save to history (no click needed)
    // Verify the story appears in history sidebar with the vote value
    const historyItem = estimator1.locator('li').filter({ hasText: 'User Login Feature' }).first();
    await expect(historyItem).toBeVisible({ timeout: 10000 });
    await expect(historyItem).toContainText('5');

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('clicking majority result value saves story to history', async ({ browser }) => {
    // Create a new session
    const context1 = await browser.newContext();
    const estimator1 = await context1.newPage();

    await estimator1.goto('/');
    await estimator1.fill('#sessionName', 'Majority History Test');
    await estimator1.click('button[type="submit"]');
    await expect(estimator1).toHaveURL(/\/session\/[a-f0-9-]+/);
    const sessionUrl = estimator1.url();

    // Voter 1 joins
    await estimator1.fill('#name', 'Voter1');
    await estimator1.click('button[type="submit"]');
    await expect(estimator1.getByText('Participants')).toBeVisible();

    // Voter 2 joins
    const context2 = await browser.newContext();
    const estimator2 = await context2.newPage();
    await estimator2.goto(sessionUrl);
    await estimator2.fill('#name', 'Voter2');
    await estimator2.click('button[type="submit"]');
    await expect(estimator2.getByText('Voter1')).toBeVisible({ timeout: 10000 });
    // Brief delay for Pusher events to settle after join
    await estimator1.waitForTimeout(200);

    // Enter a story name and press Enter to lock it
    await estimator1.fill('input[placeholder="Enter story title or ticket number..."]', 'Payment Integration');
    await estimator1.locator('input[placeholder="Enter story title or ticket number..."]').press('Enter');
    // Wait for story to be locked, then brief delay for server sync
    await expect(estimator1.locator('[title="Click to edit"]')).toBeVisible({ timeout: 5000 });
    await estimator1.waitForTimeout(300);

    // Voters vote different values (no consensus, creates majority)
    await estimator1.getByRole('button', { name: '5' }).click();
    await estimator2.getByRole('button', { name: '8' }).click();

    // Reveal votes
    await estimator1.getByRole('button', { name: 'Reveal Votes' }).click();
    await expect(estimator1.getByText('Average')).toBeVisible({ timeout: 10000 });

    // Click on the majority value 5 in the second row (majority section)
    // The majority values are in the last row, click on '5'
    const majoritySection = estimator1.locator('.border-t.border-\\[\\#e3e8ee\\]');
    await majoritySection.getByText('5').click();

    // Verify the story appears in history sidebar
    await expect(estimator1.getByText('Payment Integration')).toBeVisible({ timeout: 10000 });

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('voter can switch voting scales using arrow buttons', async ({ page }) => {
    // Create a new session
    await page.goto('/');
    await page.fill('#sessionName', 'Scale Switch Test');
    await page.click('button[type="submit"]');

    // Join as voter
    await page.fill('#name', 'Voter');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Participants')).toBeVisible();

    // Verify default scale is Story Points (fibonacci)
    await expect(page.getByText('Story Points')).toBeVisible();
    await expect(page.getByRole('button', { name: '13' })).toBeVisible();

    // Click down arrow to switch to T-Shirt sizes
    await page.locator('button[title="Next scale"]').click();

    // Verify scale switched to T-Shirt Sizes
    await expect(page.getByText('T-Shirt Sizes')).toBeVisible();
    await expect(page.getByRole('button', { name: 'XL', exact: true })).toBeVisible();
    // Fibonacci values should not be visible
    await expect(page.getByRole('button', { name: '13' })).not.toBeVisible();

    // Click up arrow to switch back to Story Points
    await page.locator('button[title="Previous scale"]').click();

    // Verify scale switched back to Story Points
    await expect(page.getByText('Story Points')).toBeVisible();
    await expect(page.getByRole('button', { name: '13' })).toBeVisible();
  });

  test('t-shirt size voting shows only consensus without numeric stats', async ({ browser }) => {
    // Create a new session
    const context1 = await browser.newContext();
    const estimator1 = await context1.newPage();

    await estimator1.goto('/');
    await estimator1.fill('#sessionName', 'T-Shirt Vote Test');
    await estimator1.click('button[type="submit"]');
    await expect(estimator1).toHaveURL(/\/session\/[a-f0-9-]+/);
    const sessionUrl = estimator1.url();

    // Voter 1 joins
    await estimator1.fill('#name', 'Voter1');
    await estimator1.click('button[type="submit"]');
    await expect(estimator1.getByText('Participants')).toBeVisible();

    // Switch to T-Shirt sizes
    await estimator1.locator('button[title="Next scale"]').click();
    await expect(estimator1.getByText('T-Shirt Sizes')).toBeVisible();

    // Voter 2 joins
    const context2 = await browser.newContext();
    const estimator2 = await context2.newPage();
    await estimator2.goto(sessionUrl);
    await estimator2.fill('#name', 'Voter2');
    await estimator2.click('button[type="submit"]');
    await expect(estimator2.getByText('Voter1')).toBeVisible({ timeout: 10000 });

    // Voter 2 also switches to T-Shirt sizes
    await estimator2.locator('button[title="Next scale"]').click();

    // Both vote for 'L'
    await estimator1.getByRole('button', { name: 'L', exact: true }).click();
    await estimator2.getByRole('button', { name: 'L', exact: true }).click();

    // Reveal votes
    await estimator1.getByRole('button', { name: 'Reveal Votes' }).click();

    // Should show consensus without Average/Min/Max
    await expect(estimator1.getByText('Consensus!')).toBeVisible({ timeout: 10000 });
    await expect(estimator1.getByText('Average')).not.toBeVisible();
    await expect(estimator1.getByText('Min')).not.toBeVisible();
    await expect(estimator1.getByText('Max')).not.toBeVisible();

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('story name syncs between participants when locked', async ({ browser }) => {
    // Create a new session
    const context1 = await browser.newContext();
    const estimator1 = await context1.newPage();

    await estimator1.goto('/');
    await estimator1.fill('#sessionName', 'Story Sync Test');
    await estimator1.click('button[type="submit"]');
    await expect(estimator1).toHaveURL(/\/session\/[a-f0-9-]+/);
    const sessionUrl = estimator1.url();

    // Voter 1 joins
    await estimator1.fill('#name', 'Voter1');
    await estimator1.click('button[type="submit"]');
    await expect(estimator1.getByText('Participants')).toBeVisible();

    // Voter 2 joins
    const context2 = await browser.newContext();
    const estimator2 = await context2.newPage();
    await estimator2.goto(sessionUrl);
    await estimator2.fill('#name', 'Voter2');
    await estimator2.click('button[type="submit"]');
    await expect(estimator2.getByText('Voter1')).toBeVisible({ timeout: 10000 });

    // Voter 1 enters a story name and presses Enter to lock it
    const storyInput = estimator1.locator('input[placeholder="Enter story title or ticket number..."]');
    await storyInput.fill('Shared Story Name');
    await storyInput.press('Enter');

    // Wait for the field to become locked (displays as span instead of input)
    await expect(estimator1.locator('span').filter({ hasText: 'Shared Story Name' })).toBeVisible();

    // Voter 2 should see the same story name
    await expect(estimator2.locator('span').filter({ hasText: 'Shared Story Name' })).toBeVisible({ timeout: 10000 });

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('new round clears story name for all participants', async ({ browser }) => {
    // Create a new session
    const context1 = await browser.newContext();
    const estimator1 = await context1.newPage();

    await estimator1.goto('/');
    await estimator1.fill('#sessionName', 'Story Clear Test');
    await estimator1.click('button[type="submit"]');
    await expect(estimator1).toHaveURL(/\/session\/[a-f0-9-]+/);
    const sessionUrl = estimator1.url();

    // Voter 1 joins
    await estimator1.fill('#name', 'Voter1');
    await estimator1.click('button[type="submit"]');
    await expect(estimator1.getByText('Participants')).toBeVisible();

    // Voter 2 joins
    const context2 = await browser.newContext();
    const estimator2 = await context2.newPage();
    await estimator2.goto(sessionUrl);
    await estimator2.fill('#name', 'Voter2');
    await estimator2.click('button[type="submit"]');
    await expect(estimator2.getByText('Voter1')).toBeVisible({ timeout: 10000 });

    // Voter 1 enters and locks a story name
    const storyInput = estimator1.locator('input[placeholder="Enter story title or ticket number..."]');
    await storyInput.fill('Story To Be Cleared');
    await storyInput.press('Enter');

    // Verify story is visible for both (in the locked story field)
    await expect(estimator1.locator('span').filter({ hasText: 'Story To Be Cleared' })).toBeVisible();
    await expect(estimator2.locator('span').filter({ hasText: 'Story To Be Cleared' })).toBeVisible({ timeout: 10000 });

    // Both vote
    await estimator1.getByRole('button', { name: '5' }).click();
    await estimator2.getByRole('button', { name: '5' }).click();

    // Reveal and start new round
    await estimator1.getByRole('button', { name: 'Reveal Votes' }).click();
    await expect(estimator1.getByText('Consensus!')).toBeVisible({ timeout: 10000 });
    await estimator1.getByRole('button', { name: 'New Round' }).click();

    // Wait for modal to close
    await expect(estimator1.getByText('Consensus!')).not.toBeVisible({ timeout: 10000 });

    // Story input should be empty and visible again for both participants
    const storyInput1 = estimator1.locator('input[placeholder="Enter story title or ticket number..."]');
    const storyInput2 = estimator2.locator('input[placeholder="Enter story title or ticket number..."]');

    await expect(storyInput1).toBeVisible({ timeout: 10000 });
    await expect(storyInput1).toHaveValue('');
    await expect(storyInput2).toBeVisible({ timeout: 10000 });
    await expect(storyInput2).toHaveValue('');

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('participant shows as offline when browser closes', async ({ browser }, testInfo) => {
    // This test waits 35s for heartbeat timeout, so we need a longer timeout
    testInfo.setTimeout(60000);

    // Create a session
    const context1 = await browser.newContext();
    const voter1 = await context1.newPage();

    await voter1.goto('/');
    await voter1.fill('#sessionName', 'Presence Test Sprint');
    await voter1.click('button[type="submit"]');
    await expect(voter1).toHaveURL(/\/session\/[a-f0-9-]+/);
    const sessionUrl = voter1.url();

    // Voter 1 joins
    await voter1.fill('#name', 'Voter1');
    await voter1.click('button[type="submit"]');
    await expect(voter1.getByText('Participants')).toBeVisible();

    // Voter 2 joins the same session
    const context2 = await browser.newContext();
    const voter2 = await context2.newPage();
    await voter2.goto(sessionUrl);
    await voter2.fill('#name', 'Voter2');
    await voter2.click('button[type="submit"]');
    await expect(voter2.getByText('Voter1')).toBeVisible({ timeout: 10000 });
    await expect(voter2.getByText('Voter2')).toBeVisible();

    // Both should be online initially (no "Offline" label visible under participant names)
    // Use exact text match for the offline label
    await expect(voter1.locator('span', { hasText: /^Offline$/ })).not.toBeVisible();

    // Close Voter2's browser context (simulates closing browser)
    await context2.close();

    // Wait for heartbeat timeout (30 seconds) + a buffer
    // For testing, we'll check after the offline threshold passes
    // The offline threshold is 30 seconds, so we wait slightly more
    await voter1.waitForTimeout(35000);

    // Voter1 should now see Voter2 as offline (the "Offline" label under name)
    await expect(voter1.locator('span', { hasText: /^Offline$/ })).toBeVisible({ timeout: 10000 });

    // Voter2's avatar should have grayscale styling
    // The grayscale class is applied to the img inside the participant card
    const voter2Card = voter1.locator('img.grayscale').first();
    await expect(voter2Card).toBeVisible();

    // Cleanup
    await context1.close();
  });

  test('participant shows as online when connected', async ({ browser }) => {
    // Create a session
    const context1 = await browser.newContext();
    const voter1 = await context1.newPage();

    await voter1.goto('/');
    await voter1.fill('#sessionName', 'Connected Test Sprint');
    await voter1.click('button[type="submit"]');
    await expect(voter1).toHaveURL(/\/session\/[a-f0-9-]+/);
    const sessionUrl = voter1.url();

    // Voter 1 joins
    await voter1.fill('#name', 'Voter1');
    await voter1.click('button[type="submit"]');
    await expect(voter1.getByText('Participants')).toBeVisible();

    // Voter 2 joins the same session
    const context2 = await browser.newContext();
    const voter2 = await context2.newPage();
    await voter2.goto(sessionUrl);
    await voter2.fill('#name', 'Voter2');
    await voter2.click('button[type="submit"]');
    await expect(voter2.getByText('Voter1')).toBeVisible({ timeout: 10000 });

    // Wait a few seconds to ensure heartbeats are being sent
    await voter1.waitForTimeout(3000);

    // Both participants should be online (no "Offline" label under participant names)
    await expect(voter1.locator('span', { hasText: /^Offline$/ })).not.toBeVisible();
    await expect(voter2.locator('span', { hasText: /^Offline$/ })).not.toBeVisible();

    // No grayscale images should be visible (all online)
    await expect(voter1.locator('img.grayscale')).toHaveCount(0);
    await expect(voter2.locator('img.grayscale')).toHaveCount(0);

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('participant is removed from session when clicking leave button', async ({ browser }) => {
    // Create a session
    const context1 = await browser.newContext();
    const voter1 = await context1.newPage();

    await voter1.goto('/');
    await voter1.fill('#sessionName', 'Leave Test Sprint');
    await voter1.click('button[type="submit"]');
    await expect(voter1).toHaveURL(/\/session\/[a-f0-9-]+/);
    const sessionUrl = voter1.url();

    // Voter 1 joins
    await voter1.fill('#name', 'Voter1');
    await voter1.click('button[type="submit"]');
    await expect(voter1.getByText('Participants')).toBeVisible();

    // Voter 2 joins the same session
    const context2 = await browser.newContext();
    const voter2 = await context2.newPage();
    await voter2.goto(sessionUrl);
    await voter2.fill('#name', 'Voter2');
    await voter2.click('button[type="submit"]');
    await expect(voter2.getByText('Voter1')).toBeVisible({ timeout: 10000 });
    await expect(voter2.getByText('Voter2')).toBeVisible();

    // Voter1 should see both participants
    await expect(voter1.getByText('Voter2')).toBeVisible({ timeout: 10000 });

    // Voter2 clicks the leave button
    await voter2.locator('button[title="Leave session"]').click();

    // Voter2 should see the join form again
    await expect(voter2.locator('#name')).toBeVisible({ timeout: 10000 });

    // Voter1 should no longer see Voter2 in participants
    await expect(voter1.getByText('Voter2')).not.toBeVisible({ timeout: 10000 });

    // Voter1 should still see themselves
    await expect(voter1.getByText('Voter1')).toBeVisible();

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('participant can close browser and rejoin with same profile', async ({ browser }) => {
    // Create a session and join as voter
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    await page1.goto('/');
    await page1.fill('#sessionName', 'Rejoin Test Sprint');
    await page1.click('button[type="submit"]');
    await expect(page1).toHaveURL(/\/session\/[a-f0-9-]+/);
    const sessionUrl = page1.url();

    // Join as voter
    await page1.fill('#name', 'RejoiningUser');
    await page1.click('button[type="submit"]');
    await expect(page1.getByText('Participants')).toBeVisible();
    await expect(page1.getByText('RejoiningUser')).toBeVisible();

    // Place a vote
    await page1.getByRole('button', { name: '13' }).click();

    // Wait for vote to be registered (card turns Stripe purple)
    await expect(page1.locator('.bg-\\[\\#635bff\\]').first()).toBeVisible();

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
    await expect(page2.getByText('Participants')).toBeVisible();
    await expect(page2.getByText('RejoiningUser')).toBeVisible();

    // Should NOT see the join form
    await expect(page2.locator('#name')).not.toBeVisible();

    // Vote should still be highlighted (card 13 should have the selected style)
    const card13 = page2.getByRole('button', { name: '13' });
    await expect(card13).toHaveClass(/bg-\[#635bff\]/, { timeout: 10000 });

    // Cleanup
    await context2.close();
  });

  test('last occurrence of each estimate value in history is highlighted', async ({ browser }) => {
    // Create a session with 2 voters for reliable consensus
    const context1 = await browser.newContext();
    const voter1 = await context1.newPage();

    await voter1.goto('/');
    await voter1.fill('#sessionName', 'History Highlight Test');
    await voter1.click('button[type="submit"]');
    await expect(voter1).toHaveURL(/\/session\/[a-f0-9-]+/);
    const sessionUrl = voter1.url();

    // Voter 1 joins
    await voter1.fill('#name', 'Voter1');
    await voter1.click('button[type="submit"]');
    await expect(voter1.getByText('Participants')).toBeVisible();

    // Voter 2 joins
    const context2 = await browser.newContext();
    const voter2 = await context2.newPage();
    await voter2.goto(sessionUrl);
    await voter2.fill('#name', 'Voter2');
    await voter2.click('button[type="submit"]');
    await expect(voter2.getByText('Voter1')).toBeVisible({ timeout: 10000 });
    // Brief delay for Pusher events to settle after join
    await voter1.waitForTimeout(200);

    const storyInput = voter1.locator('input[placeholder="Enter story title or ticket number..."]');

    // Add first story with vote "5" (consensus)
    await storyInput.fill('Story A');
    await storyInput.press('Enter');
    // Wait for story to be locked (local indicator that input was processed)
    await expect(voter1.locator('[title="Click to edit"]')).toBeVisible({ timeout: 5000 });
    // Small delay for server sync (fire-and-forget API call)
    await voter1.waitForTimeout(300);
    await voter1.getByRole('button', { name: '5', exact: true }).click();
    await voter2.getByRole('button', { name: '5', exact: true }).click();
    await voter1.getByRole('button', { name: 'Reveal Votes' }).click();
    await expect(voter1.getByText('Consensus!')).toBeVisible({ timeout: 10000 });
    // Wait for history item to appear before proceeding
    await expect(voter1.locator('ul.space-y-2 > li')).toHaveCount(1, { timeout: 10000 });
    await voter1.getByRole('button', { name: 'New Round' }).click();
    // Wait for story input to reappear and be empty (reset complete + Pusher clear event received)
    await expect(storyInput).toBeVisible({ timeout: 5000 });
    await expect(storyInput).toHaveValue('', { timeout: 5000 });
    // Extra delay to ensure any pending Pusher events have been processed
    await voter1.waitForTimeout(200);

    // Add second story with vote "3" (consensus)
    await storyInput.fill('Story B');
    await storyInput.press('Enter');
    // Wait for story to be locked (local indicator that input was processed)
    await expect(voter1.locator('[title="Click to edit"]')).toBeVisible({ timeout: 5000 });
    // Small delay for server sync (fire-and-forget API call)
    await voter1.waitForTimeout(300);
    await voter1.getByRole('button', { name: '3', exact: true }).click();
    await voter2.getByRole('button', { name: '3', exact: true }).click();
    await voter1.getByRole('button', { name: 'Reveal Votes' }).click();
    await expect(voter1.getByText('Consensus!')).toBeVisible({ timeout: 10000 });
    // Wait for history item to appear before proceeding
    await expect(voter1.locator('ul.space-y-2 > li')).toHaveCount(2, { timeout: 10000 });
    await voter1.getByRole('button', { name: 'New Round' }).click();
    // Wait for story input to reappear and be empty (reset complete + Pusher clear event received)
    await expect(storyInput).toBeVisible({ timeout: 5000 });
    await expect(storyInput).toHaveValue('', { timeout: 5000 });
    // Extra delay to ensure any pending Pusher events have been processed
    await voter1.waitForTimeout(200);

    // Add third story with vote "5" (same as first, consensus)
    await storyInput.fill('Story C');
    await storyInput.press('Enter');
    // Wait for story to be locked (local indicator that input was processed)
    await expect(voter1.locator('[title="Click to edit"]')).toBeVisible({ timeout: 5000 });
    // Small delay for server sync (fire-and-forget API call)
    await voter1.waitForTimeout(300);
    await voter1.getByRole('button', { name: '5', exact: true }).click();
    await voter2.getByRole('button', { name: '5', exact: true }).click();
    await voter1.getByRole('button', { name: 'Reveal Votes' }).click();
    await expect(voter1.getByText('Consensus!')).toBeVisible({ timeout: 10000 });

    // History displays newest first: Story C (5), Story B (3), Story A (5)
    // Story C and Story B should be highlighted (last of their vote values)
    // Story A should NOT be highlighted (not the last "5")

    const historyItems = voter1.locator('ul.space-y-2 > li');

    // Wait for all 3 history items to be present before checking highlights
    // Auto-save happens async via Pusher, so we need to wait for all items
    await expect(historyItems).toHaveCount(3, { timeout: 10000 });

    // Story C (first item, newest) should have the highlight border (last "5")
    await expect(historyItems.nth(0)).toHaveClass(/border-l-2/);

    // Story B (second item) should have the highlight border (last "3")
    await expect(historyItems.nth(1)).toHaveClass(/border-l-2/);

    // Story A (third item, oldest) should NOT have the highlight border
    await expect(historyItems.nth(2)).not.toHaveClass(/border-l-2/);

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('bell notification is received by other participants', async ({ browser }) => {
    // Create a session
    const context1 = await browser.newContext();
    const voter1 = await context1.newPage();

    await voter1.goto('/');
    await voter1.fill('#sessionName', 'Bell Test Sprint');
    await voter1.click('button[type="submit"]');
    await expect(voter1).toHaveURL(/\/session\/[a-f0-9-]+/);
    const sessionUrl = voter1.url();

    // Voter 1 joins
    await voter1.fill('#name', 'Voter1');
    await voter1.click('button[type="submit"]');
    await expect(voter1.getByText('Participants')).toBeVisible();

    // Voter 2 joins
    const context2 = await browser.newContext();
    const voter2 = await context2.newPage();
    await voter2.goto(sessionUrl);
    await voter2.fill('#name', 'Voter2');
    await voter2.click('button[type="submit"]');
    await expect(voter2.getByText('Voter1')).toBeVisible({ timeout: 10000 });

    // Set up a promise to detect the shake animation on voter2's page
    const shakeDetected = voter2.waitForFunction(() => {
      const main = document.querySelector('main');
      return main?.classList.contains('animate-shake');
    }, { timeout: 10000 });

    // Voter 1 clicks the bell button
    await voter1.locator('button[title="Ring bell to get attention"]').click();

    // Voter 2's page should shake (the function should resolve when shake class is added)
    await shakeDetected;

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('copy session link button copies URL to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Create a session
    await page.goto('/');
    await page.fill('#sessionName', 'Copy Link Test');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/session\/[a-f0-9-]+/);
    const sessionUrl = page.url();

    // Join as voter
    await page.fill('#name', 'Voter');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Participants')).toBeVisible();

    // Click the copy link button
    await page.locator('button[title="Copy invite link"]').click();

    // Should show "Link copied!" feedback
    await expect(page.getByText('Link copied!')).toBeVisible();

    // Verify clipboard contains the session URL
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(sessionUrl);
  });

  test('user can change avatar', async ({ page }) => {
    // Create a session
    await page.goto('/');
    await page.fill('#sessionName', 'Avatar Test');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/session\/[a-f0-9-]+/);

    // Join as voter
    await page.fill('#name', 'AvatarUser');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Participants')).toBeVisible();

    // Find the user's participant card (contains their name) and get the avatar img inside
    const userCard = page.locator('div').filter({ hasText: /^AvatarUser$/ }).first().locator('..').locator('..');
    const avatarImg = userCard.locator('img').first();
    await expect(avatarImg).toBeVisible({ timeout: 5000 });
    const initialSrc = await avatarImg.getAttribute('src');

    // Click on the participant card to change avatar (title="Click to change avatar")
    await page.locator('[title="Click to change avatar"]').click();

    // Avatar should change (src should be different)
    await expect(avatarImg).not.toHaveAttribute('src', initialSrc!, { timeout: 5000 });
  });

  test('current user profile card is highlighted with purple ring and glow', async ({ browser }) => {
    // Create a session
    const context1 = await browser.newContext();
    const voter1 = await context1.newPage();

    await voter1.goto('/');
    await voter1.fill('#sessionName', 'Profile Highlight Test');
    await voter1.click('button[type="submit"]');
    await expect(voter1).toHaveURL(/\/session\/[a-f0-9-]+/);
    const sessionUrl = voter1.url();

    // Voter 1 joins
    await voter1.fill('#name', 'Voter1');
    await voter1.click('button[type="submit"]');
    await expect(voter1.getByText('Participants')).toBeVisible();

    // Voter 2 joins the same session
    const context2 = await browser.newContext();
    const voter2 = await context2.newPage();
    await voter2.goto(sessionUrl);
    await voter2.fill('#name', 'Voter2');
    await voter2.click('button[type="submit"]');
    await expect(voter2.getByText('Voter1')).toBeVisible({ timeout: 10000 });

    // From Voter1's perspective:
    // - Their own card should have the purple ring (ring-[#635bff])
    // - Their own card should have the "Click to change avatar" title
    // - Voter2's card should NOT have these

    // Voter1's card has the clickable title (only own card is clickable)
    const voter1OwnCard = voter1.locator('[title="Click to change avatar"]');
    await expect(voter1OwnCard).toBeVisible();
    await expect(voter1OwnCard).toHaveCount(1); // Only one card should be clickable

    // The card with ring highlight should contain Voter1's name nearby
    const highlightedCard = voter1.locator('.ring-\\[\\#635bff\\]');
    await expect(highlightedCard).toBeVisible();
    await expect(highlightedCard).toHaveCount(1); // Only one card should be highlighted

    // Verify Voter1's name is purple (highlighted)
    const voter1Name = voter1.locator('span.text-\\[\\#635bff\\]').filter({ hasText: 'Voter1' });
    await expect(voter1Name).toBeVisible();

    // Verify Voter2's name is NOT purple (not highlighted)
    const voter2Name = voter1.locator('span.text-\\[\\#3c4257\\]').filter({ hasText: 'Voter2' });
    await expect(voter2Name).toBeVisible();

    // From Voter2's perspective, the roles are reversed:
    // - Their own card (Voter2) should be highlighted
    // - Voter1's card should NOT be highlighted
    const voter2OwnCard = voter2.locator('[title="Click to change avatar"]');
    await expect(voter2OwnCard).toBeVisible();
    await expect(voter2OwnCard).toHaveCount(1);

    const voter2HighlightedCard = voter2.locator('.ring-\\[\\#635bff\\]');
    await expect(voter2HighlightedCard).toBeVisible();
    await expect(voter2HighlightedCard).toHaveCount(1);

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('custom vote input allows entering custom value', async ({ browser }) => {
    // Create a session with 2 voters
    const context1 = await browser.newContext();
    const voter1 = await context1.newPage();

    await voter1.goto('/');
    await voter1.fill('#sessionName', 'Custom Vote Test');
    await voter1.click('button[type="submit"]');
    await expect(voter1).toHaveURL(/\/session\/[a-f0-9-]+/);
    const sessionUrl = voter1.url();

    // Voter 1 joins
    await voter1.fill('#name', 'Voter1');
    await voter1.click('button[type="submit"]');
    await expect(voter1.getByText('Participants')).toBeVisible();

    // Voter 2 joins
    const context2 = await browser.newContext();
    const voter2 = await context2.newPage();
    await voter2.goto(sessionUrl);
    await voter2.fill('#name', 'Voter2');
    await voter2.click('button[type="submit"]');
    await expect(voter2.getByText('Voter1')).toBeVisible({ timeout: 10000 });

    // Enter a story name
    const storyInput = voter1.locator('input[placeholder="Enter story title or ticket number..."]');
    await storyInput.fill('Custom Value Story');
    await storyInput.press('Enter');

    // Both vote different values
    await voter1.getByRole('button', { name: '5', exact: true }).click();
    await voter2.getByRole('button', { name: '8', exact: true }).click();

    // Reveal votes
    await voter1.getByRole('button', { name: 'Reveal Votes' }).click();
    await expect(voter1.getByText('Average')).toBeVisible({ timeout: 10000 });

    // Enter a custom value in the input field
    const customInput = voter1.locator('input[placeholder="?"]');
    await customInput.fill('7');

    // Click on a result value to save (it should use the custom value)
    const majoritySection = voter1.locator('.border-t.border-\\[\\#e3e8ee\\]');
    await majoritySection.getByText('5').click();

    // History should show the custom value "7" not "5"
    const historyItem = voter1.locator('ul.space-y-2 > li').first();
    await expect(historyItem).toContainText('7');

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('joint majority displays all tied values', async ({ browser }) => {
    // Create a session with 4 voters to create a tie
    const context1 = await browser.newContext();
    const voter1 = await context1.newPage();

    await voter1.goto('/');
    await voter1.fill('#sessionName', 'Joint Majority Test');
    await voter1.click('button[type="submit"]');
    await expect(voter1).toHaveURL(/\/session\/[a-f0-9-]+/);
    const sessionUrl = voter1.url();

    // Voter 1 joins
    await voter1.fill('#name', 'Voter1');
    await voter1.click('button[type="submit"]');
    await expect(voter1.getByText('Participants')).toBeVisible();

    // Voter 2 joins
    const context2 = await browser.newContext();
    const voter2 = await context2.newPage();
    await voter2.goto(sessionUrl);
    await voter2.fill('#name', 'Voter2');
    await voter2.click('button[type="submit"]');
    await expect(voter2.getByText('Voter1')).toBeVisible({ timeout: 10000 });

    // Voter 3 joins
    const context3 = await browser.newContext();
    const voter3 = await context3.newPage();
    await voter3.goto(sessionUrl);
    await voter3.fill('#name', 'Voter3');
    await voter3.click('button[type="submit"]');
    await expect(voter3.getByText('Voter1')).toBeVisible({ timeout: 10000 });

    // Voter 4 joins
    const context4 = await browser.newContext();
    const voter4 = await context4.newPage();
    await voter4.goto(sessionUrl);
    await voter4.fill('#name', 'Voter4');
    await voter4.click('button[type="submit"]');
    await expect(voter4.getByText('Voter1')).toBeVisible({ timeout: 10000 });

    // Create a tie: 2 vote for 5, 2 vote for 8
    await voter1.getByRole('button', { name: '5', exact: true }).click();
    await voter2.getByRole('button', { name: '5', exact: true }).click();
    await voter3.getByRole('button', { name: '8', exact: true }).click();
    await voter4.getByRole('button', { name: '8', exact: true }).click();

    // Reveal votes
    await voter1.getByRole('button', { name: 'Reveal Votes' }).click();

    // Should show "Joint Majority" text
    await expect(voter1.getByText('Joint Majority').first()).toBeVisible({ timeout: 10000 });

    // Both tied values should be displayed
    const majoritySection = voter1.locator('.border-t.border-\\[\\#e3e8ee\\]');
    await expect(majoritySection.getByText('5')).toBeVisible();
    await expect(majoritySection.getByText('8')).toBeVisible();

    // Cleanup
    await context1.close();
    await context2.close();
    await context3.close();
    await context4.close();
  });

  test('empty session name is not allowed', async ({ page }) => {
    await page.goto('/');

    // Submit button should be disabled when session name is empty
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();

    // Try entering whitespace only
    await page.fill('#sessionName', '   ');
    await expect(submitButton).toBeDisabled();

    // Enter valid name
    await page.fill('#sessionName', 'Valid Name');
    await expect(submitButton).toBeEnabled();
  });

  test('empty participant name is not allowed', async ({ page }) => {
    // Create a session
    await page.goto('/');
    await page.fill('#sessionName', 'Validation Test');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/session\/[a-f0-9-]+/);

    // Submit button should be disabled when name is empty
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();

    // Try entering whitespace only
    await page.fill('#name', '   ');
    await expect(submitButton).toBeDisabled();

    // Enter valid name
    await page.fill('#name', 'Valid Name');
    await expect(submitButton).toBeEnabled();
  });

  test('invalid session ID shows error or redirects', async ({ page }) => {
    // Navigate to a non-existent session
    await page.goto('/session/invalid-session-id-12345');

    // Should either show an error message or the join form
    // The app should handle this gracefully
    const hasError = await page.getByText(/not found|error|invalid/i).isVisible().catch(() => false);
    const hasJoinForm = await page.locator('#name').isVisible().catch(() => false);

    // Either an error is shown or the join form is displayed (app handles gracefully)
    expect(hasError || hasJoinForm).toBe(true);
  });
});
