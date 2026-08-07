export type BlockWidth = "full" | "container" | "narrow";

export type BlockAlignment = "left" | "center" | "right" | "stretch";

export type BlockColumns = 1 | 2 | 3;

export type BlockGap = "none" | "small" | "medium" | "large";

export type BlockSpacing = "none" | "small" | "medium" | "large" | "xl";

export type BlockBackgroundType = "none" | "color" | "image";

export interface BlockBackgroundConfig {
  type: BlockBackgroundType;
  color?: string;
  mediaId?: string;
  overlay?: boolean;
}

export interface BlockResponsiveConfig {
  hideOnMobile: boolean;
  hideOnTablet: boolean;
  hideOnDesktop: boolean;
  mobileColumns?: 1 | 2;
  tabletColumns?: 1 | 2 | 3;
}

export type BlockVisibilityMode = "always" | "members_only" | "public_only";

export interface BlockVisibilityConfig {
  mode: BlockVisibilityMode;
}

export interface BlockLayoutConfig {
  width: BlockWidth;
  alignment: BlockAlignment;
  columns: BlockColumns;
  columnGap: BlockGap;
  paddingTop: BlockSpacing;
  paddingBottom: BlockSpacing;
  marginTop: BlockSpacing;
  marginBottom: BlockSpacing;
  background: BlockBackgroundConfig;
  responsive: BlockResponsiveConfig;
  visibility: BlockVisibilityConfig;
}
