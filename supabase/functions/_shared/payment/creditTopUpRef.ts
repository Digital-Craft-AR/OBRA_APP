const CREDIT_TOP_UP_PREFIX = "obra:credits:v1:";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_CREDITS_PER_PACK = 1_000_000;

export type CreditTopUpRef = {
  profileId: string;
  credits: number;
};

/** Parse provider `external_reference` for one-time credit top-ups (Obra format). */
export function parseCreditTopUpExternalReference(ref: string | null | undefined): CreditTopUpRef | null {
  if (!ref || !ref.startsWith(CREDIT_TOP_UP_PREFIX)) return null;
  const rest = ref.slice(CREDIT_TOP_UP_PREFIX.length);
  const lastColon = rest.lastIndexOf(":");
  if (lastColon <= 0) return null;
  const profileId = rest.slice(0, lastColon).trim().toLowerCase();
  const creditsStr = rest.slice(lastColon + 1).trim();
  if (!UUID_RE.test(profileId)) return null;
  const credits = Number(creditsStr);
  if (!Number.isInteger(credits) || credits <= 0 || credits > MAX_CREDITS_PER_PACK) return null;
  return { profileId, credits };
}

export function buildCreditTopUpExternalReference(profileId: string, credits: number): string {
  return `${CREDIT_TOP_UP_PREFIX}${profileId.trim().toLowerCase()}:${credits}`;
}
