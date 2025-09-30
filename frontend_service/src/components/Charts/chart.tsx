import { ReactNode } from "react";
import { Tooltip, TooltipProps } from "recharts";

// Chart configuration type
export type ChartConfig = Record<
  string,
  {
    label: string;
    color?: string;
    icon?: React.ComponentType;
    theme?: {
      light: string;
      dark: string;
    };
  }
>;

interface ChartContainerProps {
  children: ReactNode;
  config?: ChartConfig;
  className?: string;
}

export function ChartContainer({
  children,
  config,
  className,
}: ChartContainerProps) {
  return (
    <div
      className={className}
      style={
        config
          ? {
              "--chart-colors": Object.entries(config)
                .map(([key, value]) => {
                  if (!value.color) return "";
                  return `--color-${key}:${value.color};`;
                })
                .join(" "),
            } as React.CSSProperties
          : undefined
      }
    >
      {children}
    </div>
  );
}

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  labelKey?: string;
  nameKey?: string;
  indicator?: "dot" | "line" | "dashed";
  hideLabel?: boolean;
  hideIndicator?: boolean;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  labelKey,
  nameKey,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const labelText = labelKey
    ? payload[0]?.payload[labelKey] || label
    : label;

  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      {!hideLabel && labelText ? (
        <div className="mb-1 text-sm font-medium">{labelText}</div>
      ) : null}
      <div className="flex flex-col gap-0.5">
        {payload.map((item: any, index: number) => {
          const name = nameKey
            ? item.payload[nameKey]
            : item.name;
          const color = item.color || `var(--color-${item.dataKey})`;

          return (
            <div key={index} className="flex items-center gap-2">
              {!hideIndicator ? (
                indicator === "dot" ? (
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ) : indicator === "line" ? (
                  <div
                    className="h-0.5 w-2"
                    style={{ backgroundColor: color }}
                  />
                ) : (
                  <div
                    className="h-0.5 w-2 border-t border-dashed"
                    style={{ borderColor: color }}
                  />
                )
              ) : null}
              <span className="text-xs font-medium">{name}</span>
              <span className="ml-auto text-xs font-medium">
                {typeof item.value === "number"
                  ? item.value.toLocaleString()
                  : item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChartTooltip({
  content,
  ...props
}: TooltipProps<any, any> & { content?: React.ReactNode }) {
  return (
    <Tooltip
      content={content}
      cursor={{ opacity: 0.5 }}
      offset={10}
      wrapperStyle={{ outline: "none" }}
      {...props}
    />
  );
} 