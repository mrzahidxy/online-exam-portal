"use client";

import { useCalculator } from "./CalculatorContext";

interface CalcButtonProps {
  label: string;
  value?: string;
  onClick?: () => void;
  className?: string;
  variant?: "default" | "primary" | "operator" | "action";
}

export function CalcButton({
  label,
  value,
  onClick,
  className = "",
  variant = "default",
}: CalcButtonProps) {
  const { append } = useCalculator();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (value !== undefined) {
      append(value);
    }
  };

  const variantClasses = {
    default: "bg-white hover:bg-gray-50 text-gray-900 border border-gray-200",
    primary:
      "bg-blue-500 hover:bg-blue-600 text-white font-semibold border-none",
    operator:
      "bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200",
    action:
      "bg-gray-200 hover:bg-gray-300 text-gray-900 border border-gray-300",
  };

  return (
    <button
      onClick={handleClick}
      className={`h-12 rounded-md transition-colors text-sm font-medium ${variantClasses[variant]} ${className}`}
    >
      {label}
    </button>
  );
}
