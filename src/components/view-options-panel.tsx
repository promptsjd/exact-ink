
"use client";

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type ViewOptionsPanelProps = {
  isGrayscale: boolean;
  onGrayscaleChange: (isGrayscale: boolean) => void;
  isExpandedView: boolean;
  onExpandedViewChange: (isExpanded: boolean) => void;
};

export function ViewOptionsPanel({
  isGrayscale,
  onGrayscaleChange,
  isExpandedView,
  onExpandedViewChange
}: ViewOptionsPanelProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center justify-between">
            <Label htmlFor="grayscale-mode" className="text-2xs font-medium">Grayscale</Label>
            <Switch
                id="grayscale-mode"
                checked={isGrayscale}
                onCheckedChange={onGrayscaleChange}
            />
        </div>
        <div className="flex items-center justify-between">
            <Label htmlFor="expand-view-mode" className="text-2xs font-medium">Expand View</Label>
            <Switch
                id="expand-view-mode"
                checked={isExpandedView}
                onCheckedChange={onExpandedViewChange}
            />
        </div>
    </div>
  );
}
