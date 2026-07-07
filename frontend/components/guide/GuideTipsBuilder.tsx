"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import type { GuideStage, GuideTips } from "@/app/types/guide";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type GuideTipsBuilderProps = {
  value: GuideTips;
  onChange: (value: GuideTips) => void;
};

const emptyOverview = {
  title: "",
  description: "",
  conditions: [] as string[],
  focus: [] as string[],
};

function makeStage(): GuideStage {
  return {
    id: `stage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    icon: "",
    title: "",
    goal: "",
    playstyle: [],
    tips: [],
    positioning: [],
  };
}

function RepeatableInput({
  label,
  items,
  placeholder,
  onChange,
}: {
  label: string;
  items?: string[];
  placeholder?: string;
  onChange: (items: string[]) => void;
}) {
  const safeItems = items ?? [];

  const updateItem = (index: number, nextValue: string) => {
    onChange(safeItems.map((item, itemIndex) => (itemIndex === index ? nextValue : item)));
  };

  const removeItem = (index: number) => {
    onChange(safeItems.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...safeItems, ""])}>
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>
      <div className="space-y-2">
        {safeItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={item}
              placeholder={placeholder}
              onChange={(event) => updateItem(index, event.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300"
              onClick={() => removeItem(index)}
              aria-label={`Remove ${label} item`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GuideTipsBuilder({ value, onChange }: GuideTipsBuilderProps) {
  const overview = value.overview ?? emptyOverview;
  const stages = value.stages ?? [];

  const updateOverview = (patch: Partial<NonNullable<GuideTips["overview"]>>) => {
    onChange({
      ...value,
      overview: {
        ...overview,
        ...patch,
      },
    });
  };

  const updateStage = (index: number, patch: Partial<GuideStage>) => {
    onChange({
      ...value,
      stages: stages.map((stage, stageIndex) => (stageIndex === index ? { ...stage, ...patch } : stage)),
    });
  };

  const removeStage = (index: number) => {
    onChange({
      ...value,
      stages: stages.filter((_, stageIndex) => stageIndex !== index),
    });
  };

  const moveStage = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= stages.length) return;

    const nextStages = [...stages];
    const [stage] = nextStages.splice(index, 1);
    nextStages.splice(nextIndex, 0, stage);
    onChange({ ...value, stages: nextStages });
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-slate-700/80 bg-slate-950/40">
        <CardHeader>
          <CardTitle className="text-lg">Tổng quan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="guide-overview-title">Title</Label>
              <Input
                id="guide-overview-title"
                value={overview.title ?? ""}
                placeholder="Tổng quan"
                onChange={(event) => updateOverview({ title: event.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="guide-overview-description">Description</Label>
              <Textarea
                id="guide-overview-description"
                value={overview.description ?? ""}
                placeholder="Mô tả ngắn về điều kiện hoặc ý tưởng chính"
                rows={3}
                onChange={(event) => updateOverview({ description: event.target.value })}
              />
            </div>
          </div>
          <RepeatableInput
            label="Conditions"
            items={overview.conditions}
            placeholder="Khi nào nên chơi?"
            onChange={(conditions) => updateOverview({ conditions })}
          />
          <RepeatableInput
            label="Focus"
            items={overview.focus}
            placeholder="Trọng tâm đội hình"
            onChange={(focus) => updateOverview({ focus })}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Stages</h3>
        <Button type="button" onClick={() => onChange({ ...value, stages: [...stages, makeStage()] })}>
          <Plus className="mr-2 h-4 w-4" />
          Add stage
        </Button>
      </div>

      <div className="space-y-4">
        {stages.map((stage, index) => (
          <Card key={stage.id} className="rounded-2xl border-slate-700/80 bg-slate-950/40">
            <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base text-yellow-300">{stage.title || `Stage ${index + 1}`}</CardTitle>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" disabled={index === 0} onClick={() => moveStage(index, -1)} aria-label="Move stage up">
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" disabled={index === stages.length - 1} onClick={() => moveStage(index, 1)} aria-label="Move stage down">
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="text-rose-400 hover:bg-rose-950/40 hover:text-rose-300" onClick={() => removeStage(index)} aria-label="Remove stage">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[120px_1fr]">
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Input value={stage.icon ?? ""} placeholder="🌱" onChange={(event) => updateStage(index, { icon: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={stage.title} placeholder="Stage 2 - Giữ máu" onChange={(event) => updateStage(index, { title: event.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Goal</Label>
                <Textarea value={stage.goal ?? ""} placeholder="Mục tiêu chính của stage" rows={3} onChange={(event) => updateStage(index, { goal: event.target.value })} />
              </div>
              <RepeatableInput label="Playstyle" items={stage.playstyle} placeholder="Cách chơi" onChange={(playstyle) => updateStage(index, { playstyle })} />
              <RepeatableInput label="Tips" items={stage.tips} placeholder="Lưu ý" onChange={(tips) => updateStage(index, { tips })} />
              <RepeatableInput label="Positioning" items={stage.positioning} placeholder="Xếp bài cuối trận" onChange={(positioning) => updateStage(index, { positioning })} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
