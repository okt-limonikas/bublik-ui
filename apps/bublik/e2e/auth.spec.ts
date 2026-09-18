/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { expect, test } from './support/test';

import { AdminUsersPage } from './pages/admin-users-page';
import { LoginPage } from './pages/login-page';
import { and, given, then, when } from './support/gherkin';
import { adminEmail, adminPassword } from './support/session';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
	test('Signing in with valid credentials opens the dashboard', async ({
		page
	}) => {
		const loginPage = new LoginPage(page);

		await given('I am signed out and on the login page', () =>
			loginPage.goto()
		);
		await when('I sign in with the administrator credentials', () =>
			loginPage.signIn(adminEmail(), adminPassword())
		);
		await then('the dashboard is open', () =>
			expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
		);
	});

	test('Signing in with the wrong password is refused', async ({ page }) => {
		const loginPage = new LoginPage(page);

		await given('I am signed out and on the login page', () =>
			loginPage.goto()
		);
		await when('I sign in with a wrong password', () =>
			loginPage.signIn(adminEmail(), 'definitely-not-the-password')
		);
		await then('the sign-in is reported as failed', () =>
			expect(page.getByText('Failed to login!').first()).toBeVisible({
				timeout: 30_000
			})
		);
		await and('I am still on the login page', () =>
			expect(page).toHaveURL(/\/auth\/login/)
		);
	});

	test('An address that is not an email is rejected before submitting', async ({
		page
	}) => {
		const loginPage = new LoginPage(page);

		await given('I am signed out and on the login page', () =>
			loginPage.goto()
		);
		await when(
			'I try to sign in with something that is not an email address',
			() => loginPage.signIn('not-an-email', 'some-password')
		);
		await then('the form reports the invalid field', () =>
			expect(page.getByTestId('input-error-message').first()).toBeVisible({
				timeout: 15_000
			})
		);
		await and('I am still on the login page', () =>
			expect(page).toHaveURL(/\/auth\/login/)
		);
	});

	test('The login page offers password recovery', async ({ page }) => {
		const loginPage = new LoginPage(page);

		await given('I am signed out and on the login page', () =>
			loginPage.goto()
		);
		await when('I follow the forgot-password link', () =>
			page.getByRole('link', { name: 'Forgot password?' }).click()
		);
		await then('the password recovery page is open', () =>
			expect(page).toHaveURL(/\/auth\/forgot/, { timeout: 15_000 })
		);
	});

	test('Opening a protected page while signed out asks to sign in in place', async ({
		page
	}) => {
		const usersPage = new AdminUsersPage(page);
		const dialog = page.getByTestId('login-dialog');

		await given('I am signed out and open the users page', () =>
			page.goto('admin/users')
		);
		await then('I am asked to sign in', () =>
			expect(dialog).toBeVisible({ timeout: 30_000 })
		);
		await when('I sign in with the administrator credentials', () =>
			new LoginPage(page, dialog).signIn(adminEmail(), adminPassword())
		);
		await then('the sign-in dialog closes', () =>
			expect(dialog).toBeHidden({ timeout: 30_000 })
		);
		await and('I am still on the users page', () =>
			expect(page).toHaveURL(/\/admin\/users/)
		);
		await and("the administrator's own account is listed", () =>
			usersPage.expectUserListed(adminEmail())
		);
	});

	test('Dismissing the sign-in dialog leaves a page that needs it', async ({
		page
	}) => {
		const dialog = page.getByTestId('login-dialog');

		await given('I am signed out and open the users page directly', () =>
			page.goto('admin/users')
		);
		await then('I am told the page needs an administrator', () =>
			expect(
				dialog.getByText('To view this page you need to sign in as an admin.')
			).toBeVisible({ timeout: 30_000 })
		);
		await when('I close the sign-in dialog', () =>
			dialog.getByRole('button', { name: 'Close' }).click()
		);
		await then('the dialog is gone', () => expect(dialog).toBeHidden());
		await and('with nowhere to go back to, the dashboard is open', () =>
			expect(page).toHaveURL(/\/dashboard/)
		);
	});

	test('Public pages do not ask anonymous visitors to sign in', async ({
		page
	}) => {
		const sessionChecked = page.waitForResponse((response) =>
			response.url().includes('/auth/profile/info/')
		);

		await given('I am signed out and open the dashboard', () =>
			page.goto('dashboard')
		);
		await then('the dashboard is open without a sign-in dialog', async () => {
			// The session check is the request anonymous visitors always fail
			const response = await sessionChecked;
			expect(response.status()).toBe(403);
			await expect(page).toHaveURL(/\/dashboard/);
			await expect(page.getByTestId('login-dialog')).toHaveCount(0);
		});
	});
});
