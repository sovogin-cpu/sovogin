import { createBlockId, createEmptyAttachmentBlock, createEmptyButtonBlock, createEmptyCtaBlock, createEmptyDividerBlock, createEmptyFormBlock, createEmptyGalleryBlock, createEmptyHeadingBlock, createEmptyHeroBlock, createEmptyImageBlock, createEmptyMapBlock, createEmptyParagraphBlock, createEmptyQuoteBlock, createEmptySpacerBlock, createEmptySponsorsBlock, createEmptyYoutubeBlock } from "./block-schema";
import { EditorBlockDescriptor } from "./editor-types";
import { ContentBlock, ContentBlockType } from "./types";

export function duplicateBlock(
  blocks: ContentBlock[],
  blockId: string
): ContentBlock[] {
  const index = blocks.findIndex((block) => block.id === blockId);
  if (index === -1) return blocks;

  const targetBlock = blocks[index];
  const clonedBlock = JSON.parse(JSON.stringify(targetBlock)) as ContentBlock;
  clonedBlock.id = createBlockId();

  const result = [...blocks];
  result.splice(index + 1, 0, clonedBlock);
  return result;
}

export function moveBlockUp(
  blocks: ContentBlock[],
  blockId: string
): ContentBlock[] {
  const index = blocks.findIndex((block) => block.id === blockId);
  if (index <= 0) return blocks;

  const result = [...blocks];
  const [movedBlock] = result.splice(index, 1);
  result.splice(index - 1, 0, movedBlock);
  return result;
}

export function moveBlockDown(
  blocks: ContentBlock[],
  blockId: string
): ContentBlock[] {
  const index = blocks.findIndex((block) => block.id === blockId);
  if (index === -1 || index >= blocks.length - 1) return blocks;

  const result = [...blocks];
  const [movedBlock] = result.splice(index, 1);
  result.splice(index + 1, 0, movedBlock);
  return result;
}

export function removeBlock(
  blocks: ContentBlock[],
  blockId: string
): ContentBlock[] {
  return blocks.filter((block) => block.id !== blockId);
}

export function insertBlockAfter(
  blocks: ContentBlock[],
  targetBlockId: string,
  newBlock: ContentBlock
): ContentBlock[] {
  const index = blocks.findIndex((block) => block.id === targetBlockId);
  if (index === -1) return [...blocks, newBlock];

  const result = [...blocks];
  result.splice(index + 1, 0, newBlock);
  return result;
}

export function insertBlockAtEnd(
  blocks: ContentBlock[],
  newBlock: ContentBlock
): ContentBlock[] {
  return [...blocks, newBlock];
}

export const ALL_BLOCK_DESCRIPTORS: Record<ContentBlockType, EditorBlockDescriptor> = {
  paragraph: {
    type: "paragraph",
    label: "Párrafo",
    description: "Bloque de texto explicativo o descriptivo",
    category: "Contenido",
    iconName: "AlignLeft",
    createDefault: createEmptyParagraphBlock,
  },
  heading: {
    type: "heading",
    label: "Título",
    description: "Encabezado de sección H2 o H3",
    category: "Contenido",
    iconName: "Heading",
    createDefault: createEmptyHeadingBlock,
  },
  quote: {
    type: "quote",
    label: "Cita",
    description: "Frase destacada o testimonio",
    category: "Contenido",
    iconName: "Quote",
    createDefault: createEmptyQuoteBlock,
  },
  attachment: {
    type: "attachment",
    label: "Archivo adjunto",
    description: "Enlace a documento descargable",
    category: "Contenido",
    iconName: "Paperclip",
    createDefault: createEmptyAttachmentBlock,
  },
  image: {
    type: "image",
    label: "Imagen",
    description: "Imagen individual desde la biblioteca multimedia",
    category: "Media",
    iconName: "Image",
    createDefault: createEmptyImageBlock,
  },
  gallery: {
    type: "gallery",
    label: "Galería de fotos",
    description: "Colección de imágenes en cuadrícula",
    category: "Media",
    iconName: "Images",
    createDefault: createEmptyGalleryBlock,
  },
  youtube: {
    type: "youtube",
    label: "Video de YouTube",
    description: "Incrustación de video desde YouTube",
    category: "Media",
    iconName: "Video",
    createDefault: createEmptyYoutubeBlock,
  },
  hero: {
    type: "hero",
    label: "Encabezado Principal",
    description: "Sección de impacto con título, fondo y botones",
    category: "Diseño",
    iconName: "LayoutTemplate",
    createDefault: createEmptyHeroBlock,
  },
  button: {
    type: "button",
    label: "Botón",
    description: "Botón de acción con enlace personalizado",
    category: "Diseño",
    iconName: "MousePointerClick",
    createDefault: createEmptyButtonBlock,
  },
  spacer: {
    type: "spacer",
    label: "Espaciador",
    description: "Espacio vertical para separar contenidos",
    category: "Diseño",
    iconName: "ArrowUpDown",
    createDefault: createEmptySpacerBlock,
  },
  divider: {
    type: "divider",
    label: "Separador",
    description: "Línea horizontal divisoria",
    category: "Diseño",
    iconName: "Minus",
    createDefault: createEmptyDividerBlock,
  },
  cta: {
    type: "cta",
    label: "Llamado a la Acción",
    description: "Tarjeta de conversión para invitar a la acción",
    category: "Marketing",
    iconName: "Megaphone",
    createDefault: createEmptyCtaBlock,
  },
  sponsors: {
    type: "sponsors",
    label: "Patrocinadores",
    description: "Muestra de marcas y aliados comerciales",
    category: "Marketing",
    iconName: "Award",
    createDefault: createEmptySponsorsBlock,
  },
  form: {
    type: "form",
    label: "Formulario",
    description: "Formulario de contacto o captura de datos",
    category: "Marketing",
    iconName: "FormInput",
    createDefault: createEmptyFormBlock,
  },
  map: {
    type: "map",
    label: "Mapa",
    description: "Mapa interactivo con dirección de sede",
    category: "Marketing",
    iconName: "MapPin",
    createDefault: createEmptyMapBlock,
  },
};
