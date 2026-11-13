import React, { useId, useRef, useState } from 'react';
import {
  type BuilderDocument,
  type BundledStyleClass,
  bundleStyleClasses,
  remapDocumentClassIds,
  STYLE_CLASS_BUNDLE_KEY,
  splitStyleClassBundle,
  validateDocument,
} from '@nextcms/builder-core';
import { Button, Dialog, Menu, type MenuItem } from '@nextcms/editor-ui';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileCode,
  FileJson,
  Upload,
} from 'lucide-react';
import { useEditor, useEditorStore } from './context';
import { getStyleClassStore, importStyleClassBundle } from './style-classes';

/**
 * The document as an export file. When it uses style classes, the file also
 * carries them (`styleClasses`), so importing it on another site recreates
 * them (KRK-01).
 */
export function documentExportJson(doc: BuilderDocument): string {
  const store = getStyleClassStore();
  const bundle = store ? bundleStyleClasses(doc, store.getState().classes) : [];
  return JSON.stringify(bundle.length ? { ...doc, [STYLE_CLASS_BUNDLE_KEY]: bundle } : doc, null, 2);
}

export interface JsonExportButtonProps {
  documentName?: string;
  className?: string;
  /** Host-specific export choices (e.g. a whole-site export), listed after the JSON ones. */
  extraItems?: MenuItem[];
}

export function JsonExportButton({
  documentName = 'page-document',
  className = '',
  extraItems = [],
}: JsonExportButtonProps) {
  const store = useEditorStore();
  const doc = useEditor(state => state.doc);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'inspect' | 'import'>('inspect');
  const [copied, setCopied] = useState(false);

  const getDocJsonString = () => documentExportJson(doc);

  const handleDownload = () => {
    const jsonStr = getDocJsonString();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentName.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getDocJsonString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: 'download',
      label: 'Download JSON',
      icon: <Download size={14} />,
      onClick: handleDownload,
    },
    {
      id: 'copy',
      label: copied ? 'Copied!' : 'Copy JSON',
      icon: copied ? <Check size={14} /> : <Copy size={14} />,
      onClick: handleCopy,
    },
    {
      id: 'inspect',
      label: 'Inspect JSON...',
      icon: <FileCode size={14} />,
      onClick: () => {
        setModalTab('inspect');
        setModalOpen(true);
      },
    },
    {
      id: 'import',
      label: 'Import JSON...',
      icon: <Upload size={14} />,
      divider: true,
      onClick: () => {
        setModalTab('import');
        setModalOpen(true);
      },
    },
    ...extraItems.map((item, index) =>
      index === 0 ? { ...item, divider: true } : item
    ),
  ];

  return (
    <>
      <div
        className={`inline-flex items-center rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] shadow-2xs ${className}`}
      >
        <button
          type="button"
          onClick={handleDownload}
          title="Download document JSON"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--ne-text)] hover:bg-[var(--ne-surface-hover)] rounded-l-[var(--ne-radius-md)] transition-colors cursor-pointer"
        >
          <FileJson size={14} className="text-[var(--ne-primary)]" />
          <span>Export</span>
        </button>

        <div className="h-4 w-[1px] bg-[var(--ne-border)]" />

        <Menu
          align="end"
          trigger={
            <button
              type="button"
              aria-label="Export and import options"
              title="Export and import options"
              className="px-1.5 py-1.5 text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] hover:bg-[var(--ne-surface-hover)] rounded-r-[var(--ne-radius-md)] transition-colors cursor-pointer"
            >
              <ChevronDown size={13} className="ne-chevron" />
            </button>
          }
          items={menuItems}
        />
      </div>

      <JsonExportImportDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialTab={modalTab}
        documentName={documentName}
      />
    </>
  );
}

export interface JsonExportImportDialogProps {
  open: boolean;
  onClose: () => void;
  initialTab?: 'inspect' | 'import';
  documentName?: string;
}

export function JsonExportImportDialog({
  open,
  onClose,
  initialTab = 'inspect',
  documentName = 'page-document',
}: JsonExportImportDialogProps) {
  const store = useEditorStore();
  const doc = useEditor(state => state.doc);
  const [tab, setTab] = useState<'inspect' | 'import'>(initialTab);
  const [copied, setCopied] = useState(false);

  // Import state
  const [importText, setImportText] = useState('');
  const [validation, setValidation] = useState<{
    checked: boolean;
    valid: boolean;
    issues?: string[];
    parsedDoc?: any;
    bundle?: BundledStyleClass[];
  }>({ checked: false, valid: false });
  const [applying, setApplying] = useState(false);
  const [importNote, setImportNote] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getDocJsonString = () => documentExportJson(doc);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getDocJsonString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleDownload = () => {
    const jsonStr = getDocJsonString();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentName.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      if (content) {
        setImportText(content);
        validateImport(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const validateImport = (text: string) => {
    if (!text.trim()) {
      setValidation({ checked: false, valid: false });
      return;
    }
    try {
      // A file may carry its style classes next to the document.
      const { document: parsed, bundle } = splitStyleClassBundle(JSON.parse(text));
      const res = validateDocument(parsed);
      if (res.ok) {
        setValidation({
          checked: true,
          valid: true,
          parsedDoc: res.document,
          bundle,
        });
      } else {
        setValidation({
          checked: true,
          valid: false,
          issues: res.issues,
        });
      }
    } catch (err: any) {
      setValidation({
        checked: true,
        valid: false,
        issues: [err?.message || 'Invalid JSON syntax'],
      });
    }
  };

  const handleApplyImport = async () => {
    if (!validation.valid || !validation.parsedDoc || applying) return;
    let next = validation.parsedDoc as BuilderDocument;
    const bundle = validation.bundle ?? [];
    const classStore = getStyleClassStore();
    let warning: string | null = null;
    if (bundle.length && classStore) {
      setApplying(true);
      try {
        // Classes first, so the document can point at this site's ids.
        const result = await importStyleClassBundle(classStore, bundle);
        next = remapDocumentClassIds(next, result.map);
        if (result.failed.length) {
          warning = `Imported, but ${result.failed.length} class${result.failed.length === 1 ? '' : 'es'} could not be created (${result.failed.join(', ')}). Those styles were left out.`;
        }
      } finally {
        setApplying(false);
      }
    }
    // Apply as a single undoable history step
    store.replaceDocument(next, {
      label: 'Import document JSON',
    });
    // Stay open only to show what was left out.
    if (warning) setImportNote(warning);
    else onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="JSON Document"
      description="Inspect the page layout JSON, or load and apply a document file."
      maxWidth="lg"
    >
      <div className="space-y-4 py-1">
        {/* Tab switch */}
        <div className="flex border-b border-[var(--ne-border)] gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('inspect')}
            className={`pb-2.5 cursor-pointer transition-colors border-b-2 -mb-[1px] ${
              tab === 'inspect'
                ? 'border-[var(--ne-primary)] text-[var(--ne-primary)]'
                : 'border-transparent text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]'
            }`}
          >
            Inspect & Export
          </button>
          <button
            type="button"
            onClick={() => setTab('import')}
            className={`pb-2.5 cursor-pointer transition-colors border-b-2 -mb-[1px] ${
              tab === 'import'
                ? 'border-[var(--ne-primary)] text-[var(--ne-primary)]'
                : 'border-transparent text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]'
            }`}
          >
            Import JSON
          </button>
        </div>

        {tab === 'inspect' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--ne-text-muted)]">
                Document data ({Object.keys(doc.nodes || {}).length} nodes)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={copied ? <Check size={13} /> : <Copy size={13} />}
                  onClick={handleCopy}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={<Download size={13} />}
                  onClick={handleDownload}
                >
                  Download .json
                </Button>
              </div>
            </div>

            <div className="relative rounded-md border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] p-3 max-h-[380px] overflow-auto ne-scrollbar font-mono text-[11px] leading-relaxed text-[var(--ne-text)]">
              <pre>{getDocJsonString()}</pre>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--ne-text-muted)]">
                Paste document JSON or select a file to load
              </span>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Upload size={13} />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Load file...
                </Button>
              </div>
            </div>

            <textarea
              rows={11}
              value={importText}
              placeholder="Paste BuilderDocument JSON here..."
              onChange={e => {
                setImportText(e.target.value);
                validateImport(e.target.value);
              }}
              className="w-full rounded-md border border-[var(--ne-border)] bg-[var(--ne-surface)] p-2.5 font-mono text-xs leading-relaxed text-[var(--ne-text)] focus:outline-none focus:ring-1 focus:ring-[var(--ne-primary)] ne-scrollbar"
            />

            {/* Validation Feedback */}
            {validation.checked && (
              <div
                className={`flex items-start gap-2 p-2.5 rounded-md border text-xs ${
                  validation.valid
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
              >
                {validation.valid ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Valid document:</span>{' '}
                      Ready to apply (
                      {Object.keys(validation.parsedDoc?.nodes || {}).length} nodes
                      found).
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Validation failed:</span>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5">
                        {validation.issues?.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}

            {validation.valid && (validation.bundle?.length ?? 0) > 0 && !importNote && (
              <p className="text-xs text-[var(--ne-text-muted)]">
                Includes {validation.bundle?.length} style class
                {validation.bundle?.length === 1 ? '' : 'es'}. Classes with the same name and styles are reused; others are
                added (renamed if the name is taken).
              </p>
            )}
            {importNote && (
              <p role="status" className="text-xs text-[var(--ne-warning,#b45309)]">
                {importNote}
              </p>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={onClose}>
                {importNote ? 'Close' : 'Cancel'}
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={!validation.valid || applying || Boolean(importNote)}
                onClick={() => void handleApplyImport()}
              >
                {applying ? 'Importing…' : 'Apply as One Step'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
