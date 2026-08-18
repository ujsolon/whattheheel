interface BuyNowLinkProps {
  buyUrl: string;
  /** Names the destination for assistive tech when several CTAs share a screen (e.g. the Feed grid). */
  label?: string;
}

// AD-6-style single definition: every Buy Now in the product renders through
// here, so the locked copy and the external-link attributes cannot drift per
// surface. Settled in Story 2.5 and its code review:
//   - `target="_blank"` already implies noopener in current browsers; `rel`
//     is kept because EXPERIENCE.md specifies it explicitly.
//   - `referrerPolicy` is the deliberate middle ground — retailers still see
//     they were referred (preserving future affiliate attribution) but not the
//     full URL the user came from.
export function BuyNowLink({ buyUrl, label }: BuyNowLinkProps) {
  return (
    <a
      href={buyUrl}
      target="_blank"
      rel="noopener"
      referrerPolicy="strict-origin-when-cross-origin"
      className="flex min-h-11 w-full items-center justify-center border-[3px] border-ink bg-lime px-4 py-2 text-center text-[11px] font-black uppercase tracking-[0.05em] text-ink shadow-[5px_5px_0_var(--color-pink)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime"
    >
      Heel Yes — Buy Now →
      <span className="sr-only">
        {label ? ` ${label} (opens in a new tab)` : " (opens in a new tab)"}
      </span>
    </a>
  );
}
