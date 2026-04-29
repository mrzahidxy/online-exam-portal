"use client";

import { create } from "zustand";

type AngleMode = "DEG" | "RAD";

interface CalculatorStore {
  expression: string;
  resultDisplay: string;
  cursorPosition: number;
  angleMode: AngleMode;
  isOpen: boolean;
  position: { x: number; y: number };
  setExpression: (expr: string) => void;
  append: (text: string) => void;
  backspace: () => void;
  clear: () => void;
  toggleAngleMode: () => void;
  setAngleMode: (mode: AngleMode) => void;
  openCalculator: () => void;
  closeCalculator: () => void;
  toggleCalculator: () => void;
  setPosition: (pos: { x: number; y: number }) => void;
  evaluate: () => void;
  moveCursorLeft: () => void;
  moveCursorRight: () => void;
  setCursorPosition: (pos: number) => void;
}

export const useCalculator = create<CalculatorStore>((set) => ({
  expression: "",
  resultDisplay: "",
  cursorPosition: 0,
  angleMode: "DEG",
  isOpen: false,
  position: { x: 100, y: 100 },

  setExpression: (expr) =>
    set({ expression: expr, cursorPosition: expr.length }),

  append: (text) =>
    set((state) => {
      const before = state.expression.slice(0, state.cursorPosition);
      const after = state.expression.slice(state.cursorPosition);
      const newExpression = before + text + after;
      return {
        expression: newExpression,
        cursorPosition: state.cursorPosition + text.length,
      };
    }),

  backspace: () =>
    set((state) => {
      if (state.cursorPosition === 0) return state;
      const before = state.expression.slice(0, state.cursorPosition - 1);
      const after = state.expression.slice(state.cursorPosition);
      return {
        expression: before + after,
        cursorPosition: state.cursorPosition - 1,
      };
    }),

  clear: () => set({ expression: "", resultDisplay: "", cursorPosition: 0 }),

  moveCursorLeft: () =>
    set((state) => ({
      cursorPosition: Math.max(0, state.cursorPosition - 1),
    })),

  moveCursorRight: () =>
    set((state) => ({
      cursorPosition: Math.min(
        state.expression.length,
        state.cursorPosition + 1
      ),
    })),

  setCursorPosition: (pos) => set({ cursorPosition: pos }),

  toggleAngleMode: () =>
    set((state) => ({ angleMode: state.angleMode === "DEG" ? "RAD" : "DEG" })),

  setAngleMode: (mode) => set({ angleMode: mode }),

  openCalculator: () => set({ isOpen: true }),

  closeCalculator: () =>
    set({
      isOpen: false,
      expression: "",
      resultDisplay: "",
      cursorPosition: 0,
    }),

  toggleCalculator: () =>
    set((state) => {
      if (state.isOpen) {
        // Closing - clear data
        return {
          isOpen: false,
          expression: "",
          resultDisplay: "",
          cursorPosition: 0,
        };
      }
      // Opening - keep data
      return { isOpen: true };
    }),

  setPosition: (pos) => set({ position: pos }),

  evaluate: () =>
    set((state) => {
      try {
        // Validate expression has content
        if (!state.expression.trim()) {
          return {
            expression: "Invalid expression",
            resultDisplay: "",
            cursorPosition: 18,
          };
        }

        // Convert math symbols to JavaScript operators
        let expr = state.expression
          .replace(/×/g, "*")
          .replace(/÷/g, "/")
          .replace(/−/g, "-")
          .replace(/π/g, String(Math.PI))
          .replace(/e(?![a-z])/g, String(Math.E))
          .replace(/sqrt\(/g, "Math.sqrt(")
          .replace(/sin\(/g, "Math.sin(")
          .replace(/cos\(/g, "Math.cos(")
          .replace(/tan\(/g, "Math.tan(")
          .replace(/asin\(/g, "Math.asin(")
          .replace(/acos\(/g, "Math.acos(")
          .replace(/atan\(/g, "Math.atan(")
          .replace(/ln\(/g, "Math.log(")
          .replace(/log\(/g, "Math.log10(")
          .replace(/abs\(/g, "Math.abs(")
          .replace(/\^/g, "**");

        // Check for empty parentheses
        if (expr.includes("()")) {
          return {
            expression: "Invalid expression",
            resultDisplay: "",
            cursorPosition: 18,
          };
        }

        // Convert angle mode for trig functions if needed
        if (state.angleMode === "DEG") {
          // Convert degrees to radians for sin, cos, tan
          expr = expr.replace(
            /Math\.(sin|cos|tan)\(/g,
            (match, func) => `Math.${func}((Math.PI/180)*`
          );
          // Add closing parenthesis for degree conversion
          const openParens = (expr.match(/Math\.(sin|cos|tan)\(/g) || [])
            .length;
          expr = expr + ")".repeat(openParens);
        }

        // Evaluate the expression
        const result = eval(expr);

        // Check if result is valid
        if (!isFinite(result)) {
          return {
            expression: "Invalid expression",
            resultDisplay: "",
            cursorPosition: 18,
          };
        }

        const resultStr = String(result);
        // Store the equation in resultDisplay (e.g., "5+5=10")
        const resultDisplay = `${state.expression}=${resultStr}`;
        return {
          resultDisplay,
          cursorPosition: state.expression.length,
        };
      } catch (error) {
        console.error("Evaluation error:", error);
        return {
          expression: "Invalid expression",
          resultDisplay: "",
          cursorPosition: 18,
        };
      }
    }),
}));
