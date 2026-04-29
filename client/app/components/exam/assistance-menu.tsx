"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronDown, LogOut, Send } from "lucide-react";

type AssistanceMenuProps = {
  onQuit: () => void;
  onSubmit: () => void;
  canSubmitEarly: boolean;
  earlySubmitDisabledMessage?: string;
};

export function AssistanceMenu({
  onQuit,
  onSubmit,
  canSubmitEarly,
  earlySubmitDisabledMessage,
}: AssistanceMenuProps) {
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1 text-white bg-blue-500 hover:bg-blue-600"
          >
            Assistance
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => setShowSubmitDialog(true)}
            disabled={!canSubmitEarly}
            className="cursor-pointer"
          >
            <Send className="mr-2 h-4 w-4" />
            <span>Submit Early</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowQuitDialog(true)}
            className="cursor-pointer text-red-600 focus:text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Quit Exam</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Quit Confirmation Dialog */}
      <AlertDialog open={showQuitDialog} onOpenChange={setShowQuitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to quit?</AlertDialogTitle>
            <AlertDialogDescription>
              If you quit the exam without submitting, your progress will not be
              saved and you may not be able to retake it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onQuit}
              className="bg-red-600 hover:bg-red-700"
            >
              Quit Exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit Early Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit your exam early?</AlertDialogTitle>
            <AlertDialogDescription>
              {canSubmitEarly ? (
                <>
                  Once submitted, you cannot make any changes. Make sure you
                  have reviewed all your answers before submitting.
                </>
              ) : (
                earlySubmitDisabledMessage ||
                "Early submission is not available yet."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {canSubmitEarly && (
              <AlertDialogAction onClick={onSubmit}>
                Submit Now
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
