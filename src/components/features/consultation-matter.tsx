'use client';

import * as React from 'react';
import { FileText, Image as ImageIcon } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { AiBrief, AiBriefSkeleton } from '@/components/features/ai-brief';
import { ViewDocumentButton } from '@/components/features/document-viewer';
import type { MatterDetail, AdvocateConsultation, MatterDocument } from '@/types';

/** One file row in the panel, normalised from either source (matter doc or chat file). */
export interface PanelFile {
  id: string;
  url: string;
  fileType: string; // mime-ish; ViewDocumentButton only needs the "image" prefix
  name: string;
}

/** Best-effort human name from a Cloudinary URL tail, else "Document N". */
function docName(url: string, fallback: string, i: number): string {
  try {
    const tail = decodeURIComponent((url.split('?')[0].split('/').pop() ?? '').trim());
    if (tail && /\.[a-z0-9]{2,5}$/i.test(tail)) return tail;
  } catch {
    /* ignore malformed URL */
  }
  return `${fallback} ${i + 1}`;
}

function FileRow({ file, protect }: { file: PanelFile; protect: boolean }) {
  const isImage = (file.fileType ?? '').toLowerCase().startsWith('image');
  return (
    <li className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2">
      {isImage ? (
        <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
      ) : (
        <FileText className="size-4 shrink-0 text-muted-foreground" />
      )}
      <span className="min-w-0 flex-1 truncate text-sm" title={file.name}>
        {file.name}
      </span>
      <ViewDocumentButton
        url={file.url}
        fileType={file.fileType}
        name={file.name}
        protect={protect}
        className="shrink-0"
      />
    </li>
  );
}

function FileGroup({
  heading, files, protect,
}: {
  heading: string;
  files: PanelFile[];
  protect: boolean;
}) {
  if (files.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{heading}</p>
      <ul className="space-y-2">
        {files.map((f) => (
          <FileRow key={f.id} file={f} protect={protect} />
        ))}
      </ul>
    </div>
  );
}

/**
 * The "Matter" tab of the chat side panel: the associated matter's full AI brief —
 * the citizen's question, classification, legal analysis and citations — via the shared
 * <AiBrief>, so both parties can reference the case without leaving the chat. Files live
 * in their own "Document Vault" tab (see <ConsultationDocuments>).
 *  - Advocate reads the brief off the consultation-detail endpoint (`brief_json`).
 *  - Citizen owns the matter, so reads `/matter/:id` directly (needs `matterId`).
 * `active` gates the fetch so a collapsed/hidden panel doesn't hit the network.
 */
export function ConsultationMatter({
  consultationId,
  isAdvocate,
  matterId,
  active = true,
}: {
  consultationId: string;
  isAdvocate: boolean;
  matterId?: string | null;
  active?: boolean;
}) {
  const advQ = useQuery<AdvocateConsultation>(
    () => api.get(`/advocate/consultations/${consultationId}`),
    [consultationId],
    { enabled: active && isAdvocate },
  );
  const citizenMatterQ = useQuery<MatterDetail>(
    () => api.get(`/matter/${matterId}`),
    [matterId],
    { enabled: active && !isAdvocate && !!matterId },
  );

  // Normalise both sources to a MatterDetail the shared <AiBrief> can render.
  const matter: MatterDetail | null = isAdvocate
    ? advQ.data
      ? {
          matterId: advQ.data.matter_id ?? consultationId,
          status: 'brief_generated',
          query: advQ.data.query_text,
          language: advQ.data.query_language,
          createdAt: advQ.data.requested_at,
          aiResponse: advQ.data.brief_json ?? null,
        }
      : null
    : citizenMatterQ.data ?? null;

  const loadingBrief = isAdvocate
    ? advQ.loading && !advQ.data
    : citizenMatterQ.loading && !citizenMatterQ.data;

  return loadingBrief || !matter ? <AiBriefSkeleton /> : <AiBrief matter={matter} />;
}

/**
 * The "Document Vault" tab: a consolidated, grouped file list for the case — the
 * citizen's MATTER documents (uploaded on the matter page) AND the files shared inside
 * the chat thread. Matter documents come from the consultation-scoped endpoint; chat
 * files are passed in (the chat already holds every message, so no extra fetch).
 * Advocate gets view-only deterrents on the files (matches the in-chat attachment policy).
 */
export function ConsultationDocuments({
  consultationId,
  isAdvocate,
  chatAttachments = [],
  active = true,
}: {
  consultationId: string;
  isAdvocate: boolean;
  chatAttachments?: PanelFile[];
  active?: boolean;
}) {
  const { t } = useLanguage();

  const docsQ = useQuery<MatterDocument[]>(
    () => api.get(`/consultations/${consultationId}/documents`),
    [consultationId],
    { enabled: active },
  );

  const matterFiles: PanelFile[] = (docsQ.data ?? []).map((d, i) => ({
    id: d.documentId,
    url: d.fileUrl,
    fileType: d.fileType,
    name: docName(d.fileUrl, t('chat.panel.document'), i),
  }));
  const protect = isAdvocate;
  const totalFiles = matterFiles.length + chatAttachments.length;

  if (docsQ.loading && !docsQ.data && chatAttachments.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">…</p>;
  }
  if (totalFiles === 0) {
    return <p className="py-2 text-sm text-muted-foreground">{t('chat.panel.noDocuments')}</p>;
  }
  return (
    <div className="space-y-4">
      <FileGroup heading={t('chat.panel.matterDocs')} files={matterFiles} protect={protect} />
      <FileGroup heading={t('chat.panel.chatFiles')} files={chatAttachments} protect={protect} />
    </div>
  );
}
