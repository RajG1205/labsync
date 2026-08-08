import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCatalog } from "@/hooks/useCatalog";
import { recommendEquipment } from "@/lib/ai.functions";
import { AppHeader } from "@/components/AppHeader";
import { EquipmentCard } from "@/components/EquipmentCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/recommend")({
  head: () => ({
    meta: [
      { title: "AI instrument finder — LabSync" },
      {
        name: "description",
        content:
          "Describe your experiment in plain language and get matched to the right instruments, techniques and sample preparation steps across partner labs.",
      },
      { property: "og:title", content: "AI instrument finder — LabSync" },
      {
        property: "og:description",
        content: "Plain-language experiment matching to lab instruments and sample prep guidance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Recommend,
});

const EXAMPLES = [
  "I need to see the surface morphology of a nanocomposite coating at 50 nm scale",
  "Identify crystalline phases in a thin film sample of perovskite",
  "Quantify trace heavy metals in groundwater samples",
];

function Recommend() {
  const [goal, setGoal] = useState("");
  const recommend = useServerFn(recommendEquipment);

  const { data: equipment = [], ratesVisible } = useCatalog();

  const mutation = useMutation({
    mutationFn: (text: string) => recommend({ data: { goal: text } }),
    onError: () => toast.error("Couldn't reach the AI assistant. Please try again."),
  });

  const result = mutation.data;
  const matches = result
    ? equipment.filter((e) =>
        result.recommendations.some((r) =>
          e.category.toLowerCase().includes(r.category.toLowerCase()),
        ),
      )
    : [];

  function submit(text: string) {
    const value = text.trim();
    if (value.length < 15) {
      toast.error("Add a bit more detail about your experiment.");
      return;
    }
    mutation.mutate(value.slice(0, 800));
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to discovery
        </Link>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Describe your experiment</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us what you're trying to measure. We'll suggest the right technique, instruments and
          sample preparation.
        </p>

        <div className="panel mt-6 p-5">
          <Textarea
            value={goal}
            maxLength={800}
            rows={4}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. I want elemental mapping of a corroded steel surface with sub-micron detail"
            className="resize-none border-0 p-0 shadow-none focus-visible:ring-0"
          />
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <span className="font-mono text-[11px] text-muted-foreground">{goal.length}/800</span>
            <Button onClick={() => submit(goal)} disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Find instruments
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setGoal(ex);
                submit(ex);
              }}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              {ex}
            </button>
          ))}
        </div>

        {result && (
          <div className="mt-10 space-y-6">
            <div className="panel p-6">
              <h2 className="text-sm font-semibold">Recommended approach</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{result.summary}</p>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Techniques
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {result.recommendations.map((r) => (
                      <li key={r.category} className="rounded-md bg-secondary px-3 py-2 text-xs">
                        <span className="font-medium">{r.category}</span>
                        <span className="ml-1.5 font-mono text-[10px] uppercase text-muted-foreground">
                          {r.priority}
                        </span>
                        <p className="mt-1 text-muted-foreground">{r.why}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Sample preparation
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                    {result.sample_prep.map((s) => (
                      <li key={s} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold">
                {matches.length} matching instrument{matches.length === 1 ? "" : "s"}
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {matches.map((e) => (
                  <EquipmentCard key={e.id} equipment={e} tier="student" showRates={ratesVisible} />
                ))}
              </div>
              {matches.length === 0 && (
                <p className="mt-4 text-sm text-muted-foreground">
                  No registered instrument matches those techniques yet — try browsing the full
                  catalogue.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
