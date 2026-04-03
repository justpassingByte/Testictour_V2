import React from "react";

export default function DashboardPageTemplate({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      {description && <p className="text-muted-foreground mb-6">{description}</p>}
      {children}
    </div>
  );
} 