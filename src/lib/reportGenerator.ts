import jsPDF from "jspdf";
import type { AppState } from "./types";

export function generatePdfReport(state: AppState) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  const addPageIfNeeded = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Title
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageW, 80, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("SkillIQ — Career Readiness Report", margin, 50);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(new Date().toLocaleDateString(), pageW - margin - 80, 50);

  y = 110;
  doc.setTextColor(20, 20, 20);

  // Summary block
  if (state.selectedCareer) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Target Role: ${state.selectedCareer.name}`, margin, y); y += 22;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const desc = doc.splitTextToSize(state.selectedCareer.description, pageW - margin * 2);
    doc.text(desc, margin, y); y += desc.length * 14 + 10;
  }

  // Score
  doc.setFillColor(245, 247, 255);
  doc.rect(margin, y, pageW - margin * 2, 60, "F");
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(99, 102, 241);
  doc.text(`${state.readinessScore}%`, margin + 16, y + 40);
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text(`Career Readiness — ${state.readinessCategory}`, margin + 100, y + 38);
  y += 80;
  doc.setTextColor(20, 20, 20);

  // Verified Skills
  section(doc, "Verified Skills", margin, y); y += 22;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  for (const s of state.skills) {
    addPageIfNeeded(20);
    const v = s.verification;
    doc.text(`• ${s.name}  —  Depth ${s.depth}%  —  ${v}`, margin, y);
    y += 14;
  }
  y += 10;

  // Skill Gaps
  addPageIfNeeded(40);
  section(doc, "Skill Gaps", margin, y); y += 22;
  doc.setFontSize(10);
  if (state.gaps.length === 0) {
    doc.text("No major gaps detected. Excellent work!", margin, y); y += 16;
  } else {
    for (const g of state.gaps) {
      addPageIfNeeded(16);
      doc.text(`• ${g.skill}  —  ${g.status}  —  Priority: ${g.priority}`, margin, y);
      y += 14;
    }
  }
  y += 10;

  // Future skills
  addPageIfNeeded(60);
  section(doc, "Predicted Future Skills (Next 1-2 Years)", margin, y); y += 22;
  doc.setFontSize(10);
  for (const f of state.futureSkills) {
    addPageIfNeeded(14);
    doc.text(`• ${f}`, margin, y); y += 14;
  }
  y += 10;

  // Roadmap
  addPageIfNeeded(60);
  section(doc, "Personalized Learning Roadmap", margin, y); y += 22;
  doc.setFontSize(10);
  for (const step of state.roadmap) {
    addPageIfNeeded(70);
    doc.setFont("helvetica", "bold");
    doc.text(`Step ${step.step}: ${step.title}  (${step.durationWeeks} weeks)`, margin, y); y += 14;
    doc.setFont("helvetica", "normal");
    const desc = doc.splitTextToSize(step.description, pageW - margin * 2);
    doc.text(desc, margin, y); y += desc.length * 12 + 4;
    for (const r of step.resources) {
      addPageIfNeeded(12);
      doc.text(`   – ${r}`, margin, y); y += 12;
    }
    y += 8;
  }

  doc.save("SkillIQ-Report.pdf");
}

function section(doc: jsPDF, title: string, x: number, y: number) {
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(99, 102, 241);
  doc.text(title, x, y);
  doc.setTextColor(20, 20, 20);
}
