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
  filterLabel?: string;
};

export type ExportData = {
  exerciceNom: string;
  exerciceDate: string;
  sessions: ExportSession[];
  filterLabel?: string;
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
  "retrait-epargne":      "Retrait d'épargne",
};

const ALL_TYPES = [
  "emprunt", "remboursement", "solidarite",
  "renflouement", "epargne", "assistance", "paiement-inscription",
  "retrait-epargne",
];

// ─── Écriture de fichier (nouvelle API Expo v54) ──────────────────────────────

const writeBase64ToFile = async (fileName: string, base64Content: string): Promise<string> => {
  const dir = new Directory(Paths.document);
  const file = new File(dir, fileName);
  if (file.exists) {
    file.delete();
  }
  await file.write(base64Content, { encoding: "base64" });
  return file.uri;
};

const writeTextToFile = async (fileName: string, textContent: string): Promise<string> => {
  const dir = new Directory(Paths.document);
  const file = new File(dir, fileName);
  if (file.exists) file.delete();
  await file.write(textContent, { encoding: "utf8" });
  return file.uri;
};

const movePdfToDocument = async (fromUri: string, fileName: string): Promise<string> => {
  const srcFile = new File(fromUri);
  const dir = new Directory(Paths.document);
  const destFile = new File(dir, fileName);
  if (destFile.exists) {
    destFile.delete();
  }
  await srcFile.move(destFile);
  return destFile.uri;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHistoryExport() {
  const [exporting, setExporting] = useState(false);

  // ── Export Excel (HTML stylé enregistré en .xls) ────────────────────────────

  const exportExcel = async (data: ExportData, forSession?: ExportSession) => {
    setExporting(true);
    try {
      const sessions = forSession ? [forSession] : data.sessions;
      const now = new Date();
      const dateStr = now.toLocaleDateString("fr-FR");
      const timeStr = now.toLocaleTimeString("fr-FR");
      const title = forSession
        ? `Rapport — ${forSession.nom}${forSession.filterLabel ? ` · ${forSession.filterLabel}` : ""}`
        : `Rapport — ${data.exerciceNom}${data.filterLabel ? ` · ${data.filterLabel}` : ""}`;

      let html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 20px; }
  h1 { font-size: 20px; font-weight: 800; color: #fff; margin: 0; }
  h2 { font-size: 14px; font-weight: 800; color: #1e293b; margin: 16px 0 8px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }
  .header { background: linear-gradient(135deg, #1e293b, #334155); color: #fff; padding: 18px 24px; border-radius: 10px; margin-bottom: 16px; }
  .header p { color: rgba(255,255,255,0.7); font-size: 10px; margin: 2px 0; }
  .badge { display: inline-block; background: rgba(255,255,255,0.15); padding: 2px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; margin-top: 4px; color: #fff; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; }
  th { background: #f1f5f9; color: #475569; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; padding: 6px 10px; text-align: left; border-bottom: 2px solid #cbd5e1; }
  td { padding: 5px 10px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .amount { text-align: right; font-weight: 700; }
  .zero { color: #94a3b8; font-weight: 400; }
  .sep { border: none; border-top: 1px dashed #94a3b8; margin: 8px 0; }
  .dep { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; }
  .footer { text-align: center; color: #94a3b8; font-size: 9px; margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
  .total-row td { background: #f1f5f9 !important; font-weight: 800; font-size: 11px; border-top: 2px solid #1e293b; }
</style></head><body>

<div class="header">
  <h1>${title}</h1>
  <p>Exercice : ${data.exerciceNom}</p>
  <p>Généré le ${dateStr} à ${timeStr}</p>
  <span class="badge">${sessions.reduce((s, x) => s + x.operations.length, 0)} opération(s)</span>
</div>`;

      for (const sess of sessions) {
        html += `<h2>📊 ${sess.nom} — ${fmtDate(sess.date)}</h2>`;

        // Bilan
        html += `<table>
  <tr><th style="width:70%">Catégorie</th><th style="width:30%">Montant</th></tr>`;
        for (const type of ALL_TYPES) {
          const total = sess.totals[type] ?? 0;
          html += `<tr><td>${TYPE_LABELS[type] ?? type}</td><td class="amount ${total === 0 ? "zero" : ""}">${fmt(total)}</td></tr>`;
        }
        html += `<tr><td colspan="2"><hr class="sep" /></td></tr>`;
        html += `<tr><td class="dep">Collation (agape)</td><td class="amount ${sess.collation === 0 ? "zero" : ""}">${fmt(sess.collation)}</td></tr>`;
        html += `<tr><td class="dep">Dépense suppl.${sess.motifDepense ? ` — ${sess.motifDepense}` : ""}</td><td class="amount ${sess.autreDepense === 0 ? "zero" : ""}">${fmt(sess.autreDepense)}</td></tr>`;
        html += `</table>`;

        // Operations
        if (sess.operations.length > 0) {
          html += `<table>
  <tr><th style="width:22%">Type</th><th style="width:40%">Membre</th><th style="width:22%">Montant</th><th style="width:16%">Date</th></tr>`;
          for (const op of sess.operations) {
            html += `<tr><td style="font-weight:700">${op.typeLabel}</td><td>${op.memberName || "—"}</td><td class="amount">${fmt(op.amount)}</td><td>${fmtDate(op.date)}</td></tr>`;
          }
          const totalOps = sess.operations.reduce((s, o) => s + o.amount, 0);
          html += `<tr class="total-row"><td colspan="2">Total des opérations</td><td class="amount">${fmt(totalOps)}</td><td></td></tr>`;
          html += `</table>`;
        } else {
          html += `<p style="color:#94a3b8;">Aucune opération.</p>`;
        }
      }

      html += `<div class="footer"><p>Rapport généré automatiquement · ${dateStr} à ${timeStr}</p><p>Mutuelle des Enseignants — Document confidentiel</p></div>`;
      html += `</body></html>`;

      const fileUri = await writeTextToFile(
        `${forSession ? `export_${forSession.nom.replace(/\s+/g, "_")}` : `export_${data.exerciceNom.replace(/\s+/g, "_")}`}.xls`,
        html
      );

      await Sharing.shareAsync(fileUri, {
        mimeType: "application/vnd.ms-excel",
        dialogTitle: `Exporter ${title}`,
        UTI: "com.microsoft.excel.xls",
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
        ? `Rapport — ${forSession.nom}${forSession.filterLabel ? ` · ${forSession.filterLabel}` : ""}`
        : `Rapport — ${data.exerciceNom}${data.filterLabel ? ` · ${data.filterLabel}` : ""}`;
      const now = new Date();
      const dateStr = now.toLocaleDateString("fr-FR");
      const timeStr = now.toLocaleTimeString("fr-FR");

      let html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  @page { margin: 20px; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 10px; color: #1e293b; margin: 0; padding: 20px;
    background: #f8fafc;
  }

  /* ── En-tete ── */
  .report-header {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    color: #fff; border-radius: 12px; padding: 24px 28px; margin-bottom: 20px;
  }
  .report-header h1 {
    font-size: 22px; font-weight: 800; margin: 0 0 4px; letter-spacing: -0.5px;
  }
  .report-header .meta {
    color: rgba(255,255,255,0.7); font-size: 11px; margin: 2px 0;
  }
  .report-header .badge {
    display: inline-block; background: rgba(255,255,255,0.15);
    padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700;
    margin-top: 6px; color: #fff;
  }

  /* ── Sections ── */
  .session-section {
    background: #fff; border-radius: 12px; padding: 20px;
    margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    page-break-inside: avoid;
  }
  .session-title {
    font-size: 15px; font-weight: 800; color: #1e293b; margin: 0 0 12px;
    padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;
  }

  /* ── Tableau bilan ── */
  .bilan-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  .bilan-table th {
    background: #f1f5f9; color: #64748b; font-size: 9px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 10px;
    text-align: left; border-bottom: 2px solid #e2e8f0;
  }
  .bilan-table td {
    padding: 5px 10px; border-bottom: 1px solid #f1f5f9; font-size: 10px;
  }
  .bilan-table .label { font-weight: 600; color: #334155; }
  .bilan-table .amount { text-align: right; font-weight: 700; font-size: 11px; }
  .bilan-table .zero { color: #94a3b8; font-weight: 400; }
  .bilan-table .dot { display: inline-block; width: 7px; height: 7px;
                       border-radius: 50%; margin-right: 6px; vertical-align: middle; }

  /* ── Separateur depenses ── */
  .dep-sep { border: none; border-top: 1px dashed #cbd5e1; margin: 10px 0; }
  .dep-label { font-size: 9px; font-weight: 700; color: #94a3b8;
               text-transform: uppercase; letter-spacing: 0.5px; }

  /* ── Tableau operations ── */
  .ops-table { width: 100%; border-collapse: collapse; }
  .ops-table th {
    background: #1e293b; color: #fff; font-size: 9px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.4px; padding: 7px 10px;
    text-align: left;
  }
  .ops-table td {
    padding: 6px 10px; border-bottom: 1px solid #f1f5f9; font-size: 10px;
    vertical-align: middle; color: #1e293b;
  }
  .ops-table tr:nth-child(even) td { background: #fafbfc; }
  .ops-table .type-cell { font-weight: 700; }
  .ops-table .amount-cell { text-align: right; font-weight: 700; font-size: 11px; }
  .ops-table .date-cell { white-space: nowrap; }

  /* ── Pied de page ── */
  .footer {
    text-align: center; color: #94a3b8; font-size: 9px; margin-top: 24px;
    padding-top: 12px; border-top: 1px solid #e2e8f0;
  }
</style></head><body>

<div class="report-header">
  <h1>${title}</h1>
  <p class="meta">Exercice : ${data.exerciceNom}</p>
  <p class="meta">Généré le ${dateStr} à ${timeStr}</p>
  <span class="badge">${sessions.length} session${sessions.length > 1 ? "s" : ""} · ${sessions.reduce((s, x) => s + x.operations.length, 0)} opération${sessions.reduce((s, x) => s + x.operations.length, 0) > 1 ? "s" : ""}</span>
</div>`;

      for (let si = 0; si < sessions.length; si++) {
        const sess = sessions[si];

        html += `<div class="session-section">`;
        html += `<div class="session-title">📊 ${sess.nom} — ${fmtDate(sess.date)}</div>`;

        // ── Bilan ──
        html += `<table class="bilan-table">
  <tr><th>Categorie</th><th style="text-align:right">Montant</th></tr>`;
        for (const type of ALL_TYPES) {
          const total = sess.totals[type] ?? 0;
          html += `<tr>
    <td class="label"><span class="dot" style="background:#64748b"></span>${TYPE_LABELS[type] ?? type}</td>
    <td class="amount ${total === 0 ? "zero" : ""}">${fmt(total)}</td>
  </tr>`;
        }

        html += `<tr><td colspan="2"><hr class="dep-sep" /></td></tr>`;
        html += `<tr><td class="dep-label">Collation (agape)</td>
    <td class="amount ${sess.collation === 0 ? "zero" : ""}">${fmt(sess.collation)}</td></tr>`;
        html += `<tr><td class="dep-label">Dépense supplémentaire${sess.motifDepense ? ` — ${sess.motifDepense}` : ""}</td>
    <td class="amount ${sess.autreDepense === 0 ? "zero" : ""}">${fmt(sess.autreDepense)}</td></tr>`;
        html += `</table>`;

        // ── Operations ──
        if (sess.operations.length === 0) {
          html += `<p style="color:#94a3b8;text-align:center;padding:16px 0;">Aucune opération enregistrée pour cette session.</p>`;
        } else {
          html += `<table class="ops-table">
  <tr><th style="width:22%">Type</th><th style="width:38%">Membre</th><th style="width:22%">Montant</th><th style="width:18%">Date</th></tr>`;
          for (const op of sess.operations) {
            html += `<tr>
    <td class="type-cell">${op.typeLabel}</td>
    <td>${op.memberName || "—"}</td>
    <td class="amount-cell">${fmt(op.amount)}</td>
    <td class="date-cell">${fmtDate(op.date)}</td>
  </tr>`;
          }

          // ── Total operations ──
          const totalOps = sess.operations.reduce((s, o) => s + o.amount, 0);
          html += `<tr style="background:#f8fafc;border-top:2px solid #1e293b;">
    <td colspan="2" style="padding:8px 10px;font-weight:800;font-size:11px;">Total des opérations</td>
    <td style="padding:8px 10px;text-align:right;font-weight:800;font-size:12px;">${fmt(totalOps)}</td>
    <td></td>
  </tr>`;
          html += `</table>`;
        }

        html += `</div>`; // .session-section
      }

      html += `
<div class="footer">
  <p>Rapport généré automatiquement · ${dateStr} à ${timeStr}</p>
  <p>Mutuelle des Enseignants — Document confidentiel</p>
</div>
</body></html>`;

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

  return { showExportMenu, exportExcel, exportPdf, exporting };
}