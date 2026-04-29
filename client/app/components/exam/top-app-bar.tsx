"use client";

import { memo } from "react";
import { Clock, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { AssistanceMenu } from "./assistance-menu";
import { useCalculator } from "../calculator/CalculatorContext";

interface TopAppBarProps {
  title: string;
  subject: string;
  timeRemaining: number;
  onQuit: () => void;
  onSubmit: () => void;
  canSubmitEarly: boolean;
  earlySubmitDisabledMessage?: string;
  isInBufferPeriod?: boolean;
}

export const TopAppBar = memo(function TopAppBar({
  title,
  subject,
  timeRemaining,
  onQuit,
  onSubmit,
  canSubmitEarly,
  earlySubmitDisabledMessage,
  isInBufferPeriod = false,
}: TopAppBarProps) {
  const { toggleCalculator } = useCalculator();

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-20 bg-white border-b border-gray-200 z-50">
      <div className="h-full container mx-auto flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <Image
            src="/logo.png"
            alt="IB Middle Years Programme"
            width={200}
            height={60}
          />
          <div className="h-6 w-px bg-gray-300" />
          <div>
            <span className="text-sm font-semibold text-gray-900">{title}</span>
            <span className="text-sm text-gray-500 ml-2">| {subject}</span>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Tools Section - Add more tool icons here */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white bg-blue-500 hover:bg-blue-600 h-9 w-9 p-0 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Calculator"
              onClick={toggleCalculator}
              disabled={isInBufferPeriod}
              title={
                isInBufferPeriod
                  ? "Calculator disabled during reading time"
                  : "Toggle calculator"
              }
            >
              <Calculator className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center">
            <AssistanceMenu
              onQuit={onQuit}
              onSubmit={onSubmit}
              canSubmitEarly={canSubmitEarly}
              earlySubmitDisabledMessage={earlySubmitDisabledMessage}
            />
          </div>
          <div className="w-48 h-20 flex items-center justify-center gap-2 bg-[#104b9b] px-3 py-1.5">
            <Clock className="w-8 h-8 text-white text-2xl" />
            <span className="font-bold text-white text-xl">
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
