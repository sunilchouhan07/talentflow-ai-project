
const path = require("path");
const mammoth = require("mammoth");
const { PDFParse } = require("pdf-parse");

const MAX_RESUME_SIZE = 5 * 1024 * 1024;

async function extractResumeText(buffer, filename) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Resume file is empty or invalid.");
  }

  if (buffer.length > MAX_RESUME_SIZE) {
    throw new Error("Resume file must be 5 MB or smaller.");
  }

  const extension = path.extname(filename || "").toLowerCase();

  let text = "";

  if (extension === ".pdf") {
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();
      text = result.text || "";
    } finally {
      await parser.destroy();
    }
  } else if (extension === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value || "";
  } else if (extension === ".doc") {
    throw new Error(
      "Legacy DOC files are not supported yet. Please use PDF or DOCX."
    );
  } else {
    throw new Error("Only PDF and DOCX resumes are supported for extraction.");
  }

  text = text
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  if (!text) {
    throw new Error(
      "No readable text was found. The resume may be scanned or image-based."
    );
  }

  return text;
}

module.exports = { extractResumeText };
