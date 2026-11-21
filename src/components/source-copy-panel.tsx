
"use client";

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type SourceCopyPanelProps = {
  sourceCopy: string;
  onSourceCopyChange: (newText: string) => void;
  isLoading: boolean;
  wordCount: number;
  limit: number;
  isLimitExceeded: boolean;
};

export function SourceCopyPanel({
  sourceCopy,
  onSourceCopyChange,
  isLoading,
  wordCount,
  limit,
  isLimitExceeded,
}: SourceCopyPanelProps) {

  return (
    <div className="flex-1 flex flex-col gap-2 min-w-0">
      <div className="flex-grow flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between h-8">
          <Label className="font-semibold text-2xs">Source Copy</Label>
          <div className="text-xs text-muted-foreground">
            <span className={cn(isLimitExceeded ? 'text-destructive font-bold' : '')}>
              {wordCount}
            </span>
            <span> / {limit} words</span>
          </div>
        </div>
        <div className="relative flex-grow border-2 border-dashed rounded-lg bg-background flex flex-col justify-start items-start overflow-auto">
           <Textarea
              value={sourceCopy}
              onChange={(e) => onSourceCopyChange(e.target.value)}
              disabled={isLoading}
              placeholder="Paste your source text here."
              className="w-full h-full text-sm resize-none border-0 focus-visible:ring-0 p-4 whitespace-pre-wrap"
            />
        </div>
      </div>
    </div>
  );
}
