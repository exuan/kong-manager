import { expect } from '@playwright/test'
import baseTest from '@pw/base-test'
import { clearKongResources } from '@pw/commands/clearKongResources'
import { clickEntityListAction } from '@pw/commands/clickEntityListAction'
import { createKongResource } from '@pw/commands/createKongResource'
import { fillEntityForm } from '@pw/commands/fillEntityForm'
import { waitAndDismissToasts } from '@pw/commands/waitAndDismissToast'
import { withNavigation } from '@pw/commands/withNavigation'
import pem from '@pw/fixtures/pem'
import { KeyListPage } from '@pw/pages/keys'

const mockJwName = 'jwk-key'
const mockJwKid = 'jwk'
const mockPemName = 'pem-key'
const mockPemKid = 'pemkid'
const mockJwk = '{"kty":"EC", "crv":"P-256", "x":"f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU", "y":"x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0", "kid":"jwk" }'
const mockTags = 'ktags'
const mockKeySetName = 'test-keyset'

const test = baseTest()

test.describe('keys', () => {
  let testKeySet: { id: string } | null = null

  test.beforeAll(async () => {
    await clearKongResources('/keys')
    await clearKongResources('/key-sets')
    testKeySet = (await createKongResource('/key-sets', { name: mockKeySetName }))?.data
  })

  test.beforeEach(async ({ page }) => {
    await new KeyListPage(page).goto()
  })

  test.afterAll(async () => {
    await clearKongResources('/keys')
    await clearKongResources('/key-sets')
  })

  test('cancel a create behavior', async ({ page }) => {
    await withNavigation(page, () => page.locator('.k-table-empty-state .primary').click())

    await withNavigation(page, () => fillEntityForm({
      page,
      formData: {
        'key-form-name': mockJwName,
        'key-form-id': mockJwKid,
        'key-format-container': 'jwk',
        'key-form-jwk': mockJwk,
      },
      method: 'fill',
      withAction: 'cancel',
    }))

    await expect(page.locator('.k-table-empty-state')).toBeVisible()
  })

  test('create a jwk key with required fields only', async ({ page }) => {
    await withNavigation(page, () => page.locator('.k-table-empty-state .primary').click())

    await withNavigation(page, () => fillEntityForm({
      page,
      formData: {
        'key-form-name': mockJwName,
        'key-form-id': mockJwKid,
        'key-format-container': 'jwk',
        'key-form-jwk': mockJwk,
      },
      method: 'fill',
      withAction: 'submit',
    }))
    await waitAndDismissToasts(page)

    await expect(page.locator('.k-table tbody tr')).toHaveCount(1)
    await expect(page.locator('.k-table [data-testid="name"]')).toContainText('-')
    await expect(page.locator('.k-table [data-testid="kid"]')).toContainText(mockJwKid)
    await expect(page.locator('.k-table [data-testid="tags"]')).toHaveText('-')
  })

  test('view keys detail page - 1', async ({ page }) => {
    await withNavigation(page, () => clickEntityListAction(page, 'view'))

    await expect(page.locator('.page-header .title')).toHaveText(`Key: ${mockJwName}`)
    await expect(page.locator('[data-testid="name-plain-text"]')).toHaveText(mockJwName)
    await expect(page.locator('[data-testid="kid-plain-text"]')).toHaveText(mockJwKid)
    await expect(page.locator('[data-testid="tags-badge-tags"]')).toHaveText('')
  })

  test('fill every editable field', async ({ page }) => {
    await withNavigation(page, () => clickEntityListAction(page, 'edit'))

    await fillEntityForm({
      page,
      formData: {
        'key-form-id': mockPemKid,
        'key-form-name': mockPemName,
        'key-form-key-set': testKeySet?.id ?? '',
        'key-form-tags': mockTags,
        'key-format-container': 'pem',
      },
      method: 'fill',
    })

    await withNavigation(page, () => fillEntityForm({
      page,
      formData: {
        'key-form-private-key': pem.privateKey,
        'key-form-public-key': pem.publicKey,
      },
      method: 'fill',
      withAction: 'submit',
    }))

    await waitAndDismissToasts(page)

    await expect(page.locator('.k-table [data-testid="kid"]')).toContainText(mockPemKid)
    await expect(page.locator('.k-table [data-testid="name"]')).toContainText(mockPemName)
    await expect(page.locator('.k-table [data-testid="tags"]')).toHaveText(mockTags)
    await expect(page.locator('.k-table tbody tr')).toHaveCount(1)
  })

  test('view keys detail page - 2', async ({ page }) => {
    await withNavigation(page, () => clickEntityListAction(page, 'view'))
    await expect(page.locator('[data-testid="name-plain-text"]')).toHaveText(mockPemName)
    await expect(page.locator('[data-testid="kid-plain-text"]')).toHaveText(mockPemKid)
    await expect(page.locator('[data-testid="tags-badge-tags"]')).toContainText(mockTags)
  })

  test('edit the key, just keep the required fields', async ({ page }) => {
    await withNavigation(page, () => clickEntityListAction(page, 'edit'))
    await withNavigation(page, () => fillEntityForm({
      page,
      formData: {
        'key-form-name': '',
        'key-form-key-set': '',
        'key-form-tags': '',
      },
      method: 'fill',
      withAction: 'submit',
    }))

    await waitAndDismissToasts(page)

    await expect(page.locator('.k-table [data-testid="name"]')).toContainText('-')
    await expect(page.locator('.k-table [data-testid="kid"]')).toContainText(mockPemKid)
    await expect(page.locator('.k-table [data-testid="tags"]')).toHaveText('-')
  })

  test('view keys detail page - 3', async ({ page }) => {
    await withNavigation(page, () => clickEntityListAction(page, 'view'))
    await expect(page.locator('[data-testid="name-no-value"]')).toHaveText(' – ')
    await expect(page.locator('[data-testid="kid-plain-text"]')).toHaveText(mockPemKid)
    await expect(page.locator('[data-testid="tags-badge-tags"]')).toHaveText('')
  })

  test('keyset in form should be able to auto complete by inputting partial name', async ({ page }) => {
    await withNavigation(page, () => clickEntityListAction(page, 'edit'))

    const selectInput = page.locator('[data-testid="key-form-key-set"]')
    const selectRoot = page.locator('.k-select', { has: selectInput })

    await selectInput.fill('')
    await selectInput.type('test')
    await expect(selectRoot.locator('.k-popover.k-select-popover')).toBeVisible()
    await expect(selectRoot.locator('.k-popover.k-select-popover')).toContainText(mockKeySetName)
  })

  test('keyset in form should be able to auto complete by inputting partial id', async ({ page }) => {
    await withNavigation(page, () => clickEntityListAction(page, 'edit'))

    const selectInput = page.locator('[data-testid="key-form-key-set"]')
    const selectRoot = page.locator('.k-select', { has: selectInput })

    await selectInput.fill('')
    await selectInput.type(testKeySet?.id ?? 'NULL_JUST_PLACEHOLDER')
    await expect(selectRoot.locator('.k-popover.k-select-popover')).toBeVisible()
    await expect(selectRoot.locator('.k-popover.k-select-popover')).toContainText(mockKeySetName)
  })

  test('keyset in form should not able to auto complete by inputting random characters', async ({ page }) => {
    await withNavigation(page, () => clickEntityListAction(page, 'edit'))

    const selectInput = page.locator('[data-testid="key-form-key-set"]')
    const selectRoot = page.locator('.k-select', { has: selectInput })

    await selectInput.fill('')
    await selectInput.type('foooooobarrrrrr')
    await expect(selectRoot.locator('.k-popover.k-select-popover')).toBeVisible()
    await expect(selectRoot.locator('.k-popover.k-select-popover')).not.toContainText(mockKeySetName)
  })

  test('edit should be cancelable', async ({ page }) => {
    await withNavigation(page, () => clickEntityListAction(page, 'edit'))
    await withNavigation(page, () => fillEntityForm({
      page,
      formData: {
        'key-form-id': 'modified!!!',
        'key-form-name': 'modified!!!',
        'key-form-tags': 'modified!!!',
      },
      method: 'fill',
      withAction: 'cancel',
    }))
    await expect(page.locator('.k-table [data-testid="name"]')).toContainText('-')
    await expect(page.locator('.k-table [data-testid="kid"]')).toContainText(mockPemKid)
    await expect(page.locator('.k-table [data-testid="tags"]')).toHaveText('-')
  })

  test('delete a key', async ({ page }) => {
    await clickEntityListAction(page, 'delete')
    await expect(page.locator('.kong-ui-entity-delete-modal .k-modal-dialog')).toBeVisible()
    await page.locator('.kong-ui-entity-delete-modal .k-prompt-proceed').click()
    await waitAndDismissToasts(page)
    await expect(page.locator('.k-table-empty-state')).toBeVisible()
  })

  test('create a key with pem', async ({ page }) => {
    await withNavigation(page, () => page.locator('.kong-ui-entities-keys-list [data-testid="new-key"]').click())
    await withNavigation(page, () => fillEntityForm({
      page,
      formData: {
        'key-form-name': mockPemName,
        'key-form-id': mockPemKid,
        'key-format-container': 'pem',
        'key-form-private-key': pem.privateKey,
        'key-form-public-key': pem.publicKey,
      },
      method: 'fill',
      withAction: 'submit',
    }))
    await waitAndDismissToasts(page)
    await expect(page.locator('.k-table [data-testid="name"]')).toContainText(mockPemName)
    await expect(page.locator('.k-table tbody tr')).toHaveCount(1)
  })

  test('create a key with different jwk.kid and keys.kid should fail', async ({ page }) => {
    await withNavigation(page, () => page.locator('.kong-ui-entities-keys-list [data-testid="toolbar-add-key"]').click())
    await fillEntityForm({
      page,
      formData: {
        'key-form-name': mockPemName,
        'key-form-id': 'notJwk',
        'key-format-container': 'jwk',
        'key-form-jwk': mockJwk,
      },
      method: 'fill',
      withAction: 'submit',
    })
    await expect(page.locator('[data-testid="form-error"] .k-alert-msg-text'))
      .toHaveText('schema violation (kid in jwk.kid must be equal to keys.kid)')
  })

  test('create a key with existing key name should fail', async ({ page }) => {
    await withNavigation(page, () => page.locator('.kong-ui-entities-keys-list [data-testid="toolbar-add-key"]').click())
    await fillEntityForm({
      page,
      formData: {
        'key-form-name': mockPemName,
        'key-form-id': mockPemKid,
        'key-format-container': 'pem',
        'key-form-private-key': pem.privateKey,
        'key-form-public-key': pem.publicKey,
      },
      method: 'fill',
      withAction: 'submit',
    })
    await expect(page.locator('[data-testid="form-error"] .k-alert-msg-text'))
      .toHaveText(`UNIQUE violation detected on '{name="pem-key"}'`)
  })
})
