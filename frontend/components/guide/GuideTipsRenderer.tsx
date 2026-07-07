import { BookOpen, CheckCircle2, Compass, Crosshair, Info, ListChecks, Swords } from "lucide-react";

import type { GuideStage, GuideTips } from "@/app/types/guide";
import { hasGuideTipsContent } from "@/app/types/guide";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GuideTipsRendererProps = {
  guideTips?: GuideTips | null;
  oldTips?: string | null;
};

function cleanItems(items?: string[]) {
  return items?.map((item) => item.trim()).filter(Boolean) ?? [];
}

function GuideList({ items }: { items?: string[] }) {
  const visibleItems = cleanItems(items);
  if (visibleItems.length === 0) return null;

  return (
    <ul className="space-y-2">
      {visibleItems.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-2 text-sm leading-6 text-slate-200">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400/80" />
          <span className="min-w-0 break-words">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function GuideBlock({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-yellow-300">
        {icon}
        <span>{title}</span>
      </h4>
      {children}
    </section>
  );
}

function StageCard({ stage }: { stage: GuideStage }) {
  const playstyle = cleanItems(stage.playstyle);
  const tips = cleanItems(stage.tips);
  const positioning = cleanItems(stage.positioning);
  const hasGoal = Boolean(stage.goal?.trim());

  if (!stage.title?.trim() && !stage.icon?.trim() && !hasGoal && !playstyle.length && !tips.length && !positioning.length) {
    return null;
  }

  return (
    <Card className="rounded-2xl border border-slate-700/80 bg-slate-950/60 text-left shadow-sm">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="flex items-start gap-3 text-base font-bold leading-6 text-slate-50">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-yellow-400/25 bg-yellow-400/10 text-lg">
            {stage.icon || "•"}
          </span>
          <span className="min-w-0 break-words text-yellow-300">{stage.title || "Stage"}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        {hasGoal && (
          <GuideBlock icon={<Crosshair className="h-4 w-4" />} title="Mục tiêu">
            <p className="text-sm leading-6 text-slate-200">{stage.goal}</p>
          </GuideBlock>
        )}
        {playstyle.length > 0 && (
          <GuideBlock icon={<Compass className="h-4 w-4" />} title="Cách chơi">
            <GuideList items={playstyle} />
          </GuideBlock>
        )}
        {tips.length > 0 && (
          <GuideBlock icon={<CheckCircle2 className="h-4 w-4" />} title="Lưu ý">
            <GuideList items={tips} />
          </GuideBlock>
        )}
        {positioning.length > 0 && (
          <GuideBlock icon={<Swords className="h-4 w-4" />} title="Xếp bài cuối trận">
            <GuideList items={positioning} />
          </GuideBlock>
        )}
      </CardContent>
    </Card>
  );
}

export function GuideTipsRenderer({ guideTips, oldTips }: GuideTipsRendererProps) {
  const hasStructuredContent = hasGuideTipsContent(guideTips);
  const overview = guideTips?.overview;
  const conditions = cleanItems(overview?.conditions);
  const focus = cleanItems(overview?.focus);
  const stages = guideTips?.stages ?? [];

  if (!hasStructuredContent && oldTips?.trim()) {
    return (
      <Card className="rounded-2xl border border-slate-700/80 bg-slate-950/60 text-left shadow-sm">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-50">
            <BookOpen className="h-5 w-5 text-yellow-400" />
            Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <p className="whitespace-pre-line text-sm leading-6 text-slate-200">{oldTips}</p>
        </CardContent>
      </Card>
    );
  }

  if (!hasStructuredContent) return null;

  return (
    <div className="space-y-4 text-left">
      {(overview?.title?.trim() || overview?.description?.trim() || conditions.length > 0 || focus.length > 0) && (
        <Card className="rounded-2xl border border-slate-700/80 bg-slate-950/60 text-left shadow-sm">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-50">
              <Info className="h-5 w-5 text-yellow-400" />
              <span>{overview?.title || "Tổng quan"}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5 pt-0">
            {overview?.description?.trim() && (
              <p className="text-sm leading-6 text-slate-200">{overview.description}</p>
            )}
            {conditions.length > 0 && (
              <GuideBlock icon={<ListChecks className="h-4 w-4" />} title="Khi nào nên chơi?">
                <GuideList items={conditions} />
              </GuideBlock>
            )}
            {focus.length > 0 && (
              <GuideBlock icon={<Crosshair className="h-4 w-4" />} title="Trọng tâm đội hình">
                <GuideList items={focus} />
              </GuideBlock>
            )}
          </CardContent>
        </Card>
      )}

      {stages.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stages.map((stage, index) => (
            <StageCard key={stage.id || `stage-${index}`} stage={stage} />
          ))}
        </div>
      )}
    </div>
  );
}
