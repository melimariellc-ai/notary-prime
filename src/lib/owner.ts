/**
 * The Owner account is protected unconditionally, independently of the
 * permissions system. No account — not even one holding can_deactivate_users
 * or can_archive_users — can switch off this account's sign-in.
 *
 * The rule is pinned to the stable account id first (which survives an email
 * change) and to the email as a second safety net.
 */
export const OWNER_USER_ID = "116c9fbc-49dc-4434-a40c-3e1ff3ff8195";
export const OWNER_EMAIL = "info@enlivennotary.com";

export function isOwnerAccount(userId?: string | null, email?: string | null): boolean {
  if (userId && userId === OWNER_USER_ID) return true;
  return Boolean(email && email.trim().toLowerCase() === OWNER_EMAIL);
}
