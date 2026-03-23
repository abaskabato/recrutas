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

/**
 * Get a fresh resume URL with fallback to the candidate's current profile resume.
 * Use this when the stored task resume key might be stale/deleted.
 */
export async function getFreshResumeUrlWithFallback(
  storedUrl: string | null | undefined,
  candidateId: string | null | undefined
): Promise<string | null> {
  // Try the stored URL first
  const url = await getFreshResumeUrl(storedUrl);
  if (url) return url;

  // Fallback: look up the candidate's current profile resume
  if (!candidateId) return null;
  try {
    const { db } = await import('../db.js');
    const { candidateProfiles } = await import('../../shared/schema.js');
    const { eq } = await import('drizzle-orm');
    const [profile] = await db.select({ resumeUrl: candidateProfiles.resumeUrl })
      .from(candidateProfiles)
      .where(eq(candidateProfiles.userId, candidateId));
    if (profile?.resumeUrl && profile.resumeUrl !== storedUrl) {
      console.log(`[resume-url] Stored key failed, trying candidate profile resume: ${profile.resumeUrl}`);
      return getFreshResumeUrl(profile.resumeUrl);
    }
  } catch (e: any) {
    console.log(`[resume-url] Profile fallback failed: ${e.message}`);
  }
  return null;
}
