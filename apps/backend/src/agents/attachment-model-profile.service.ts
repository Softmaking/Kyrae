import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ASSISTANT_ATTACHMENT_CONSTRAINTS,
  ASSISTANT_ATTACHMENT_POLICY,
} from '@kyrae/shared-contracts';
import type {
  AssistantAttachmentCapabilitiesDto,
  AttachmentCapabilityUnavailableReason,
} from '@kyrae/shared-contracts';
import { Agent } from './agent.entity';
import { attachmentError } from '../assistant-attachments/attachment.errors';

export interface AttachmentModelProfile {
  provider: 'HERMES';
  model: string;
  version: string;
  evidenceVersion: string;
  modelIdentityVerified: boolean;
  imageInputVerified: boolean;
  policyValidated: boolean;
  privacyValidated: boolean;
  deploymentValidated: boolean;
  textAccounting: 'utf8_bytes_upper_bound';
  textAccountingEvidence: string;
  imageTokenUpperBound: number;
  imageAccountingEvidence: string;
  contextWindowTokens: number;
}

@Injectable()
export class AttachmentModelProfiles {
  constructor(private readonly config: ConfigService) {}

  model(agent: Agent): string {
    return typeof agent.configuration?.model === 'string'
      ? agent.configuration.model
      : this.config.get<string>('HERMES_DEFAULT_MODEL', 'hermes-agent');
  }

  profile(agent: Agent): AttachmentModelProfile | null {
    try {
      const values: unknown = JSON.parse(
        this.config.get<string>('ASSISTANT_MODEL_PROFILES_JSON', '[]')
      );
      if (!Array.isArray(values)) return null;
      const p = values.find(
        (v: AttachmentModelProfile) =>
          v?.provider === agent.provider && v.model === this.model(agent)
      ) as AttachmentModelProfile | undefined;
      if (
        !p ||
        ![p.version, p.evidenceVersion, p.textAccountingEvidence, p.imageAccountingEvidence].every(
          (v) => typeof v === 'string' && v.length > 0 && v.length <= 200
        ) ||
        p.textAccounting !== 'utf8_bytes_upper_bound' ||
        !Number.isSafeInteger(p.imageTokenUpperBound) ||
        p.imageTokenUpperBound <= 0 ||
        p.imageTokenUpperBound * 5 > 16_000 ||
        !Number.isSafeInteger(p.contextWindowTokens) ||
        p.contextWindowTokens < 32_768
      )
        return null;
      return p;
    } catch {
      return null;
    }
  }

  capabilities(agent: Agent): AssistantAttachmentCapabilitiesDto {
    const p = this.profile(agent);
    const reasons: AttachmentCapabilityUnavailableReason[] = [];
    if (agent.provider !== 'HERMES') reasons.push('unsupported_provider');
    if (!p)
      reasons.push(
        'profile_unverified',
        'text_accounting_unavailable',
        'image_accounting_unavailable'
      );
    if (p?.modelIdentityVerified !== true) reasons.push('model_identity_unverified');
    if (p?.imageInputVerified !== true) reasons.push('image_input_unverified');
    if (p?.policyValidated !== true) reasons.push('policy_validation_pending');
    if (p?.privacyValidated !== true) reasons.push('privacy_validation_pending');
    if (p?.deploymentValidated !== true) reasons.push('deployment_validation_pending');
    if (this.config.get<string>('ASSISTANT_ATTACHMENT_WORKER_VALIDATED') !== 'true')
      reasons.push('worker_unavailable');
    if (!this.config.get<string>('ASSISTANT_ATTACHMENT_STORAGE_ROOT'))
      reasons.push('storage_unavailable');
    return {
      provider: agent.provider,
      resolvedModel: agent.provider === 'HERMES' ? this.model(agent) : null,
      profileVersion: p?.version ?? null,
      evidenceVersion: p?.evidenceVersion ?? null,
      modelIdentityEvidence: p?.modelIdentityVerified === true ? 'verified' : 'configured',
      available: !reasons.length,
      imageInputAvailable: !reasons.length,
      unavailableReasons: reasons,
      textInputAccounting: p ? 'conservative_estimate' : 'unavailable',
      imageInputAccounting: p ? 'verified_upper_bound' : 'unavailable',
      ...(p ? { imageTokenUpperBound: p.imageTokenUpperBound } : {}),
      outputAccountingMode: 'utf16_units',
      contextWindowTokens: p?.contextWindowTokens ?? null,
      imageTransport: p?.imageInputVerified === true ? 'inline-data-url' : null,
      imageMediaTypes: ['image/jpeg', 'image/png'],
      limits: ASSISTANT_ATTACHMENT_POLICY,
      constraints: ASSISTANT_ATTACHMENT_CONSTRAINTS,
    };
  }

  assertProvider(agent: Agent): void {
    if (agent.provider !== 'HERMES') throw attachmentError('ATTACHMENTS_UNSUPPORTED_PROVIDER');
  }

  requireAvailable(agent: Agent): AttachmentModelProfile {
    this.assertProvider(agent);
    if (!this.capabilities(agent).available)
      throw attachmentError('ATTACHMENTS_CAPABILITY_UNAVAILABLE', 503);
    return this.profile(agent)!;
  }
}
