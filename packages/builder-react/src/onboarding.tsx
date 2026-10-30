/**
 * First-run experience (R732 / UXE-22): a start screen (blank, template, or
 * AI), a short guided tour, contextual tips, and a keyboard shortcut sheet.
 */

import { type CSSProperties, useState } from 'react';

const smallButton: CSSProperties = {
  padding: '4px 10px',
  borderRadius: 6,
  border: '1px solid rgba(127,127,127,.35)',
  background: 'transparent',
  color: 'inherit',
  font: '13px/1.4 system-ui, sans-serif',
  cursor: 'pointer',
};

const ACCENT = '#4f46e5';

export type StartScreenOption = {
  id: string;
  label: string;
  description: string;
  icon: string;
  run: () => void;
};

export type OnboardingProps = {
  options: StartScreenOption[];
  onComplete: () => void;
};

export function StartScreen({ options, onComplete }: OnboardingProps) {
  const [tourStep, setTourStep] = useState<number | null>(null);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647,
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        font: '13px/1.4 system-ui, sans-serif',
        color: '#111',
      }}
    >
      {tourStep !== null ? (
        <TourStep step={tourStep} onNext={() => setTourStep(tourStep + 1)} onFinish={() => setTourStep(null)} />
      ) : (
        <>
          <div style={{ padding: '32px 24px', flex: 1 }}>
            <div style={{ font: '600 24px/1.2 system-ui, sans-serif', marginBottom: 8 }}>Welcome to the builder</div>
            <div style={{ font: '15px/1.5 system-ui, sans-serif', opacity: 0.7, marginBottom: 24 }}>
              Start from a blank page, a template, or generate a section with AI.
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {options.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={opt.run}
                  style={{
                    all: 'unset',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '14px 16px',
                    borderRadius: 8,
                    border: '1px solid rgba(127,127,127,.2)',
                    background: 'transparent',
                    color: '#111',
                    font: '14px/1.4 system-ui, sans-serif',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{opt.icon}</span>
                  <div>
                    <div style={{ font: '600 14px/1.4 system-ui, sans-serif' }}>{opt.label}</div>
                    <div style={{ font: '12px/1.4 system-ui, sans-serif', opacity: 0.6 }}>{opt.description}</div>
                  </div>
                </button>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 12 }}>
                <button type="button" onClick={onComplete} style={{ ...smallButton, color: 'rgba(127,127,127,.6)' }}>
                  Skip tour
                </button>
                <button type="button" onClick={() => setTourStep(0)} style={{ ...smallButton, background: 'rgba(79,70,229,.15)', color: ACCENT }}>
                  Guided tour
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TourStep({ step, onNext, onFinish }: { step: number; onNext: () => void; onFinish: () => void }) {
  const steps = [
    {
      title: 'Add a block',
      body: 'Drag from the insert panel or type / on the canvas to insert a block anywhere.',
    },
    {
      title: 'Nest blocks',
      body: 'Drop blocks inside containers, columns, and tabs to build layouts.',
    },
    {
      title: 'Edit for each device',
      body: 'Switch between desktop, tablet, and mobile to set per-device values.',
    },
    {
      title: 'Publish',
      body: 'Save your draft, then publish. Changes go live on save.',
    },
  ];
  const current = steps[step];
  const last = step === steps.length - 1;

  return (
    <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ font: '600 11px/1.4 system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '.04em', opacity: 0.6 }}>Tour {step + 1} of {steps.length}</div>
      <div style={{ font: '600 18px/1.3 system-ui, sans-serif' }}>{current.title}</div>
      <div style={{ font: '14px/1.5 system-ui, sans-serif', opacity: 0.8 }}>{current.body}</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onFinish} style={{ ...smallButton, color: 'rgba(127,127,127,.6)' }}>
          Skip
        </button>
        <button type="button" onClick={last ? onFinish : onNext} style={{ ...smallButton, background: 'rgba(79,70,229,.15)', color: ACCENT }}>
          {last ? 'Finish tour' : 'Next'}
        </button>
      </div>
    </div>
  );
}
