import React from "react";
import { ContentPostWithRelations } from "@/lib/content/types";
import { ContentPostPublicCard } from "./ContentPostPublicCard";

interface ContentPostGridProps {
  posts: ContentPostWithRelations[];
  basePath: string;
  emptyMessage?: string;
}

export const ContentPostGrid: React.FC<ContentPostGridProps> = ({
  posts,
  basePath,
  emptyMessage = "Próximamente encontrarás contenidos de innovación, investigación y avances en ginecología y obstetricia.",
}) => {
  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm space-y-3 my-8 max-w-2xl mx-auto">
        <p className="text-base text-slate-600 font-medium leading-relaxed">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => (
        <ContentPostPublicCard key={post.id} post={post} basePath={basePath} />
      ))}
    </div>
  );
};
