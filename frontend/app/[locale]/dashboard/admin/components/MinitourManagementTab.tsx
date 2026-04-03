import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function MinitourManagementTab() {
  return (
    <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
      <CardHeader>
        <CardTitle>Minitour Management</CardTitle>
        <CardDescription>Create and manage smaller, recurring mini-tournaments.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-center py-8 text-muted-foreground">
          Minitour management interface will be displayed here.
        </p>
      </CardContent>
    </Card>
  );
} 