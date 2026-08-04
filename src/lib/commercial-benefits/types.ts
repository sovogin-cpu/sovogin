export interface CommercialBenefit {
  id: string;
  name: string;
  benefit_title: string;
  short_description: string;
  full_description: string | null;
  logo_media_id: string | null;
  promotional_media_id: string | null;
  link_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  display_order: number;
  is_active: boolean;
  is_featured: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommercialBenefitFormData {
  name: string;
  benefit_title: string;
  short_description: string;
  full_description: string | null;
  logo_media_id: string | null;
  promotional_media_id: string | null;
  link_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  display_order: number;
  is_active: boolean;
  is_featured: boolean;
}

export interface CommercialBenefitFilters {
  search?: string;
  activeState?: "all" | "active" | "inactive";
  featuredState?: "all" | "featured" | "regular";
  validityState?: "all" | "current" | "upcoming" | "expired" | "undated";
}

export interface CommercialBenefitWithMedia {
  benefit: CommercialBenefit;
  logoMedia?: { id: string; storage_path: string } | null;
  promotionalMedia?: { id: string; storage_path: string } | null;
}

export type CommercialBenefitValidityStatus = "current" | "upcoming" | "expired" | "undated";
