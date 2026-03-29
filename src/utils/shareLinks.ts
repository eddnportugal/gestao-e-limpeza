export type ShareEntityType = 'checklist' | 'vistoria' | 'tarefa';

const SHARE_PATHS: Record<ShareEntityType, string> = {
  checklist: 'checklist',
  vistoria: 'vistoria',
  tarefa: 'tarefa',
};

function getBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export function buildPublicShareUrl(type: ShareEntityType, id: string): string {
  const base = getBaseUrl();
  const path = SHARE_PATHS[type];
  return `${base}/${path}/${encodeURIComponent(id)}`;
}

export async function copyShareUrl(url: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = url;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
}

export async function sharePublicLink(title: string, url: string, text?: string): Promise<boolean> {
  if (navigator.share) {
    await navigator.share({ title, text, url });
    return true;
  }

  await copyShareUrl(url);
  return false;
}