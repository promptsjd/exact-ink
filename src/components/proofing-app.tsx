
"use client";

import * as React from 'react';
import { DesignedFilePanel } from '@/components/designed-file-panel';
import { SourceCopyPanel } from '@/components/source-copy-panel';
import { useProofing } from '@/hooks/use-proofing';
import { ComparisonOptionsPanel } from './comparison-options-panel';
import { ViewOptionsPanel } from './view-options-panel';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function ProofingApp() {
  const {
    accessKey,
    setAccessKey,
    sourceCopy,
    setSourceCopy,
    designedFile,
    setDesignedFile,
    isLoading,
    isCheckDisabled,
    isWordLimitExceeded,
    wordCount,
    designedHighlights,
    comparisonResult,
    options,
    setOptions,
    handleCheck,
    noDifferencesFound,
    USAGE_LIMITS
  } = useProofing();

  const [isGrayscale, setIsGrayscale] = React.useState(false);
  const [isExpandedView, setIsExpandedView] = React.useState(false);
  const designedFilePanelRef = React.useRef<{ getProcessedImage: () => Promise<string | null> }>(null);

  const handleFileChange = (file: File | null) => {
    setDesignedFile(file);
  };

  const onCheckClick = () => {
    handleCheck(designedFilePanelRef.current?.getProcessedImage);
  }

  return (
    <div className="relative flex flex-col gap-4 p-4 md:px-6 bg-background text-foreground font-body min-h-screen">
        <header className="flex items-center justify-between py-2 border-b">
            <div className="flex-1"></div>
            <div className="flex-[2] text-center">
                <h1 className="text-2xl font-bold font-headline" style={{ color: 'hsl(var(--primary))' }}>
                    Exact Ink
                </h1>
                <p className="text-muted-foreground text-sm leading-tight">
                    Done re-reading the same text? Let Exact Ink check it for you. <br />
                    It compares your content with final designs.
                </p>
                <p className="text-muted-foreground text-[12px] leading-tight mt-1">
                Early Version: Best with standard fonts, may miss stylized text. <br />
                </p>
            </div>
            <div className="flex-1 flex justify-end">
            </div>
        </header>

        <main className="flex-grow flex flex-col md:flex-row items-stretch gap-4">
          <SourceCopyPanel
            sourceCopy={sourceCopy}
            onSourceCopyChange={setSourceCopy}
            isLoading={isLoading}
            wordCount={wordCount}
            limit={USAGE_LIMITS.MAX_WORDS}
            isLimitExceeded={isWordLimitExceeded}
          />

          <DesignedFilePanel
            ref={designedFilePanelRef}
            designedFile={designedFile}
            onFileChange={handleFileChange}
            isLoading={isLoading}
            highlights={designedHighlights}
            isGrayscale={isGrayscale}
            isExpandedView={isExpandedView}
            limits={{
                MAX_FILE_SIZE_MB: USAGE_LIMITS.MAX_FILE_SIZE_MB,
                MAX_IMAGE_DIMENSION: USAGE_LIMITS.MAX_IMAGE_DIMENSION,
            }}
          />

          <div className="flex flex-col justify-start items-center px-4 md:w-48">
            <div className="flex flex-col gap-2 pt-10 w-full">
              <ComparisonOptionsPanel options={options} onOptionChange={setOptions} />
              <Separator className="my-2"/>
              <ViewOptionsPanel
                isGrayscale={isGrayscale}
                onGrayscaleChange={setIsGrayscale}
                isExpandedView={isExpandedView}
                onExpandedViewChange={setIsExpandedView}
              />
            </div>
            <div className="w-full mt-auto flex flex-col gap-2">
              <Label htmlFor="ocr-access-key">Private access key</Label>
              <Input id="ocr-access-key" type="password" autoComplete="off" maxLength={256}
                value={accessKey} onChange={event => setAccessKey(event.target.value)}
                placeholder="Provided by the owner" disabled={isLoading} />
              <p className="text-xs text-muted-foreground">
                Checking sends the masked design image to Google Cloud Vision. Source text stays in your browser.
              </p>
              {noDifferencesFound && !!comparisonResult && (
                <div className="bg-green-100 text-green-800 text-xs font-medium p-2 rounded-md text-center">
                  No differences found.
                </div>
              )}
              <Button onClick={onCheckClick} disabled={isCheckDisabled} className="w-full" size="lg">
                {isLoading ? <Loader2 className="animate-spin" /> : 'Check'}
              </Button>
            </div>
          </div>
        </main>
    </div>
  );
}
