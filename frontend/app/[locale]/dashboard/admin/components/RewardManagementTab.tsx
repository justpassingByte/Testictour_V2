import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function RewardManagementTab() {
  return (
    <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
      <CardHeader>
        <CardTitle>Reward Management</CardTitle>
        <CardDescription>Create and manage rewards for tournament participants and winners.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-center py-8 text-muted-foreground">
          Reward creation and management interface will be displayed here.
        </p>
      </CardContent>
    </Card>
  );
} 