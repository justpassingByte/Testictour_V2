import { useTranslations } from 'next-intl';

export default function EnTerms() {
  return (
    <div className="space-y-12">
      <section id="introduction" className="scroll-mt-24 space-y-4">
        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          Core Policy
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">1. Introduction</h2>
        <p className="text-muted-foreground leading-relaxed text-lg">
          Welcome to the TesticTour Tournament Escrow System exactly. This document outlines the rules and procedures governing how tournament funds are secured, managed, and distributed on our platform. By participating in or organizing a tournament, you agree to these terms.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          The Escrow System ensures that prize pools are guaranteed and that funds are handled transparently, protecting both organizers and players from financial risks.
        </p>
      </section>

      <section id="escrow-vs-community" className="scroll-mt-24 space-y-4">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">2. Escrow-Backed vs. Community Mode</h2>
        <p className="text-muted-foreground leading-relaxed">
          Tournaments on our platform fall into two distinct financial categories based on their advertised prize pool:
        </p>
        <div className="grid gap-6 md:grid-cols-2 mt-4">
          <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-sm">
            <h3 className="flex items-center text-xl font-semibold mb-3 text-emerald-500">
              <span className="bg-emerald-500/20 p-2 rounded-lg mr-3">💎</span>
              Escrow-Backed
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tournaments with a prize pool reaching the platform's guaranteed threshold. For these tournaments, the organizer must fully deposit the prize pool into our secure Escrow System before the tournament can begin. The platform guarantees the payout to winners.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-sm">
            <h3 className="flex items-center text-xl font-semibold mb-3 text-orange-500">
              <span className="bg-orange-500/20 p-2 rounded-lg mr-3">🤝</span>
              Community Mode
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tournaments with smaller prize pools below the platform threshold. While the platform still records transactions, the prize pool is <strong>not guaranteed</strong> by our Escrow System. Participants join at their own risk regarding payouts.
            </p>
          </div>
        </div>
      </section>

      <section id="organizer-funding" className="scroll-mt-24 space-y-4">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">3. Organizer Funding Requirements</h2>
        <ul className="space-y-4 text-muted-foreground list-none ml-0">
          <li className="flex items-start">
            <span className="text-primary mr-3 mt-1">•</span>
            <div>
              <strong className="text-foreground">Full Funding Guarantee:</strong> For Escrow-Backed tournaments, the required prize pool must be 100% funded and confirmed by our payment gateway before the tournament is allowed to start.
            </div>
          </li>
          <li className="flex items-start">
            <span className="text-primary mr-3 mt-1">•</span>
            <div>
              <strong className="text-foreground">Verification:</strong> Funding is primarily verified via automated webhooks from our payment providers. Manual proof review is strictly an exception-handling fallback managed by platform administrators.
            </div>
          </li>
          <li className="flex items-start">
            <span className="text-primary mr-3 mt-1">•</span>
            <div>
              <strong className="text-foreground">Participant Fees Segregation:</strong> Participant entry fees are recorded separately and cannot be used by the organizer to satisfy their pre-start Escrow deposit requirement.
            </div>
          </li>
        </ul>
      </section>

      <section id="disputes" className="scroll-mt-24 space-y-4">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">4. Cancellations & Disputes</h2>
        <div className="rounded-xl border-l-4 border-l-primary bg-primary/5 p-6 space-y-3">
          <h3 className="text-lg font-medium text-foreground">Pre-Lock Cancellation</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If an Escrow-Backed tournament is cancelled <em>before</em> the tournament officially starts (before lock):
            Participant entry fees will be refunded. Organizers may request a return of their funded Escrow, subject to administrative review and deduction of any unrecoverable gateway fees. The Escrow state will officially transition to "Cancelled" once all reversals settle.
          </p>
        </div>
        <div className="rounded-xl border-l-4 border-l-destructive bg-destructive/5 p-6 space-y-3 mt-4">
          <h3 className="text-lg font-medium text-foreground">Post-Lock & Disputes</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Once a tournament locks (begins), funds are frozen. In the event of contested results, alleged cheating, or organizer cancellation after lock, the Escrow enters a "Disputed" state. Funds will remain frozen until platform administrators investigate and issue a final resolution.
          </p>
        </div>
      </section>

      <section id="payouts" className="scroll-mt-24 space-y-4">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">5. Payouts & Settlement</h2>
        <p className="text-muted-foreground leading-relaxed">
          The following procedures govern how winners receive their rewards and how organizers audit their finances:
        </p>
        <div className="space-y-4 mt-4">
          <div className="p-4 rounded-lg bg-card/30 border border-border">
            <strong className="text-foreground block mb-1">Release Authority</strong>
            <span className="text-sm text-muted-foreground">Only platform administrators hold the final authority to release payouts. Organizers request the release based on approved match results, but admins execute the final transfer to prevent fraud.</span>
          </div>
          <div className="p-4 rounded-lg bg-card/30 border border-border">
            <strong className="text-foreground block mb-1">Reconciliation</strong>
            <span className="text-sm text-muted-foreground">Winner payouts are tracked comprehensively. "Paid" statuses are only updated when our gateway successfully confirms the transaction via webhooks or an admin verifies a manual proof.</span>
          </div>
          <div className="p-4 rounded-lg bg-card/30 border border-border">
            <strong className="text-foreground block mb-1">Settlement Reports</strong>
            <span className="text-sm text-muted-foreground">Organizers are provided with a final settlement report reconciling their initial funding, participant fees, refunds, and final payouts for maximum transparency.</span>
          </div>
        </div>
      </section>

      <div className="border-t border-border/50 pt-8 mt-12 text-sm text-muted-foreground text-center">
        Last updated: April 2026. This policy supersedes all prior agreements regarding tournament finances.
      </div>
    </div>
  )
}
