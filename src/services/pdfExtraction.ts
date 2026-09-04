import { createRequire } from "node:module";

export interface ExtractedPublicationMetadata {
  title: string;
  abstract: string;
  methodology: string;
  researchArea: string;
  keywords: string[];
}

const require = createRequire(import.meta.url);

const normalize = (value: string) =>
  value
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const section = (
  text: string,
  names: string[],
  stopNames: string[],
) => {
  const escaped = names.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const stops = stopNames.length
    ? `(?=\\n\\s*(?:${stopNames.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*[:\\-]?\\s|$)`
    : "$";
  const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:${escaped})\\s*[:\\-]?\\s*([\\s\\S]*?)${stops}`, "i"));
  return match?.[1] ? normalize(match[1]) : "";
};

const firstNonEmptyLine = (text: string) =>
  text
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 5)
    .find((line) => !/^page\s*\d+$/i.test(line)) || "";

export const extractPublicationMetadata = async (
  buffer: Buffer,
): Promise<ExtractedPublicationMetadata> => {
  let pdfParse: ((buffer: Buffer) => Promise<{ text: string }>) | undefined;

  try {
    const module = require("pdf-parse");
    pdfParse = module.default ?? module;
  } catch {
    throw new Error("PDF extraction is not installed on the backend. Install the pdf-parse package to enable automatic metadata extraction.");
  }

  if (!pdfParse) {
    throw new Error("PDF parser is unavailable");
  }

  const parsed = await pdfParse(buffer);
  const text = normalize(parsed.text || "");

  if (!text) {
    throw new Error("No readable text was found in this PDF. Please use a text-based PDF or enter the fields manually.");
  }

  const abstract = section(
    text,
    ["abstract", "summary"],
    ["keywords", "key words", "introduction", "background", "methodology", "methods"],
  );

  const methodology = section(
    text,
    ["methodology", "methods", "research methodology", "materials and methods"],
    ["results", "findings", "discussion", "conclusion", "references"],
  );

  const keywordsRaw = section(
    text,
    ["keywords", "key words", "index terms"],
    ["introduction", "background", "1.", "methodology", "methods"],
  );

  const keywords = keywordsRaw
    .split(/[,;•|]/)
    .map((keyword) => normalize(keyword))
    .filter((keyword) => keyword.length >= 2 && keyword.length <= 80)
    .slice(0, 12);

  const firstLines = text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 30);

  let title = section(
    text,
    ["title", "research title", "paper title"],
    ["abstract", "summary", "keywords", "introduction"],
  );

  if (!title) {
    title = firstLines
      .filter((line) => line.length >= 8 && line.length <= 250)
      .filter((line) => !/@/.test(line))
      .filter((line) => !/^\d+$/.test(line))
      .slice(0, 5)
      .sort((a, b) => b.length - a.length)[0] || firstNonEmptyLine(text);
  }

  const researchArea =
    keywords.slice(0, 3).join(", ") ||
    section(text, ["research area", "subject area", "field of study"], ["abstract", "keywords", "introduction"]).slice(0, 255);

  return {
    title: normalize(title).slice(0, 1000),
    abstract: abstract.slice(0, 10000),
    methodology: methodology.slice(0, 10000),
    researchArea: researchArea.slice(0, 255),
    keywords,
  };
};
