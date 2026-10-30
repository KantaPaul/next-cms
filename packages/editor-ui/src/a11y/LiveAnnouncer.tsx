import React, { createContext, useContext, useState, useCallback } from 'react';

interface LiveAnnouncerContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const LiveAnnouncerContext = createContext<LiveAnnouncerContextType | null>(
  null
);

export const LiveAnnouncerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      if (priority === 'assertive') {
        setAssertiveMessage('');
        setTimeout(() => setAssertiveMessage(message), 50);
      } else {
        setPoliteMessage('');
        setTimeout(() => setPoliteMessage(message), 50);
      }
    },
    []
  );

  return (
    <LiveAnnouncerContext.Provider value={{ announce }}>
      {children}
      {/* Screen reader only announcement containers */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {politeMessage}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {assertiveMessage}
      </div>
    </LiveAnnouncerContext.Provider>
  );
};

export const useLiveAnnouncer = () => {
  const ctx = useContext(LiveAnnouncerContext);
  if (!ctx) {
    return {
      announce: (message: string) => {
        // Fallback console log for testing if not inside provider
        console.log('[LiveAnnouncer]', message);
      },
    };
  }
  return ctx;
};

/** The announcer when inside a LiveAnnouncerProvider, else null (no logging fallback). */
export const useOptionalLiveAnnouncer = (): LiveAnnouncerContextType | null =>
  useContext(LiveAnnouncerContext);
