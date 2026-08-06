import { ContentBlock, ContentBlockType, ContentDocumentMode } from "./types";

export type EditorMode = ContentDocumentMode;

export interface EditorSelection {
  selectedBlockId: string | null;
  editingBlockId: string | null;
}

export type EditorBlockCategory = "Contenido" | "Media" | "Diseño" | "Marketing";

export interface EditorBlockDescriptor {
  type: ContentBlockType;
  label: string;
  description: string;
  category: EditorBlockCategory;
  iconName: string;
  createDefault: () => ContentBlock;
}

export type EditorAction =
  | { type: "SELECT_BLOCK"; payload: { id: string | null } }
  | { type: "SET_EDITING_BLOCK"; payload: { id: string | null } }
  | { type: "ADD_BLOCK"; payload: { block: ContentBlock; targetId?: string } }
  | { type: "DUPLICATE_BLOCK"; payload: { id: string } }
  | { type: "REMOVE_BLOCK"; payload: { id: string } }
  | { type: "MOVE_BLOCK_UP"; payload: { id: string } }
  | { type: "MOVE_BLOCK_DOWN"; payload: { id: string } }
  | { type: "UPDATE_BLOCK"; payload: { block: ContentBlock } };
