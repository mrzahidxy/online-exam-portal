"use client"

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import QuestionBuilderPage from '@/components/question-page';

function CreateQuestionContent() {
  const searchParams = useSearchParams();
  const paperId = searchParams.get('paperId') || undefined;

  return <QuestionBuilderPage paperId={paperId} />;
}

export default function CreateQuestionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateQuestionContent />
    </Suspense>
  );
}
