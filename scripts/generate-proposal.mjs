#!/usr/bin/env node
// Renders attached_assets/proposal_text.txt into client/public/proposal.pdf
// using pdfkit. Heuristic typography: top-level numbered headings ("1. ..."),
// sub-headings ("1.1 ..."), known section labels in bold, body in regular.
import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";

const SRC = "attached_assets/proposal_text.txt";
const OUT = "client/public/proposal.pdf";

const KNOWN_HEADINGS = new Set([
  "Strategic Proposal",
  "Executive Summary",
  "The Proposal in One Paragraph",
  "What This Changes",
  "What This Does Not Change",
  "What I'm Asking the Board to Decide",
]);

function classify(line) {
  const t = line.trim();
  if (!t) return { kind: "blank" };
  if (/^[0-9]+\.\s+[A-Z]/.test(t) && t.length < 80) return { kind: "h1", text: t };
  if (/^[0-9]+\.[0-9]+\s+/.test(t) && t.length < 100) return { kind: "h2", text: t };
  if (/^Phase\s+\d+/i.test(t) && t.length < 80) return { kind: "h2", text: t };
  if (KNOWN_HEADINGS.has(t)) return { kind: "h1", text: t };
  // Short title-case lines (no period) right after blank → subheading
  if (t.length < 80 && !t.endsWith(".") && !t.endsWith(":") && /^[A-Z]/.test(t) &&
      t.split(" ").length <= 10) {
    return { kind: "subtitle", text: t };
  }
  return { kind: "p", text: t };
}

const TEAL = "#0D7377";
const NAVY = "#1A1F2B";
const GOLD = "#D4A843";
const SLATE = "#475569";

const lines = fs.readFileSync(SRC, "utf8").split("\n");
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const doc = new PDFDocument({ size: "LETTER", margins: { top: 72, bottom: 72, left: 72, right: 72 } });
doc.pipe(fs.createWriteStream(OUT));
doc.info.Title = "handləkraft — Strategic Proposal";
doc.info.Author = "Robert Rasmussen";

// Cover
doc.fillColor(NAVY).fontSize(32).font("Helvetica-Bold").text("Strategic Proposal", { align: "left" });
doc.moveDown(0.4);
doc.fillColor(TEAL).fontSize(18).font("Helvetica").text("An Operating Model for handləkraft", { align: "left" });
doc.moveDown(0.2);
doc.fillColor(SLATE).fontSize(14).font("Helvetica-Oblique").text("Building Free Tools, Sustained by Implementation Services");
doc.moveDown(2);
doc.fillColor(NAVY).fontSize(11).font("Helvetica");
doc.text("Prepared for the Board of Directors");
doc.text("From: Robert Rasmussen, Founder & Executive Director");
doc.text("May 2026");
doc.moveDown(1.5);
doc.strokeColor(GOLD).lineWidth(2).moveTo(72, doc.y).lineTo(540, doc.y).stroke();
doc.moveDown(1);

let firstHeading = true;
let lastKind = "blank";

for (const raw of lines) {
  const c = classify(raw);
  if (c.kind === "blank") {
    if (lastKind !== "blank") doc.moveDown(0.4);
    lastKind = "blank";
    continue;
  }
  if (c.kind === "h1") {
    if (!firstHeading) doc.addPage();
    firstHeading = false;
    doc.fillColor(TEAL).font("Helvetica-Bold").fontSize(20).text(c.text, { paragraphGap: 6 });
    doc.strokeColor(GOLD).lineWidth(1).moveTo(72, doc.y).lineTo(180, doc.y).stroke();
    doc.moveDown(0.6);
  } else if (c.kind === "h2") {
    doc.moveDown(0.3);
    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(13).text(c.text, { paragraphGap: 4 });
  } else if (c.kind === "subtitle") {
    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(11.5).text(c.text, { paragraphGap: 4 });
  } else {
    doc.fillColor("#222").font("Helvetica").fontSize(10.5).text(c.text, { align: "left", paragraphGap: 6, lineGap: 2 });
  }
  lastKind = c.kind;
}

// Footer page numbers
const range = doc.bufferedPageRange ? doc.bufferedPageRange() : { start: 0, count: 0 };
for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i);
  doc.fillColor(SLATE).fontSize(9).font("Helvetica").text(
    `handləkraft — Strategic Proposal · Page ${i - range.start + 1}`,
    72, 740, { align: "center", width: 468 }
  );
}

doc.end();
console.log("Wrote", OUT);
