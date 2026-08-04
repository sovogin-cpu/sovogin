import { SupabaseClient } from "@supabase/supabase-js";
import { parseContentBlocks } from "./block-schema";
import { normalizeContentSlug } from "./content-utils";
import {
  ContentCategory,
  ContentChannel,
  ContentPost,
  ContentPostFormData,
  ContentPostFilters,
  ContentPostWithRelations,
  FeaturedMediaSummary,
} from "./types";

const SELECT_POST_RELATIONS = `
  *,
  featured_media:media_items(id, storage_bucket, storage_path, original_filename, alt_text),
  content_post_categories(category_id, content_categories(*))
`;

interface RawCategoryRelation {
  category_id: string;
  content_categories: ContentCategory | null;
}

interface RawPostData extends Omit<ContentPost, "content"> {
  content: unknown;
  featured_media?: FeaturedMediaSummary | null;
  content_post_categories?: RawCategoryRelation[];
}

function mapRawPostToWithRelations(raw: RawPostData): ContentPostWithRelations {
  const parsedContent = parseContentBlocks(raw.content);

  const categories: ContentCategory[] = [];
  if (Array.isArray(raw.content_post_categories)) {
    for (const rel of raw.content_post_categories) {
      if (rel.content_categories) {
        categories.push(rel.content_categories);
      }
    }
  }

  const postBase = { ...raw };
  delete (postBase as Record<string, unknown>).content_post_categories;

  return {
    ...(postBase as ContentPost),
    content: parsedContent,
    categories,
    featured_media: raw.featured_media || null,
  };
}

export async function listContentPosts(
  supabase: SupabaseClient,
  filters?: ContentPostFilters
): Promise<ContentPostWithRelations[]> {
  try {
    let query = supabase
      .from("content_posts")
      .select(SELECT_POST_RELATIONS)
      .order("created_at", { ascending: false });

    if (filters?.channel) {
      query = query.eq("channel", filters.channel);
    }

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.visibility) {
      query = query.eq("visibility", filters.visibility);
    }

    if (filters?.isFeatured !== undefined) {
      query = query.eq("is_featured", filters.isFeatured);
    }

    if (filters?.search && filters.search.trim() !== "") {
      const term = `%${filters.search.trim()}%`;
      query = query.or(`title.ilike.${term},slug.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    let items = ((data as unknown as RawPostData[]) || []).map(
      mapRawPostToWithRelations
    );

    if (filters?.categoryId) {
      items = items.filter((item) =>
        item.categories?.some((cat) => cat.id === filters.categoryId)
      );
    }

    return items;
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al consultar las publicaciones.";
    console.error("Error consultando publicaciones:", message);
    throw new Error(`No fue posible consultar las publicaciones: ${message}`);
  }
}

export async function getContentPostById(
  supabase: SupabaseClient,
  id: string
): Promise<ContentPostWithRelations | null> {
  try {
    const { data, error } = await supabase
      .from("content_posts")
      .select(SELECT_POST_RELATIONS)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return mapRawPostToWithRelations(data as unknown as RawPostData);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al obtener la publicación.";
    console.error(`Error obteniendo publicación ${id}:`, message);
    throw new Error(`No fue posible obtener la publicación: ${message}`);
  }
}

export async function getPublishedContentPostBySlug(
  supabase: SupabaseClient,
  channel: ContentChannel,
  slug: string
): Promise<ContentPostWithRelations | null> {
  try {
    const normalizedSlug = normalizeContentSlug(slug);
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from("content_posts")
      .select(SELECT_POST_RELATIONS)
      .eq("channel", channel)
      .eq("slug", normalizedSlug)
      .eq("status", "published")
      .eq("visibility", "public")
      .or(`published_at.is.null,published_at.lte.${nowIso}`)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return mapRawPostToWithRelations(data as unknown as RawPostData);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al consultar la publicación por slug.";
    console.error("Error consultando publicación por slug:", message);
    throw new Error(
      `No fue posible consultar la publicación solicitada: ${message}`
    );
  }
}

export async function listContentCategories(
  supabase: SupabaseClient,
  channel?: ContentChannel
): Promise<ContentCategory[]> {
  try {
    let query = supabase
      .from("content_categories")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (channel) {
      query = query.or(`channel.eq.${channel},channel.is.null`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data as ContentCategory[]) || [];
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al consultar las categorías de contenido.";
    console.error("Error consultando categorías de contenido:", message);
    throw new Error(
      `No fue posible consultar las categorías de contenido: ${message}`
    );
  }
}

export async function listAllContentCategories(
  supabase: SupabaseClient,
  channel?: ContentChannel | "all"
): Promise<ContentCategory[]> {
  try {
    let query = supabase
      .from("content_categories")
      .select("*")
      .order("name", { ascending: true });

    if (channel && channel !== "all") {
      query = query.or(`channel.eq.${channel},channel.is.null`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data as ContentCategory[]) || [];
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al consultar todas las categorías de contenido.";
    console.error("Error consultando todas las categorías:", message);
    throw new Error(
      `No fue posible consultar todas las categorías de contenido: ${message}`
    );
  }
}

export async function createContentCategory(
  supabase: SupabaseClient,
  payload: {
    channel?: ContentChannel | null;
    name: string;
    slug?: string;
    description?: string | null;
    is_active?: boolean;
  }
): Promise<ContentCategory> {
  try {
    if (!payload.name || payload.name.trim() === "") {
      throw new Error("El nombre de la categoría es obligatorio.");
    }

    const rawSlug = payload.slug || payload.name;
    const normalizedSlug = normalizeContentSlug(rawSlug);
    if (!normalizedSlug) {
      throw new Error("El slug de la categoría no es válido.");
    }

    const insertPayload = {
      channel: payload.channel || null,
      name: payload.name.trim(),
      slug: normalizedSlug,
      description: payload.description?.trim() || null,
      is_active: payload.is_active ?? true,
    };

    const { data, error } = await supabase
      .from("content_categories")
      .insert([insertPayload])
      .select("*")
      .single();

    if (error) throw error;
    if (!data) throw new Error("No se devolvió la categoría creada.");

    return data as ContentCategory;
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al crear la categoría de contenido.";
    console.error("Error creando categoría:", message);
    throw new Error(`No fue posible crear la categoría: ${message}`);
  }
}

export async function updateContentCategory(
  supabase: SupabaseClient,
  id: string,
  payload: {
    channel?: ContentChannel | null;
    name?: string;
    slug?: string;
    description?: string | null;
    is_active?: boolean;
  }
): Promise<ContentCategory> {
  try {
    const updates: Record<string, unknown> = {};

    if (payload.name !== undefined) {
      if (payload.name.trim() === "") {
        throw new Error("El nombre de la categoría no puede estar vacío.");
      }
      updates.name = payload.name.trim();
    }

    if (payload.slug !== undefined || payload.name !== undefined) {
      const rawSlug = payload.slug || payload.name || "";
      if (rawSlug) {
        updates.slug = normalizeContentSlug(rawSlug);
      }
    }

    if (payload.channel !== undefined) {
      updates.channel = payload.channel || null;
    }

    if (payload.description !== undefined) {
      updates.description = payload.description?.trim() || null;
    }

    if (payload.is_active !== undefined) {
      updates.is_active = payload.is_active;
    }

    const { data, error } = await supabase
      .from("content_categories")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    if (!data) throw new Error("No se devolvió la categoría actualizada.");

    return data as ContentCategory;
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al actualizar la categoría.";
    console.error(`Error actualizando categoría ${id}:`, message);
    throw new Error(`No fue posible actualizar la categoría: ${message}`);
  }
}

export async function toggleContentCategoryActive(
  supabase: SupabaseClient,
  id: string,
  is_active: boolean
): Promise<ContentCategory> {
  return updateContentCategory(supabase, id, { is_active });
}

export async function setContentPostCategories(
  supabase: SupabaseClient,
  postId: string,
  categoryIds: string[]
): Promise<void> {
  try {
    // 1. Delete existing relations for post
    const { error: deleteError } = await supabase
      .from("content_post_categories")
      .delete()
      .eq("post_id", postId);

    if (deleteError) throw deleteError;

    // 2. Deduplicate IDs
    const uniqueCategoryIds = Array.from(new Set(categoryIds.filter(Boolean)));
    if (uniqueCategoryIds.length === 0) return;

    // 3. Insert new relations
    const newRows = uniqueCategoryIds.map((categoryId) => ({
      post_id: postId,
      category_id: categoryId,
    }));

    const { error: insertError } = await supabase
      .from("content_post_categories")
      .insert(newRows);

    if (insertError) {
      console.error(
        `Atención: Se eliminaron las relaciones anteriores del post ${postId}, pero ocurrió un error al insertar las nuevas categorías.`,
        insertError
      );
      throw new Error(
        `Error actualizando categorías: las relaciones anteriores fueron eliminadas pero falló la inserción de las nuevas (${insertError.message}).`
      );
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al actualizar las categorías de la publicación.";
    console.error("Error en setContentPostCategories:", message);
    throw new Error(message);
  }
}

export async function createContentPost(
  supabase: SupabaseClient,
  formData: ContentPostFormData
): Promise<ContentPostWithRelations> {
  try {
    if (!formData.title || formData.title.trim() === "") {
      throw new Error("El título de la publicación es obligatorio.");
    }

    const rawSlug = formData.slug || formData.title;
    const normalizedSlug = normalizeContentSlug(rawSlug);
    const validBlocks = parseContentBlocks(formData.content);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const insertPayload = {
      channel: formData.channel,
      title: formData.title.trim(),
      slug: normalizedSlug,
      excerpt: formData.excerpt?.trim() || null,
      content: validBlocks,
      featured_media_id: formData.featured_media_id || null,
      author_id: user?.id || null,
      updated_by: user?.id || null,
      status: formData.status,
      visibility: formData.visibility,
      published_at: formData.published_at || null,
      seo_title: formData.seo_title?.trim() || null,
      seo_description: formData.seo_description?.trim() || null,
      is_featured: formData.is_featured ?? false,
    };

    const { data: newPost, error: insertError } = await supabase
      .from("content_posts")
      .insert([insertPayload])
      .select("id")
      .single();

    if (insertError) throw insertError;
    if (!newPost) throw new Error("No se devolvió el ID del nuevo post.");

    if (formData.categoryIds && formData.categoryIds.length > 0) {
      await setContentPostCategories(supabase, newPost.id, formData.categoryIds);
    }

    const fullPost = await getContentPostById(supabase, newPost.id);
    if (!fullPost) {
      throw new Error("El post fue creado pero no pudo recargarse.");
    }

    return fullPost;
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al crear la publicación.";
    console.error("Error creando publicación:", message);
    throw new Error(`No fue posible crear la publicación: ${message}`);
  }
}

export async function updateContentPost(
  supabase: SupabaseClient,
  id: string,
  formData: Partial<ContentPostFormData>
): Promise<ContentPostWithRelations> {
  try {
    const updates: Record<string, unknown> = {};

    if (formData.title !== undefined) {
      if (formData.title.trim() === "") {
        throw new Error("El título de la publicación no puede estar vacío.");
      }
      updates.title = formData.title.trim();
    }

    if (formData.slug !== undefined || formData.title !== undefined) {
      const rawSlug = formData.slug || formData.title || "";
      if (rawSlug) {
        updates.slug = normalizeContentSlug(rawSlug);
      }
    }

    if (formData.channel !== undefined) updates.channel = formData.channel;
    if (formData.excerpt !== undefined)
      updates.excerpt = formData.excerpt.trim() || null;

    if (formData.content !== undefined) {
      updates.content = parseContentBlocks(formData.content);
    }

    if (formData.featured_media_id !== undefined)
      updates.featured_media_id = formData.featured_media_id || null;

    if (formData.status !== undefined) updates.status = formData.status;
    if (formData.visibility !== undefined)
      updates.visibility = formData.visibility;
    if (formData.published_at !== undefined)
      updates.published_at = formData.published_at || null;
    if (formData.seo_title !== undefined)
      updates.seo_title = formData.seo_title.trim() || null;
    if (formData.seo_description !== undefined)
      updates.seo_description = formData.seo_description.trim() || null;
    if (formData.is_featured !== undefined)
      updates.is_featured = formData.is_featured;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) updates.updated_by = user.id;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("content_posts")
        .update(updates)
        .eq("id", id);

      if (updateError) throw updateError;
    }

    if (formData.categoryIds !== undefined) {
      await setContentPostCategories(supabase, id, formData.categoryIds);
    }

    const fullPost = await getContentPostById(supabase, id);
    if (!fullPost) {
      throw new Error("El post fue actualizado pero no pudo recargarse.");
    }

    return fullPost;
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al actualizar la publicación.";
    console.error(`Error actualizando publicación ${id}:`, message);
    throw new Error(`No fue posible actualizar la publicación: ${message}`);
  }
}

export async function archiveContentPost(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("content_posts")
      .update({
        status: "archived",
        updated_by: user?.id || null,
      })
      .eq("id", id);

    if (error) throw error;
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al archivar la publicación.";
    console.error(`Error archivando publicación ${id}:`, message);
    throw new Error(`No fue posible archivar la publicación: ${message}`);
  }
}
