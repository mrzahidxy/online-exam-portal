"use client";

import { useCalculator } from "./CalculatorContext";
import { CalcButton } from "./CalcButton";

export function MainTab() {
  const { backspace, clear, evaluate, expression } = useCalculator();

  const handleEnter = () => {
    evaluate();
  };

  return (
    <div className="p-4 grid grid-cols-[auto_auto_auto] gap-4">
      {/* Left: Scientific keys */}
      <div className="grid grid-cols-3 gap-2">
        <CalcButton label="a²" value="^2" />
        <CalcButton label="a^□" value="^()" />
        <CalcButton label="√" value="sqrt()" />
        <CalcButton label="π" value="π" />
        <CalcButton label="e" value="e" />
        <CalcButton label="(" value="(" />
        <CalcButton label=")" value=")" />
      </div>

      {/* Center: Number pad */}
      <div className="grid grid-cols-3 gap-2">
        <CalcButton label="7" value="7" />
        <CalcButton label="8" value="8" />
        <CalcButton label="9" value="9" />
        <CalcButton label="4" value="4" />
        <CalcButton label="5" value="5" />
        <CalcButton label="6" value="6" />
        <CalcButton label="1" value="1" />
        <CalcButton label="2" value="2" />
        <CalcButton label="3" value="3" />
        <CalcButton label="0" value="0" className="col-span-2" />
        <CalcButton label="." value="." />
      </div>

      {/* Right: Operators and actions */}
      <div className="grid grid-cols-2 gap-2">
        <CalcButton label="÷" value="÷" variant="operator" />
        <CalcButton label="a/b" value="()/()" variant="operator" />
        <CalcButton label="×" value="×" variant="operator" />
        <CalcButton label="⌫" onClick={backspace} variant="action" />
        <CalcButton label="−" value="−" variant="operator" />
        <CalcButton label="CLR" onClick={clear} variant="action" />
        <CalcButton label="+" value="+" variant="operator" />
        <CalcButton
          label="ENTER"
          onClick={handleEnter}
          variant="primary"
          className="text-xs"
        />
      </div>
    </div>
  );
}
