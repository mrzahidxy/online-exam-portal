"use client";

import { useCalculator } from "./CalculatorContext";
import { CalcButton } from "./CalcButton";

export function FuncTab() {
  const { backspace, evaluate, expression } = useCalculator();

  const handleEnter = () => {
    evaluate();
  };

  return (
    <div className="p-4 space-y-3">
      {/* Row 1: Trig functions */}
      <div className="grid grid-cols-6 gap-2">
        <CalcButton label="sin" value="sin()" />
        <CalcButton label="cos" value="cos()" />
        <CalcButton label="tan" value="tan()" />
        <CalcButton label="ln" value="ln()" />
        <CalcButton label="log" value="log()" />
        <CalcButton label="abs" value="abs()" />
      </div>

      {/* Row 2: Inverse trig and constants */}
      <div className="grid grid-cols-6 gap-2">
        <CalcButton label="sin⁻¹" value="asin()" />
        <CalcButton label="cos⁻¹" value="acos()" />
        <CalcButton label="tan⁻¹" value="atan()" />
        <CalcButton label="√" value="sqrt()" />
        <CalcButton label="π" value="π" />
        <CalcButton label="e" value="e" />
      </div>

      {/* Row 3: Special operators and actions */}
      <div className="grid grid-cols-6 gap-2">
        <CalcButton label="!" value="!" />
        <CalcButton label="(" value="(" />
        <CalcButton label=")" value=")" />
        <CalcButton label="[" value="[" />
        <CalcButton label="]" value="]" />
        <CalcButton label="⌫" onClick={backspace} variant="action" />
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
