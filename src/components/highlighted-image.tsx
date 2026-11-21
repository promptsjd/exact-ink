
"use client";

import * as React from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { DesignedHighlight } from '@/lib/highlighter';
import { highlightStyles } from '@/styles/highlights';
import type { Mask } from './designed-file-panel';

type HighlightedImageProps = {
  file: File;
  highlights: DesignedHighlight[];
  masks: Mask[];
  isMaskingMode: boolean;
  onMasksChange: (masks: Mask[]) => void;
  isLoading: boolean;
  isGrayscale: boolean;
  isFitToPanel?: boolean;
  isZoomed?: boolean;
};

export const HighlightedImage = React.forwardRef<
  { getProcessedImage: () => Promise<string | null> },
  HighlightedImageProps
>(({ file, highlights, masks, isMaskingMode, onMasksChange, isLoading, isGrayscale, isFitToPanel = true, isZoomed = false }, ref) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentMask, setCurrentMask] = useState<Mask | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const drawCanvasContent = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !image.src) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply grayscale filter if enabled
    if (isGrayscale) {
      ctx.filter = 'grayscale(100%)';
    }

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Reset filter so highlights are in color
    ctx.filter = 'none';

    // Draw highlights and markers
    highlights.forEach(highlight => {
        if (!highlight.boundingBox || !highlight.boundingBox.vertices) return;

        const style = highlightStyles[highlight.type];
        if (!style) return;

        ctx.fillStyle = style.fillStyle;
        ctx.shadowColor = style.shadowColor || 'transparent';
        ctx.shadowBlur = style.shadowBlur || 0;

        const vertices = highlight.boundingBox.vertices;
        const xCoords = vertices.map(v => v.x || 0);
        const yCoords = vertices.map(v => v.y || 0);
        const minX = Math.min(...xCoords);
        const minY = Math.min(...yCoords);
        const maxX = Math.max(...xCoords);
        const maxY = Math.max(...yCoords);
        const width = maxX - minX;
        const height = maxY - minY;

        if (highlight.isRemovalMarker) {
            // "Above-the-line" caret implementation
            const caretSize = Math.max(8, height * 0.4);
            const caretX = maxX + 4;
            const caretY = minY - 1;

            ctx.fillStyle = highlightStyles.removed.fillStyle;
            ctx.beginPath();
            ctx.moveTo(caretX, caretY - caretSize);
            ctx.lineTo(caretX + caretSize / 2, caretY);
            ctx.lineTo(caretX - caretSize / 2, caretY);
            ctx.closePath();
            ctx.fill();

        } else if (highlight.isPunctuationRemovalMarker) {
            const markerHeight = height;
            const markerWidth = 8;
            ctx.fillStyle = highlightStyles.punctuation.fillStyle;
            ctx.fillRect(maxX + 2, maxY - markerHeight, markerWidth, markerHeight);
        } else {
            ctx.fillRect(minX, minY, width, height);
        }

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    });

    if (!isZoomed) {
        // Draw masks for omitting sections
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        masks.forEach(mask => {
          ctx.fillRect(mask.x, mask.y, mask.width, mask.height);
        });

        // Draw current mask being drawn
        if (currentMask) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(currentMask.x, currentMask.y, currentMask.width, currentMask.height);
        }
    }
  }, [masks, currentMask, highlights, isGrayscale, isZoomed]);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            imageRef.current = img;
            drawCanvasContent();
        };
        img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [file, drawCanvasContent]);

  useEffect(() => {
    drawCanvasContent();
  }, [masks, currentMask, highlights, drawCanvasContent]);

  React.useImperativeHandle(ref, () => ({
    getProcessedImage: async () => {
      if (!imageRef.current || !file) {
        return null;
      }
      const processingCanvas = document.createElement('canvas');
      const ctx = processingCanvas.getContext('2d');
      if (!ctx) return null;

      const image = imageRef.current;
      processingCanvas.width = image.naturalWidth;
      processingCanvas.height = image.naturalHeight;

      ctx.drawImage(image, 0, 0);
      ctx.fillStyle = 'black';

      masks.forEach(mask => {
          ctx.fillRect(mask.x, mask.y, mask.width, mask.height);
      });

      return processingCanvas.toDataURL(file.type);
    }
  }));

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMaskingMode || isLoading || isZoomed) return;
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCanvasCoordinates(e);
    setStartPoint(coords);
    setCurrentMask({ ...coords, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint || isZoomed) return;
    e.preventDefault();
    const coords = getCanvasCoordinates(e);
    const width = coords.x - startPoint.x;
    const height = coords.y - startPoint.y;
    setCurrentMask({
      x: width > 0 ? startPoint.x : coords.x,
      y: height > 0 ? startPoint.y : coords.y,
      width: Math.abs(width),
      height: Math.abs(height),
    });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentMask || isZoomed) return;
    e.preventDefault();

    if (currentMask.width > 5 && currentMask.height > 5) {
      onMasksChange([...masks, currentMask]);
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentMask(null);
  };

  return (
    <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={cn(
            'mx-auto',
            isFitToPanel ? "object-contain w-auto h-full max-w-full" : "w-full h-auto",
            isZoomed && "object-contain w-auto h-auto max-w-screen max-h-screen",
            isMaskingMode && !isZoomed ? "cursor-crosshair" : "cursor-default"
        )}
    />
  );
});

HighlightedImage.displayName = 'HighlightedImage';
