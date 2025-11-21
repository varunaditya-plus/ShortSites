'use client';

import { Suspense } from 'react';
import Editor from '@/pages/editor';

function EditorWrapper() {
  return <Editor />;
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditorWrapper />
    </Suspense>
  );
}