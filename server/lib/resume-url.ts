/**
 * Shared utility to generate fresh Supabase signed URLs for resumes.
 * Stored URLs may have expired tokens (signed URLs have short TTLs).
 */

export async function getFreshResumeUrl(storedUrl: string | null | undefined): Promise<string | null> {
  if (!storedUrl) return null;

  try {
    const { getSupabaseAdmin } = await import('./supabase-admin.js');
    const supabase = getSupabaseAdmin();

    // Case 1: Full URL — extract storage path from it
    // Format: .../storage/v1/object/(sign|public)/resumes/<path>
    const match = storedUrl.match(/\/object\/(?:sign|public)\/([^?]+)/);
    if (match) {
      const fullPath = match[1]; // e.g. "resumes/user-id/resume.pdf"
      const [bucket, ...pathParts] = fullPath.split('/');
      const filePath = pathParts.join('/');
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 300);
      if (!error && data?.signedUrl) return data.signedUrl;
      console.log(`[resume-url] getFreshResumeUrl Case 1 error: ${error?.message}`);
      return storedUrl; // Fall back to original URL
    }

    // Case 2: Storage key only (e.g. "resume-1773728149253-mtkql4a73f")
    // Try the "resumes" bucket with the key as the file path
    const { data, error } = await supabase.storage
      .from('resumes')
      .createSignedUrl(storedUrl, 300);
    if (!error && data?.signedUrl) return data.signedUrl;
    console.log(`[resume-url] getFreshResumeUrl Case 2 error: ${error?.message}`);

    return null;
  } catch (e: any) {
    console.error(`[resume-url] getFreshResumeUrl exception: ${e.message}`);
    return null;
  }
}
