// utils/responseFormatter.js

import fetch from "node-fetch";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

export async function extractTextFromUrl(fileUrl) {
  const res = await fetch(fileUrl);
  const contentType = res.headers.get("content-type");

  if (contentType.includes("text") || contentType.includes("json")) {
    return await res.text();
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  if (contentType.includes("pdf")) {
    const pdfParse = (await import("pdf-parse")).default; // dynamic load
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (contentType.includes("officedocument.wordprocessingml.document")) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  if (contentType.includes("spreadsheetml") || contentType.includes("excel")) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
    return data;
  }

  throw new Error(`Unsupported file type: ${contentType}`);
}
