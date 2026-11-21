
"use client";

import * as React from 'react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud, Brush, X, Maximize, Minimize } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { DesignedHighlight } from '@/lib/highlighter';
import { HighlightedImage } from '@/components/highlighted-image';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export type Mask = { x: number; y: number; width: number; height: number };

type DesignedFilePanelProps = {
  designedFile: File | null;
  onFileChange: (file: File | null) => void;
  isLoading: boolean;
  highlights: DesignedHighlight[];
  isGrayscale: boolean;
  isExpandedView: boolean;
  limits: {
    MAX_FILE_SIZE_MB: number;
    MAX_IMAGE_DIMENSION: number;
  }
};

export const DesignedFilePanel = React.forwardRef<
  { getProcessedImage: () => Promise<string | null> },
  DesignedFilePanelProps
>(({ designedFile, onFileChange, isLoading, highlights, isGrayscale, isExpandedView, limits }, ref) => {
  const [masks, setMasks] = useState<Mask[]>([]);
  const [isMaskingMode, setIsMaskingMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const highlightedImageRef = useRef<{ getProcessedImage: () => Promise<string | null> }>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  React.useImperativeHandle(ref, () => ({
    getProcessedImage: async () => {
      if (highlightedImageRef.current) {
        return highlightedImageRef.current.getProcessedImage();
      }
      return null;
    }
  }));

  const validateImage = async (file: File): Promise<boolean> => {
    if (file.size > limits.MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({
            variant: "destructive",
            title: "File Too Large",
            description: `The image cannot exceed ${limits.MAX_FILE_SIZE_MB} MB.`,
        });
        return false;
    }

    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Invalid image'));
        image.src = objectUrl;
      });
    } catch {
      toast({ variant: 'destructive', title: 'Invalid image', description: 'Choose a readable PNG or JPEG image.' });
      return false;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }

    if (image.width > limits.MAX_IMAGE_DIMENSION || image.height > limits.MAX_IMAGE_DIMENSION) {
        toast({
            variant: "destructive",
            title: "Image Dimensions Too Large",
            description: `The image dimensions cannot exceed ${limits.MAX_IMAGE_DIMENSION}x${limits.MAX_IMAGE_DIMENSION} pixels.`,
        });
        return false;
    }

    return true;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'image/png' || file.type === 'image/jpeg') {
        if (await validateImage(file)) {
            onFileChange(file);
            setMasks([]);
            setIsMaskingMode(false);
        } else {
            onFileChange(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
      } else {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a valid image file (PNG or JPG).",
        });
      }
    }
  };

  const handleRemoveFile = () => {
    onFileChange(null);
    setMasks([]);
    setIsMaskingMode(false);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleToggleFullscreen = () => {
    const elem = fullscreenContainerRef.current;
    if (!elem) return;

    if (!document.fullscreenElement) {
        elem.requestFullscreen().catch(err => {
            alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        document.exitFullscreen();
    }
  };

  React.useEffect(() => {
    const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between h-8">
            <Label className="font-semibold text-2xs">Designed File</Label>
            <div className='flex items-center gap-2'>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setIsMaskingMode(!isMaskingMode)} disabled={!designedFile || isLoading}>
                                {isMaskingMode ? <X className="h-3 w-3 mr-1" /> : <Brush className="h-3 w-3 mr-1" />}
                                {isMaskingMode ? 'Exit Masking' : 'Omit Sections'}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Click and drag to draw boxes over text to exclude.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {isMaskingMode && (
                <Button variant="outline" size="sm" onClick={() => setMasks([])} disabled={masks.length === 0 || isLoading}>
                    Clear Masks
                </Button>
                )}
            </div>
        </div>
        <div className="relative group flex-grow w-full border-2 border-dashed rounded-lg bg-background p-2 flex flex-col justify-start">
            {designedFile ? (
                <div className='relative w-full h-full flex-grow overflow-hidden'>
                     <div className="absolute inset-0 flex items-start justify-center overflow-y-auto">
                        <HighlightedImage
                            ref={highlightedImageRef}
                            file={designedFile}
                            highlights={highlights}
                            masks={masks}
                            isMaskingMode={isMaskingMode}
                            onMasksChange={setMasks}
                            isLoading={isLoading}
                            isGrayscale={isGrayscale}
                            isFitToPanel={!isExpandedView}
                        />
                    </div>
                    <Button variant="destructive" size="icon" className="absolute top-2 right-12 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-6 w-6" onClick={handleRemoveFile}>
                        <X className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-6 w-6" onClick={handleToggleFullscreen}>
                        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </Button>

                    <div ref={fullscreenContainerRef} className="bg-background">
                        {isFullscreen && (
                             <div className="w-screen h-screen flex items-center justify-center p-4" onClick={handleToggleFullscreen}>
                                <HighlightedImage
                                    file={designedFile}
                                    highlights={highlights}
                                    masks={masks}
                                    isMaskingMode={false}
                                    onMasksChange={() => {}}
                                    isLoading={isLoading}
                                    isGrayscale={isGrayscale}
                                    isZoomed={true}
                                />
                             </div>
                        )}
                    </div>
                </div>
            ) : (
                <Label htmlFor="designed-file-upload" className="w-full h-full flex items-center justify-center cursor-pointer">
                <div className="flex flex-col items-center justify-center text-center p-4 h-full w-full">
                    <UploadCloud className="w-10 h-10 mb-4 text-muted-foreground" />
                    <Button asChild variant="outline">
                        <span className="font-semibold text-primary">Click to upload</span>
                    </Button>
                    <p className="mt-2 text-xs text-muted-foreground">or drag and drop</p>
                    <p className="text-xs text-muted-foreground">PNG or JPG file</p>
                    <p className="text-xs text-muted-foreground">(Max: {limits.MAX_FILE_SIZE_MB}MB or {limits.MAX_IMAGE_DIMENSION}px)</p>
                </div>
                </Label>
            )}
            <Input ref={fileInputRef} id="designed-file-upload" type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleFileChange}/>
        </div>
    </div>
  );
});

DesignedFilePanel.displayName = 'DesignedFilePanel';
