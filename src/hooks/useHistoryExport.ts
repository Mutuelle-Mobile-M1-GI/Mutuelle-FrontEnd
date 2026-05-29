/**
 * useHistoryExport
 * Compatible Expo v54+ — utilise la nouvelle API File/Directory de expo-file-system
 *
 * Installation :
 *   npx expo install expo-print expo-sharing expo-file-system
 *   npm install xlsx
 */

import { useState } from "react";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File, Directory, Paths } from "expo-file-system/next";
import { Alert } from "react-native";
import XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExportOperation = {
  type: string;
  typeLabel: string;
  memberName: string;
  memberNumero: string;
  amount: number;
  date: string;
};

export type ExportSession = {
  id: string;
  nom: string;
  date: string;
  operations: ExportOperation[];
  totals: Record<string, number>;
  collation: number;
  autreDepense: number;
  motifDepense: string;
};

export type ExportData = {
  exerciceNom: string;
  exerciceDate: string;
  sessions: ExportSession[];
};

// ─── Utilitaires ─────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " FCFA";

const fmtDate = (d: string) => {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("fr-FR"); } catch { return d.slice(0, 10); }
};

const TYPE_LABELS: Record<string, string> = {
  emprunt:                "Emprunt",
  remboursement:          "Remboursement",
  solidarite:             "Solidarite",
  renflouement:           "Renflouement",
  epargne:                "Epargne",
  assistance:             "Assistance",
  "paiement-inscription": "Inscription",
};

const ALL_TYPES = [
  "emprunt", "remboursement", "solidarite",
  "renflouement", "epargne", "assistance", "paiement-inscription",
];

// ─── Écriture de fichier (nouvelle API Expo v54) ──────────────────────────────

const writeBase64ToFile = async (fileName: string, base64Content: string): Promise<string> => {
  const dir = new Directory(Paths.document);
  const file = new File(dir, fileName);
  await file.write(base64Content, { encoding: "base64" });
  return file.uri;
};

const movePdfToDocument = async (fromUri: string, fileName: string): Promise<string> => {
  const srcFile = new File(fromUri);
  const dir = new Directory(Paths.document);
  const destFile = new File(dir, fileName);
  await srcFile.move(destFile);
  return destFile.uri;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHistoryExport() {
  const [exporting, setExporting] = useState(false);

  // ── Export Excel ────────────────────────────────────────────────────────────

  const exportExcel = async (data: ExportData, forSession?: ExportSession) => {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const sessions = forSession ? [forSession] : data.sessions;

      for (const session of sessions) {
        const rows: any[][] = [
          [`Bilan — ${session.nom}`],
          [`Date : ${fmtDate(session.date)}`],
          [],
          ["Categorie", "Montant"],
        ];

        for (const type of ALL_TYPES) {
          rows.push([TYPE_LABELS[type] ?? type, fmt(session.totals[type] ?? 0)]);
        }

        rows.push([]);
        rows.push(["--- Depenses de session ---"]);
        rows.push(["Collation (agape)",      fmt(session.collation)]);
        rows.push(["Depense supplementaire", fmt(session.autreDepense), session.motifDepense || ""]);
        rows.push([]);
        rows.push(["Type", "Membre", "Montant", "Date"]);

        for (const op of session.operations) {
          rows.push([
            op.typeLabel,
            op.memberName + (op.memberNumero ? ` (${op.memberNumero})` : ""),
            op.amount,
            fmtDate(op.date),
          ]);
        }

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!cols"] = [{ wch: 28 }, { wch: 32 }, { wch: 18 }, { wch: 14 }];
        const sheetName = session.nom.replace(/[:\\\/\?\*\[\]]/g, "").slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      const wbout: string = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

      const fileName = forSession
        ? `export_${forSession.nom.replace(/\s+/g, "_")}.xlsx`
        : `export_${data.exerciceNom.replace(/\s+/g, "_")}.xlsx`;

      const fileUri = await writeBase64ToFile(fileName, wbout);

      await Sharing.shareAsync(fileUri, {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: `Exporter ${fileName}`,
        UTI: "com.microsoft.excel.xlsx",
      });
    } catch (e: any) {
      Alert.alert("Erreur export Excel", e?.message ?? "Erreur inconnue");
    } finally {
      setExporting(false);
    }
  };

  // ── Export PDF ──────────────────────────────────────────────────────────────

  const exportPdf = async (data: ExportData, forSession?: ExportSession) => {
    setExporting(true);
    try {
      const sessions = forSession ? [forSession] : data.sessions;
      const title = forSession
        ? `Rapport — ${forSession.nom}`
        : `Rapport — ${data.exerciceNom}`;

      let html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; margin: 24px; }
  h1   { font-size: 16px; margin-bottom: 4px; }
  h2   { font-size: 13px; margin-top: 20px; margin-bottom: 6px;
         border-bottom: 1px solid #333; padding-bottom: 3px; }
  p    { margin: 2px 0; color: #555; font-size: 10px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th   { background: #222; color: #fff; padding: 5px 8px; text-align: left; font-size: 10px; }
  td   { padding: 4px 8px; border-bottom: 1px solid #ddd; font-size: 10px; }
  tr:nth-child(even) td { background: #f5f5f5; }
  .r   { text-align: right; font-weight: bold; }
  .zero { color: #aaa; font-weight: normal; }
  .sep { font-size: 9px; color: #888; font-style: italic; margin-top: 6px; display: block; }
  .pb  { page-break-before: always; }
</style></head><body>
<h1>${title}</h1>
<p>Exercice : ${data.exerciceNom} | Genere le ${new Date().toLocaleDateString("fr-FR")}</p>`;

      for (let si = 0; si < sessions.length; si++) {
        const sess = sessions[si];
        if (si > 0) html += `<div class="pb"></div>`;

        html += `<h2>${sess.nom} — ${fmtDate(sess.date)}</h2>`;
        html += `<table>
  <tr><th colspan="2">Bilan financier</th></tr>`;

        for (const type of ALL_TYPES) {
          const total = sess.totals[type] ?? 0;
          html += `<tr>
    <td>${TYPE_LABELS[type] ?? type}</td>
    <td class="r ${total === 0 ? "zero" : ""}">${fmt(total)}</td>
  </tr>`;
        }

        html += `
  <tr><td colspan="2"><span class="sep">Depenses de session</span></td></tr>
  <tr>
    <td>Collation (agape)</td>
    <td class="r ${sess.collation === 0 ? "zero" : ""}">${fmt(sess.collation)}</td>
  </tr>
  <tr>
    <td>Depense supplem.${sess.motifDepense ? ` — ${sess.motifDepense}` : ""}</td>
    <td class="r ${sess.autreDepense === 0 ? "zero" : ""}">${fmt(sess.autreDepense)}</td>
  </tr>
</table>`;

        if (sess.operations.length === 0) {
          html += `<p style="margin-top:10px;color:#aaa;">Aucune operation.</p>`;
        } else {
          html += `<table style="margin-top:14px;">
  <tr><th>Type</th><th>Membre</th><th>Montant</th><th>Date</th></tr>`;
          for (const op of sess.operations) {
            html += `<tr>
    <td>${op.typeLabel}</td>
    <td>${op.memberName}${op.memberNumero ? ` (${op.memberNumero})` : ""}</td>
    <td class="r">${fmt(op.amount)}</td>
    <td>${fmtDate(op.date)}</td>
  </tr>`;
          }
          html += `</table>`;
        }
      }

      html += `</body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });

      const fileName = forSession
        ? `rapport_${forSession.nom.replace(/\s+/g, "_")}.pdf`
        : `rapport_${data.exerciceNom.replace(/\s+/g, "_")}.pdf`;

      const destUri = await movePdfToDocument(uri, fileName);

      await Sharing.shareAsync(destUri, {
        mimeType: "application/pdf",
        dialogTitle: `Exporter ${fileName}`,
        UTI: "com.adobe.pdf",
      });
    } catch (e: any) {
      Alert.alert("Erreur export PDF", e?.message ?? "Erreur inconnue");
    } finally {
      setExporting(false);
    }
  };

  // ── Menu de choix ───────────────────────────────────────────────────────────

  const showExportMenu = (data: ExportData, forSession?: ExportSession) => {
    const label = forSession ? forSession.nom : data.exerciceNom;
    Alert.alert(
      `Exporter — ${label}`,
      "Choisissez le format",
      [
        { text: "Annuler",       style: "cancel" },
        { text: "Excel (.xlsx)", onPress: () => exportExcel(data, forSession) },
        { text: "PDF",           onPress: () => exportPdf(data, forSession)   },
      ]
    );
  };

  return { showExportMenu, exporting };
}