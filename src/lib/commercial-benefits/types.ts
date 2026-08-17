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

export interface CommercialBenefitPrivateDetails {
  benefit_id: string;
  discount_code: string | null;
  redemption_instructions: string | null;
  exclusive_link_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AdminCommercialBenefit extends CommercialBenefit {
  discount_code?: string | null;
  redemption_instructions?: string | null;
  exclusive_link_url?: string | null;
}

export interface CommercialBenefitFormData {
  name: string;
  benefit_title: string;
  short_description: string;
  full_description: string | null;
  logo_media_id: string | null;
  promotional_media_id: string | null;
  link_url: string | null;
  discount_code?: string | null;
  redemption_instructions?: string | null;
  exclusive_link_url?: string | null;
  starts_at: string | null;
  ends_at: string | null;
  display_order: number;
  is_active: boolean;
  is_featured: boolean;
}

export interface PortalCommercialBenefit extends CommercialBenefit {
  discount_code?: string | null;
  redemption_instructions?: string | null;
  exclusive_link_url?: string | null;
  logoSignedUrl?: string | null;
  promotionalSignedUrl?: string | null;
}

export interface CommercialBenefitFilters {
  search?: string;
  activeState?: "all" | "active" | "inactive";
  featuredState?: "all" | "featured" | "regular";
  validityState?: "all" | "current" | "upcoming" | "expired" | "undated";
}

export interface CommercialBenefitWithMedia {
  benefit: CommercialBenefit;
  privateDetails?: CommercialBenefitPrivateDetails | null;
  logoMedia?: { id: string; storage_path: string } | null;
  promotionalMedia?: { id: string; storage_path: string } | null;
}

export type CommercialBenefitValidityStatus = "current" | "upcoming" | "expired" | "undated";
