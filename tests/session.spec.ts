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

    // Enter a story name
    await estimator1.fill('input[placeholder="Enter story title or ticket number..."]', 'User Login Feature');

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

    // Enter a story name
    await estimator1.fill('input[placeholder="Enter story title or ticket number..."]', 'Payment Integration');

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

  test('participant shows as offline when browser closes', async ({ browser }) => {
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
});
