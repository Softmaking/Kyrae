import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const user = { id: 'owner', email: 'fixture@example.test', fullName: 'Attachment fixture', roles: [], permissions: ['ASSISTANT_CHAT_USE', 'ASSISTANT_VOICE_USE'] };
const capabilities = { available: false, provider: 'hermes', resolvedModel: null, profileVersion: null, evidenceVersion: null, modelIdentityEvidence: 'unknown', imageInputAvailable: false, unavailableReasons: ['profile_unverified'], limits: { maxFiles: 5, maxFileBytes: 20971520, maxBatchBytes: 104857600, maxFilenameBytes: 255 } };
const session = { id: 'session', title: 'Historial de archivos', channel: 'web', status: 'active', messageCount: 2, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', lastMessageAt: null };
const attachment = { id: 'attachment', batchId: 'batch', clientFileId: 'file', sessionId: 'session', messageId: 'user-message', originalFilename: 'original.heic', byteSize: 8, mediaType: 'image/heic', category: 'image', lifecycle: 'attached', processingStatus: 'failed', processingVersion: 1, errorCode: 'ATTACHMENT_CONVERSION_FAILED', errorMessage: 'No se pudo convertir esta imagen.', downloadAvailable: true, thumbnailAvailable: false, createdAt: session.createdAt, updatedAt: session.updatedAt };
const userMessage = { id: 'user-message', sessionId: 'session', conversationId: 'session', role: 'user', content: 'Revisa la foto', status: 'completed', channel: 'web', metadata: null, createdAt: session.createdAt, updatedAt: null, attachments: [attachment] };
const assistantMessage = { ...userMessage, id: 'answer', role: 'assistant', content: 'Contenido de prueba; no se invocó ningún modelo.', attachments: [], partialOutput: true, partialOutputReason: 'output_text_limit', partialOutputNotice: 'Salida limitada por el guard de texto.' };

async function authenticate(page: Page) {
  await page.addInitScript(profile => {
    localStorage.setItem('sm_access_token', 'fixture-token');
    localStorage.setItem('sm_user', JSON.stringify(profile));
  }, user);
  await page.routeWebSocket('**/socket.io/**', socket => socket.close());
}

test('offline staging, explicit sixth-file rejection, voice protection and idempotent ambiguous send', async ({ page }) => {
  await authenticate(page);
  const sent: Record<string, unknown>[] = [];
  const uploaded: typeof attachment[] = [];
  await page.route('http://localhost:3000/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const json = (value: unknown, status = 200) => route.fulfill({ status, json: value });
    if (path === '/auth/me') return json(user);
    if (path === '/sessions') return json({ sessions: [], nextCursor: null });
    if (path === '/messages/attachment-capabilities') return json(capabilities);
    if (path === '/messages/upload-batches') return json({ id: 'batch', state: 'open', attachments: [], capabilities });
    if (path === '/messages/upload-batches/batch/files') {
      const body = route.request().postDataBuffer()!.toString();
      const key = /name="clientFileId"\r\n\r\n([^\r]+)/.exec(body)![1];
      const name = /filename="([^"]+)"/.exec(body)![1];
      const file = { ...attachment, id: `file-${uploaded.length}`, clientFileId: key, originalFilename: name, lifecycle: 'ready', processingStatus: 'pending' } as typeof attachment;
      uploaded.push(file);
      return json(file);
    }
    if (path === '/messages/tasks') {
      sent.push(route.request().postDataJSON());
      if (sent.length === 1) return route.abort('failed');
      return json({ id: 'task', sessionId: 'session', status: 'pending', userMessage });
    }
    if (path === '/messages/tasks/task') return json({ id: 'task', status: 'completed', sessionId: 'session', userMessage, assistantMessage });
    return json({ success: true });
  });
  await page.goto('/assistant');
  await expect(page.getByText(/Análisis en vivo no disponible/)).toBeVisible();
  const files = Array.from({ length: 5 }, (_, i) => ({ name: `${i}.heic`, mimeType: 'image/heic', buffer: Buffer.from('original') }));
  await page.getByLabel('Seleccionar archivos').setInputFiles(files);
  await expect(page.getByText('Original cargado; aún no adjunto al mensaje', { exact: false })).toHaveCount(5);
  await page.getByLabel('Seleccionar archivos').setInputFiles({ name: 'six.txt', mimeType: 'text/plain', buffer: Buffer.from('six') });
  await expect(page.getByRole('status').filter({ hasText: 'Máximo 5' })).toBeVisible();
  await page.getByRole('button', { name: 'Hablar', exact: true }).click();
  await expect(page.getByText(/No se pueden combinar audio y archivos/)).toBeVisible();
  await page.getByLabel('Mensaje', { exact: true }).fill('Revisa la foto');
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await expect(page.getByText(/Envío sin confirmar/)).toBeVisible();
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await expect(page.getByText(/Respuesta parcial:/)).toBeVisible();
  expect(sent).toHaveLength(2);
  expect(sent[1]).toEqual(sent[0]);
  expect(sent[0].attachmentIds).toHaveLength(5);
});

test('history preserves failed original download and partial-output notice on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await authenticate(page);
  let authorizedDownload = false;
  await page.route('http://localhost:3000/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/auth/me') return route.fulfill({ json: user });
    if (path === '/sessions') return route.fulfill({ json: { sessions: [session], nextCursor: null } });
    if (path === '/sessions/session/messages') return route.fulfill({ json: { session, messages: [userMessage, assistantMessage] } });
    if (path.endsWith('/content')) {
      authorizedDownload = route.request().headers()['authorization'] === 'Bearer fixture-token';
      return route.fulfill({ contentType: 'application/octet-stream', headers: { 'Content-Disposition': 'attachment; filename="original.heic"' }, body: Buffer.from('original') });
    }
    return route.fulfill({ json: capabilities });
  });
  await page.goto('/assistant');
  await page.getByRole('button', { name: /Historial de archivos/ }).click();
  await expect(page.getByText('No se pudo convertir esta imagen.')).toBeVisible();
  await expect(page.getByText(/Respuesta parcial:/)).toBeVisible();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar original original.heic' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('original.heic');
  expect(authorizedDownload).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: /Historial de archivos/ }).click();
  await expect(page.getByText('No se pudo convertir esta imagen.')).toBeVisible();
  await expect(page.getByText(/Respuesta parcial:/)).toBeVisible();
});
