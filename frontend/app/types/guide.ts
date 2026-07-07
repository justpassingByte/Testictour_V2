export type GuideStage = {
  id: string;
  title: string;
  icon?: string;
  goal?: string;
  playstyle?: string[];
  tips?: string[];
  positioning?: string[];
};

export type GuideTips = {
  overview?: {
    title?: string;
    description?: string;
    conditions?: string[];
    focus?: string[];
  };
  stages?: GuideStage[];
};

export function hasGuideTipsContent(guideTips?: GuideTips | null): guideTips is GuideTips {
  if (!guideTips) return false;

  const overview = guideTips.overview;
  const hasOverview = Boolean(
    overview?.title?.trim() ||
    overview?.description?.trim() ||
    overview?.conditions?.some((item) => item.trim()) ||
    overview?.focus?.some((item) => item.trim()),
  );

  const hasStages = Boolean(
    guideTips.stages?.some((stage) =>
      stage.title?.trim() ||
      stage.icon?.trim() ||
      stage.goal?.trim() ||
      stage.playstyle?.some((item) => item.trim()) ||
      stage.tips?.some((item) => item.trim()) ||
      stage.positioning?.some((item) => item.trim()),
    ),
  );

  return hasOverview || hasStages;
}
