import type { WithSection } from './element';
import { PrivacyRequestClient } from './privacy-request-client';
import { Section, SectionHeading } from './section';

export type PrivacyRequestProps = WithSection & {
  title?: string;
  subtitle?: string;
  allowExport?: boolean;
  allowErase?: boolean;
  submitText?: string;
  successMessage?: string;
};

export function PrivacyRequest(p: PrivacyRequestProps) {
  return (
    <Section section={p.section} editing={p.editing} innerClassName="max-w-2xl">
      <SectionHeading
        elements={p.elements}
        title={p.title ?? 'Privacy request'}
        subtitle={
          p.subtitle ??
          'Request an export of your personal data or ask us to erase it.'
        }
      />
      <PrivacyRequestClient
        allowExport={p.allowExport ?? true}
        allowErase={p.allowErase ?? true}
        submitText={p.submitText || 'Send confirmation link'}
        successMessage={
          p.successMessage ||
          'If that email address is valid, we sent a confirmation link (valid for 24 hours).'
        }
        editing={p.editing}
        elements={p.elements}
      />
    </Section>
  );
}
