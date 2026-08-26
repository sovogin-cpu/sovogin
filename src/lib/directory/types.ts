export interface DoctorSocialLinks {
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  researchgate?: string;
  [key: string]: string | undefined;
}

export interface DoctorDirectoryProfile {
  id: string;
  associate_id: string;
  display_name: string;
  slug?: string | null;
  specialty: string;
  subspecialty: string | null;
  country?: string;
  department?: string | null;
  city: string;
  clinic_name?: string | null;
  public_phone: string | null;
  whatsapp_phone?: string | null;
  public_email: string | null;
  office_address: string | null;
  profile_media_id: string | null;
  bio: string | null;
  website_url: string | null;
  social_links?: DoctorSocialLinks | null;
  telemedicine_available: boolean;
  is_verified?: boolean;
  consent_given_at: string | null;
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface DoctorDirectoryFilters {
  search?: string;
  specialty?: string;
  city?: string;
  country?: string;
  department?: string;
  telemedicineAvailable?: boolean;
  page?: number;
  pageSize?: number;
}

export interface DoctorDirectoryPaginatedResult {
  doctors: DoctorDirectoryProfilePublic[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DoctorDirectoryProfilePublic {
  id: string;
  display_name: string;
  slug?: string | null;
  specialty: string;
  subspecialty: string | null;
  country?: string;
  department?: string | null;
  city: string;
  clinic_name?: string | null;
  public_phone: string | null;
  whatsapp_phone?: string | null;
  public_email: string | null;
  office_address: string | null;
  profile_media_id: string | null;
  bio: string | null;
  website_url: string | null;
  social_links?: DoctorSocialLinks | null;
  telemedicine_available: boolean;
  is_verified?: boolean;
  consent_given_at: string | null;
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface AssociateDirectoryCandidate {
  id: string;
  full_name: string;
  email: string;
  specialty: string | null;
  status: string;
}

export interface DoctorDirectoryAdminProfile extends DoctorDirectoryProfile {
  associate_name?: string;
  associate_status?: string;
}

export interface DoctorProfileFormData {
  associate_id: string;
  display_name: string;
  slug?: string | null;
  specialty: string;
  subspecialty: string | null;
  country?: string;
  department?: string | null;
  city: string;
  clinic_name?: string | null;
  public_phone: string | null;
  whatsapp_phone?: string | null;
  public_email: string | null;
  office_address: string | null;
  profile_media_id: string | null;
  bio: string | null;
  website_url: string | null;
  social_links?: DoctorSocialLinks | null;
  telemedicine_available: boolean;
  is_verified?: boolean;
  consentConfirmed: boolean;
  is_published: boolean;
  display_order: number;
}

export interface AssociateDirectoryProfileSummary {
  id: string;
  associate_id: string;
  is_published: boolean;
  consent_given_at: string | null;
}
