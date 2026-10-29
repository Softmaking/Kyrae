import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Agent } from './agent.entity';
import { AttachmentModelProfiles } from './attachment-model-profile.service';

const VALID_PROFILE = {
  provider: 'HERMES',
  model: 'hermes-agent',
  version: 'profile-v1',
  evidenceVersion: 'evidence-v1',
  modelIdentityVerified: false,
  imageInputVerified: false,
  policyValidated: false,
  privacyValidated: false,
  deploymentValidated: false,
  textAccounting: 'utf8_bytes_upper_bound',
  textAccountingEvidence: 'utf8 byte bound evidence',
  imageTokenUpperBound: 3200,
  imageAccountingEvidence: 'image bound evidence',
  contextWindowTokens: 131072,
};

const hermesAgent = {
  provider: 'HERMES',
  configuration: { model: 'hermes-agent' },
} as unknown as Agent;
const openClawAgent = {
  provider: 'OPENCLAW',
  configuration: { model: 'openclaw-a' },
} as unknown as Agent;

function service(values: Record<string, string> = {}): AttachmentModelProfiles {
  const map: Record<string, string> = {
    ASSISTANT_ATTACHMENT_STORAGE_ROOT: '/tmp/attachments',
    ASSISTANT_ATTACHMENT_WORKER_VALIDATED: 'true',
    ASSISTANT_MODEL_PROFILES_JSON: JSON.stringify([VALID_PROFILE]),
    ...values,
  };
  return new AttachmentModelProfiles({
    get: (key: string, d?: string) => map[key] ?? d,
  } as unknown as ConfigService);
}

describe('AttachmentModelProfiles', () => {
  it('returns null profiles without configuration or with malformed JSON', () => {
    expect(service().profile(hermesAgent)).toEqual(VALID_PROFILE);
    expect(service({ ASSISTANT_MODEL_PROFILES_JSON: '' }).profile(hermesAgent)).toBeNull();
    expect(service({ ASSISTANT_MODEL_PROFILES_JSON: 'no-json' }).profile(hermesAgent)).toBeNull();
    expect(service({ ASSISTANT_MODEL_PROFILES_JSON: '{}' }).profile(hermesAgent)).toBeNull();
  });

  it('rejects profiles with invalid bounds', () => {
    for (const patch of [
      { imageTokenUpperBound: 3300 },
      { contextWindowTokens: 32767 },
      { textAccounting: 'verified_tokenizer' },
      { textAccountingEvidence: '' },
      { imageTokenUpperBound: 0 },
      { contextWindowTokens: 'big' as unknown as number },
    ])
      expect(
        service({
          ASSISTANT_MODEL_PROFILES_JSON: JSON.stringify([{ ...VALID_PROFILE, ...patch }]),
        }).profile(hermesAgent)
      ).toBeNull();
  });

  it('falls back to the hermes default model when the agent configuration has none', () => {
    const agent = { provider: 'HERMES', configuration: {} } as Agent;
    expect(service().capabilities(agent).profileVersion).toBe('profile-v1');
  });

  it('reports all capability gaps for unverified profiles', () => {
    const caps = service().capabilities(openClawAgent);
    expect(caps.available).toBe(false);
    expect(caps.unavailableReasons).toContain('unsupported_provider');
    expect(caps.unavailableReasons).toContain('profile_unverified');
    expect(caps.unavailableReasons).toContain('text_accounting_unavailable');
    expect(caps.unavailableReasons).toContain('image_accounting_unavailable');
    expect(caps.resolvedModel).toBeNull();
    expect(caps.limits.maxFiles).toBe(5);
    expect(caps.limits.maxFileBytes).toBe(20971520);
    expect(caps.limits.maxBatchBytes).toBe(104857600);
    expect(caps.constraints.maxSerializedRequestBytes).toBe(9000000);
    expect(caps.constraints.maxCombinedTextUtf16Units).toBe(60000);
    expect(caps.constraints.invocationDeadlineMs).toBe(120000);
    expect(caps.outputAccountingMode).toBe('utf16_units');
  });

  it('marks capability unavailable when the private worker or storage are not validated', () => {
    const withoutWorker = service({
      ASSISTANT_ATTACHMENT_WORKER_VALIDATED: 'false',
    }).capabilities(hermesAgent);
    expect(withoutWorker.unavailableReasons).toContain('worker_unavailable');

    const withoutStorage = service({ ASSISTANT_ATTACHMENT_STORAGE_ROOT: '' }).capabilities(
      hermesAgent
    );
    expect(withoutStorage.unavailableReasons).toContain('storage_unavailable');
  });

  it('lists verified planes when the profile completes validation', () => {
    const verified = JSON.stringify([
      {
        ...VALID_PROFILE,
        modelIdentityVerified: true,
        imageInputVerified: true,
        policyValidated: true,
        privacyValidated: true,
        deploymentValidated: true,
      },
    ]);
    const caps = service({ ASSISTANT_MODEL_PROFILES_JSON: verified }).capabilities(hermesAgent);
    expect(caps.available).toBe(true);
    expect(caps.imageInputAvailable).toBe(true);
    expect(caps.unavailableReasons).toEqual([]);
    expect(caps.modelIdentityEvidence).toBe('verified');
    expect(caps.imageTransport).toBe('inline-data-url');
    expect(caps.imageTokenUpperBound).toBe(3200);
    expect(caps.textInputAccounting).toBe('conservative_estimate');
  });

  it('asserts provider support and availability explicitly', () => {
    expectCode(
      () => service().assertProvider(openClawAgent),
      'ATTACHMENTS_UNSUPPORTED_PROVIDER',
      409
    );
    expect(() => service().assertProvider(hermesAgent)).not.toThrow();

    const unavailable = service({
      ASSISTANT_ATTACHMENT_WORKER_VALIDATED: 'false',
    });
    expectCode(
      () => unavailable.requireAvailable(hermesAgent),
      'ATTACHMENTS_CAPABILITY_UNAVAILABLE',
      503
    );
    const verified = JSON.stringify([
      {
        ...VALID_PROFILE,
        modelIdentityVerified: true,
        imageInputVerified: true,
        policyValidated: true,
        privacyValidated: true,
        deploymentValidated: true,
      },
    ]);
    expect(
      service({ ASSISTANT_MODEL_PROFILES_JSON: verified }).requireAvailable(hermesAgent)
    ).toEqual({
      ...VALID_PROFILE,
      modelIdentityVerified: true,
      imageInputVerified: true,
      policyValidated: true,
      privacyValidated: true,
      deploymentValidated: true,
    });
  });
});

function expectCode(fn: () => unknown, code: string, status?: number): void {
  let err: unknown;
  try {
    fn();
  } catch (e) {
    err = e;
  }
  expect(err).toBeInstanceOf(HttpException);
  const http = err as HttpException;
  expect((http.getResponse() as { code?: string }).code).toBe(code);
  if (status !== undefined) expect(http.getStatus()).toBe(status);
}
