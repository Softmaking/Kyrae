import { expect, test } from '@playwright/test';

test('loads login page', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Ingreso' })).toBeVisible();
});

test('completes login flow and redirects to dashboard', async ({ page }) => {
  await page.route('**/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'token',
        refreshToken: 'refresh',
        tokenType: 'Bearer',
        user: {
          id: 'u-1',
          email: 'admin@softmaking.cl',
          fullName: 'Administrator',
          roles: ['admin'],
          permissions: ['USERS_READ'],
        },
      }),
    });
  });

  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@softmaking.cl');
  await page.getByLabel('Password').fill('ChangeMe123!');
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await expect(page).toHaveURL(/.*dashboard/);
  await expect(page.getByRole('heading', { name: 'Panel IAM' })).toBeVisible();
});
