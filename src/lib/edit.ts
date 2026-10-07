import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { exportPdf, recognizeText } from './actions';
import { docDir, type ScanDoc, setOcrText } from './store';

export type Rect = { originX: number; originY: number; width: number; height: number };

export async function imageSize(uri: string) {
  const ref = await ImageManipulator.manipulate(uri).renderAsync();
  return { width: ref.width, height: ref.height };
}

async function save(ctx: ReturnType<typeof ImageManipulator.manipulate>, compress = 0.92) {
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress });
  return out.uri;
}

export function cropImage(uri: string, rect: Rect) {
  return save(ImageManipulator.manipulate(uri).crop(rect));
}

export function rotateImage(uri: string, degrees: number) {
  return save(ImageManipulator.manipulate(uri).rotate(degrees));
}

/** Downscales to at most `maxSide` px and recompresses. */
export async function compressImage(uri: string, maxSide = 1400, quality = 0.55) {
  const { width, height } = await imageSize(uri);
  const ctx = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > maxSide) ctx.resize(width >= height ? { width: maxSide } : { height: maxSide });
  return save(ctx, quality);
}

/** Splits an open book photo into its left and right pages. */
export async function splitHalves(uri: string) {
  const { width, height } = await imageSize(uri);
  const half = Math.floor(width / 2);
  return [
    await cropImage(uri, { originX: 0, originY: 0, width: half, height }),
    await cropImage(uri, { originX: half, originY: 0, width: width - half, height }),
  ];
}

/** Center-crops to the given width/height ratio (e.g. 35/45 for ID photos). */
export async function cropToRatio(uri: string, ratio: number) {
  const { width, height } = await imageSize(uri);
  let w = width;
  let h = Math.round(width / ratio);
  if (h > height) {
    h = height;
    w = Math.round(height * ratio);
  }
  return cropImage(uri, { originX: Math.round((width - w) / 2), originY: Math.round((height - h) / 2), width: w, height: h });
}

export function fileSize(uri: string) {
  try {
    return new File(uri).size ?? 0;
  } catch {
    return 0;
  }
}

export function docSize(doc: ScanDoc) {
  return doc.pages.reduce((n, p) => n + fileSize(new File(docDir(doc.id), p).uri), 0);
}

function safeName(title: string) {
  return title.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'document';
}

function escapeHtml(v: string) {
  return v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

async function ensureText(doc: ScanDoc) {
  if (doc.ocrText !== undefined) return doc.ocrText;
  const text = await recognizeText(doc);
  await setOcrText(doc.id, text);
  return text;
}

function writeShare(name: string, content: string, mimeType: string, UTI: string) {
  const out = new File(Paths.cache, name);
  if (out.exists) out.delete();
  out.create();
  out.write(content);
  return Sharing.shareAsync(out.uri, { mimeType, UTI });
}

/** Word document (HTML flavour, opened natively by Word, Pages and Google Docs). */
export async function exportWord(doc: ScanDoc) {
  const text = await ensureText(doc);
  const body = text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('\n');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${escapeHtml(doc.title)}</title></head>
<body style="font-family:Calibri,Arial,sans-serif;font-size:11pt"><h1>${escapeHtml(doc.title)}</h1>${body}</body></html>`;
  await writeShare(`${safeName(doc.title)}.doc`, '﻿' + html, 'application/msword', 'com.microsoft.word.doc');
}

/** CSV for Excel: one row per text line, columns split on tabs or runs of 2+ spaces. */
export async function exportExcel(doc: ScanDoc) {
  const text = await ensureText(doc);
  const cell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = text
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => l.split(/\t| {2,}/).map((c) => cell(c.trim())).join(';'))
    .join('\r\n');
  await writeShare(`${safeName(doc.title)}.csv`, '﻿' + csv, 'text/csv', 'public.comma-separated-values-text');
}

export async function printDoc(doc: ScanDoc) {
  const uri = doc.pdf ? new File(docDir(doc.id), doc.pdf).uri : await exportPdf(doc);
  await Print.printAsync({ uri });
}
