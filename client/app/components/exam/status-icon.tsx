"use client";

type CircularProgressProps = {
  percentage: number; // 0 - 100
  size?: number; // px
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
};

export function StatusIcon({
  percentage,
  size = 24,
  strokeWidth = 12,
  color = "#000",
  bgColor = "#fff",
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = Math.min(Math.max(percentage, 0), 100);
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="w-7 h-7 bg-[#104b9b] rounded-xs flex items-center justify-center">
      <svg width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill={"none"}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: "stroke-dashoffset 0.6s ease",
          }}
        />
      </svg>
    </div>
  );
}
