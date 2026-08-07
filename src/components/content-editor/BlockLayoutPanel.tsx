"use client";

import React from "react";
import { ContentBlock } from "@/lib/content/types";
import { LayoutProperties } from "./layout/LayoutProperties";
import { SpacingProperties } from "./layout/SpacingProperties";
import { BackgroundProperties } from "./layout/BackgroundProperties";
import { ResponsiveProperties } from "./layout/ResponsiveProperties";
import { VisibilityProperties } from "./layout/VisibilityProperties";

interface BlockLayoutPanelProps {
  block: ContentBlock;
  onChange: (updatedBlock: ContentBlock) => void;
}

export function BlockLayoutPanel({ block, onChange }: BlockLayoutPanelProps) {
  return (
    <div className="space-y-6">
      <LayoutProperties block={block} onChange={onChange} />
      <SpacingProperties block={block} onChange={onChange} />
      <BackgroundProperties block={block} onChange={onChange} />
      <ResponsiveProperties block={block} onChange={onChange} />
      <VisibilityProperties block={block} onChange={onChange} />
    </div>
  );
}
