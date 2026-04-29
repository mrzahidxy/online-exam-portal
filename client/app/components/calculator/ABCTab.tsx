"use client";

import { useCalculator } from "./CalculatorContext";
import { CalcButton } from "./CalcButton";

export function ABCTab() {
  const { backspace, evaluate, expression } = useCalculator();

  const handleEnter = () => {
    evaluate();
  };

  const letters = [
    ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"],
    ["k", "l", "m", "n", "o", "p", "q", "r", "s", "t"],
    ["u", "v", "w", "x", "y", "z"],
  ];

  return (
    <div className="p-4 space-y-3">
      {/* Letter rows */}
      {letters.map((row, idx) => (
        <div key={idx} className="grid grid-cols-10 gap-2">
          {row.map((letter) => (
            <CalcButton key={letter} label={letter} value={letter} />
          ))}
        </div>
      ))}

      {/* Bottom row with special keys */}
      <div className="grid grid-cols-10 gap-2">
        <CalcButton label="[" value="[" />
        <CalcButton label="]" value="]" />
        <CalcButton label="=" value="=" />
        <CalcButton label="," value="," />
        <div className="col-span-4"></div>
        <CalcButton
          label="⌫"
          onClick={backspace}
          variant="action"
          className="col-span-2"
        />
      </div>

      {/* Enter button */}
      <div className="flex justify-end">
        <CalcButton
          label="ENTER"
          onClick={handleEnter}
          variant="primary"
          className="px-8 text-xs"
        />
      </div>
    </div>
  );
}
