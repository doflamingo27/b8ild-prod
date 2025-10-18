import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
}

const KPICard = ({ title, value, icon: Icon, trend, subtitle }: KPICardProps) => {
  return (
    <Card className="card-premium hover-lift group animate-fade-up">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</CardTitle>
        <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-smooth">
          <Icon className="h-5 w-5 text-primary group-hover:scale-110 transition-smooth" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-black tracking-tight font-mono bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          {value}
        </div>
        {subtitle && <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>}
        {trend && (
          <div className={`inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-lg text-xs font-semibold ${
            trend.isPositive 
              ? "bg-success/10 text-success" 
              : "bg-danger/10 text-danger"
          }`}>
            <span className="text-base">{trend.isPositive ? "↑" : "↓"}</span>
            {Math.abs(trend.value)}% vs mois dernier
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KPICard;
