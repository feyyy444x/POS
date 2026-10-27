import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 100 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["video/mp4", "video/webm", "video/ogg"]);

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const authorization = req.headers.get("Authorization") || "";
  const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return response({ error: "Login diperlukan." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return response({ error: "Konfigurasi fungsi upload belum lengkap." }, 500);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userResult, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !userResult.user) return response({ error: "Sesi login tidak valid." }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return response({ error: "Format permintaan tidak valid." }, 400);
  }

  const action = body.action;
  const storeId = typeof body.store_id === "string" ? body.store_id : "";
  const mediaId = typeof body.media_id === "string" ? body.media_id : "";
  if (!storeId || !/^[0-9a-f-]{36}$/i.test(storeId)) {
    return response({ error: "Identitas toko tidak valid." }, 400);
  }

  const [{ data: membership, error: membershipError }, { data: store, error: storeError }] = await Promise.all([
    admin.from("store_members").select("role,is_active,disabled_at")
      .eq("store_id", storeId).eq("user_id", userResult.user.id).maybeSingle(),
    admin.from("stores").select("id,status,expires_at").eq("id", storeId).maybeSingle(),
  ]);

  if (membershipError || storeError) return response({ error: "Gagal memeriksa akses toko." }, 500);
  if (!membership || membership.is_active !== true || membership.disabled_at !== null || !["owner", "admin"].includes(membership.role)) {
    return response({ error: "Hanya Owner/Admin aktif yang dapat mengelola media TV." }, 403);
  }
  if (!store || store.status !== "active" || (store.expires_at && new Date(store.expires_at).getTime() <= Date.now())) {
    return response({ error: "Toko tidak aktif atau masa aktifnya berakhir." }, 403);
  }

  if (action === "reserve") {
    // Reclaim abandoned reservations before allocating new quota. Expired pending rows
    // are excluded by the database quota trigger and must not remain visible to the TV.
    const { data: expiredRows } = await admin.from("store_tv_media")
      .select("id,storage_path")
      .eq("store_id", storeId)
      .eq("media_type", "upload")
      .eq("upload_status", "pending")
      .lt("reservation_expires_at", new Date().toISOString());
    if (expiredRows?.length) {
      const expiredPaths = expiredRows.map((row: { storage_path: string | null }) => row.storage_path).filter((path: string | null): path is string => Boolean(path));
      if (expiredPaths.length) await admin.storage.from("tv-media").remove(expiredPaths);
      await admin.from("store_tv_media").delete().eq("store_id", storeId).in("id", expiredRows.map((row: { id: string }) => row.id));
    }

    const title = typeof body.title === "string" ? body.title.trim().slice(0, 160) : "";
    const mimeType = typeof body.mime_type === "string" ? body.mime_type : "";
    const fileSize = Number(body.file_size_bytes);
    const fileName = typeof body.file_name === "string" ? body.file_name : "video.mp4";
    if (!title || !ALLOWED_TYPES.has(mimeType) || !Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > MAX_BYTES) {
      return response({ error: "Nama, format video, atau ukuran berkas tidak valid." }, 400);
    }

    const safeName = fileName.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100) || "video.mp4";
    const path = storeId + "/" + crypto.randomUUID() + "-" + safeName;
    const publicUrl = admin.storage.from("tv-media").getPublicUrl(path).data.publicUrl;

    // Insert first: the database quota trigger takes a per-store advisory lock and reserves bytes
    // before a signed upload URL can be issued, preventing parallel requests from oversubscribing.
    const { data: media, error: insertError } = await admin.from("store_tv_media").insert({
      store_id: storeId,
      media_type: "upload",
      title,
      source_url: publicUrl,
      storage_path: path,
      mime_type: mimeType,
      file_size_bytes: fileSize,
      upload_status: "pending",
      reservation_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      sort_order: 0,
      is_active: true,
    }).select("id,store_id,title,source_url,storage_path,mime_type,file_size_bytes,media_type,sort_order,is_active,created_at,updated_at").single();

    if (insertError || !media) {
      const isQuota = /Kuota video tenant maksimal 100 MB/i.test(insertError?.message || "");
      return response({ error: isQuota ? "Kuota video tenant maksimal 100 MB. Hapus video lama terlebih dahulu." : "Tidak dapat menyiapkan upload video." }, isQuota ? 413 : 400);
    }

    const { data: signed, error: signedError } = await admin.storage.from("tv-media").createSignedUploadUrl(path);
    if (signedError || !signed) {
      await admin.from("store_tv_media").delete().eq("id", media.id).eq("store_id", storeId);
      return response({ error: "Tidak dapat membuat tautan upload aman." }, 500);
    }
    return response({ media, path, token: signed.token });
  }

  if (action === "complete") {
    if (!mediaId) return response({ error: "ID media tidak valid." }, 400);
    const { data: media, error: mediaError } = await admin.from("store_tv_media")
      .select("id,store_id,storage_path,file_size_bytes,mime_type,upload_status,reservation_expires_at")
      .eq("id", mediaId).eq("store_id", storeId).eq("media_type", "upload").maybeSingle();
    if (mediaError) return response({ error: "Gagal memeriksa media." }, 500);
    if (!media?.storage_path || !media.storage_path.startsWith(storeId + "/")) return response({ error: "Reservasi upload tidak ditemukan." }, 404);
    if (media.upload_status !== "pending" || (media.reservation_expires_at && new Date(media.reservation_expires_at).getTime() <= Date.now())) {
      await admin.storage.from("tv-media").remove([media.storage_path]);
      await admin.from("store_tv_media").delete().eq("id", mediaId).eq("store_id", storeId);
      return response({ error: "Reservasi upload sudah kedaluwarsa. Silakan unggah ulang." }, 410);
    }

    const folder = storeId;
    const filename = media.storage_path.slice(folder.length + 1);
    const { data: objects, error: listError } = await admin.storage.from("tv-media").list(folder, {
      search: filename,
      limit: 100,
    });
    const object = objects?.find((entry: { name: string }) => entry.name === filename);
    if (listError || !object) return response({ error: "Video belum ditemukan setelah upload." }, 400);

    const actualSize = Number(object.metadata?.size || 0);
    const actualType = typeof object.metadata?.mimetype === "string" ? object.metadata.mimetype : "";
    if (!Number.isSafeInteger(actualSize) || actualSize < 1 || actualSize > MAX_BYTES || actualSize > Number(media.file_size_bytes) || !ALLOWED_TYPES.has(actualType) || actualType !== media.mime_type) {
      await admin.storage.from("tv-media").remove([media.storage_path]);
      await admin.from("store_tv_media").delete().eq("id", mediaId).eq("store_id", storeId);
      return response({ error: "Berkas yang diunggah tidak sesuai batas ukuran atau format." }, 400);
    }

    const { data: finalized, error: finalizeError } = await admin.from("store_tv_media")
      .update({ file_size_bytes: actualSize, mime_type: actualType, upload_status: "complete", reservation_expires_at: null })
      .eq("id", mediaId).eq("store_id", storeId)
      .select("id,store_id,title,source_url,storage_path,mime_type,file_size_bytes,media_type,sort_order,is_active,created_at,updated_at").single();

    if (finalizeError || !finalized) {
      await admin.storage.from("tv-media").remove([media.storage_path]);
      await admin.from("store_tv_media").delete().eq("id", mediaId).eq("store_id", storeId);
      const isQuota = /Kuota video tenant maksimal 100 MB/i.test(finalizeError?.message || "");
      return response({ error: isQuota ? "Ukuran aktual melebihi sisa kuota 100 MB. Video dibatalkan." : "Video belum dapat diverifikasi." }, isQuota ? 413 : 400);
    }
    return response({ media: finalized });
  }

  if (action === "delete") {
    if (!mediaId) return response({ error: "ID media tidak valid." }, 400);
    const { data: media, error: mediaError } = await admin.from("store_tv_media")
      .select("id,storage_path,upload_status").eq("id", mediaId).eq("store_id", storeId)
      .eq("media_type", "upload").maybeSingle();
    if (mediaError) return response({ error: "Gagal memeriksa video." }, 500);
    if (!media?.storage_path || !media.storage_path.startsWith(storeId + "/")) return response({ error: "Video tidak ditemukan." }, 404);
    const { error: removeError } = await admin.storage.from("tv-media").remove([media.storage_path]);
    if (removeError) return response({ error: "Berkas video belum dapat dihapus. Metadata tetap dipertahankan." }, 500);
    const { error: deleteError } = await admin.from("store_tv_media").delete().eq("id", mediaId).eq("store_id", storeId);
    if (deleteError) return response({ error: "Berkas dihapus, tetapi metadata belum dapat dibersihkan. Hubungi admin." }, 500);
    return response({ ok: true });
  }

  if (action === "cancel") {
    if (!mediaId) return response({ error: "ID media tidak valid." }, 400);
    const { data: media } = await admin.from("store_tv_media").select("id,storage_path")
      .eq("id", mediaId).eq("store_id", storeId).eq("media_type", "upload").maybeSingle();
    if (media?.storage_path) await admin.storage.from("tv-media").remove([media.storage_path]);
    const { error } = await admin.from("store_tv_media").delete().eq("id", mediaId).eq("store_id", storeId);
    if (error) return response({ error: "Gagal membersihkan reservasi upload." }, 500);
    return response({ ok: true });
  }

  return response({ error: "Aksi tidak dikenal." }, 400);
});
