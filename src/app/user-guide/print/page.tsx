import type { Metadata } from 'next';
import { GUIDE_CSS, renderGuideBody } from '@/content/user-guide';

export const metadata: Metadata = {
  title: 'User guide (printable)',
  description: 'The complete Meridian user guide on one page, ready to print or save as PDF.',
};

// Lives outside the (site) group: it needs no site header/footer, and with
// path routing `/user-guide` would otherwise be read as a site slug.
export default function UserGuidePrintPage() {
  return (
    <>
      <style>{`body{background:#fff}${GUIDE_CSS}`}</style>
      {/* Hand-written guide markup from src/content/user-guide, not user input. */}
      <div dangerouslySetInnerHTML={{ __html: renderGuideBody() }} />
    </>
  );
}
