import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table } from "lucide-react"
import { useTranslations } from "next-intl"

export const TournamentRulesTab = () => {
  const t = useTranslations("common")
  return (
    <Card className="border shadow-sm">
      <CardHeader>
          <CardTitle className="text-lg flex items-center">
          <Table className="mr-2 h-5 w-5 text-primary" />
          {t("rules")}
          </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        {/* Hardcoded General Rules Explanations */}
        <div className="space-y-2 mb-4">
          <h4 className="font-bold">{t("general_phase_rules")}:</h4>
          <p><strong>{t("elimination_phase")}:</strong> {t("elimination_phase_desc")}</p>
          <p><strong>{t("points_phase")}:</strong> {t("points_phase_desc")}</p>
          <p><strong>{t("checkmate_phase")}:</strong> {t("checkmate_phase_desc")}</p>
          <p><strong>{t("swiss_phase")}:</strong> {t("swiss_phase_desc")}</p>
          <p><strong>{t("round_robin_phase")}:</strong> {t("round_robin_phase_desc")}</p>
        </div>
        <div className="space-y-2 mb-4">
          <h4 className="font-bold">{t("lobby_assignment_rules")}:</h4>
          <p><strong>{t("random_assignment")}:</strong> {t("random_assignment_desc")}</p>
          <p><strong>{t("seeded_assignment")}:</strong> {t("seeded_assignment_desc")}</p>
        </div>
        <div className="space-y-2 mb-4">
          <h4 className="font-bold">{t("additional_tournament_rules")}:</h4>
          <ol className="list-decimal list-inside ml-4 space-y-1">
            <li>{t("rule_1")}</li>
            <li>{t("rule_2")}</li>
            <li>{t("rule_3")}</li>
            <li>{t("rule_4")}</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}; 