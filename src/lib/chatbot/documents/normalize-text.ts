/**
 * Utilidad pura de normalización de texto para RAG
 */

export function normalizeText(text: string): string {
  if (!text) return "";

  return text
    // 1. Normalizar saltos de línea a LF (\n)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")

    // 2. Reemplazar caracteres especiales de espacio y control invisibles por espacio estándar
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]/g, " ")

    // 3. Eliminar espacios al final de cada línea
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")

    // 4. Reducir secuencias de espacios en blanco múltiples dentro de una línea (preservando saltos)
    .replace(/[ \t]{2,}/g, " ")

    // 5. Reducir 3 o más saltos de línea consecutivos a máximo 2 (preserva estructura de párrafos)
    .replace(/\n{3,}/g, "\n\n")

    // 6. Trim inicial y final
    .trim();
}
