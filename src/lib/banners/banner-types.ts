export type BannerPosition =
  | "EVENTS_HEADER"
  | "INNOVATION_HEADER"
  | "COMMUNITY_HEADER"
  | "RESOURCES_HEADER"
  | "HOME_HERO"
  | "ASSOCIATION_HEADER";

export interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  position: BannerPosition;
  open_in_new_tab: boolean;
  display_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}
