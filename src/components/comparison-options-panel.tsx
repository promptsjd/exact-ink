
"use client";

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export type ComparisonOptions = {
    spelling: boolean;
    added: boolean;
    removed: boolean;
    capitalization: boolean;
    punctuation: boolean;
};

const optionTagMap: Record<string, string> = {
    spelling: "bg-red-200 text-red-800",
    capitalization: "bg-yellow-200 text-yellow-800",
    punctuation: "bg-purple-200 text-purple-800",
    added: "bg-blue-200 text-blue-800",
    removed: "bg-orange-200 text-orange-800",
};

const optionOrder: Array<keyof ComparisonOptions> = ['spelling', 'capitalization', 'punctuation', 'added', 'removed'];

type ComparisonOptionsPanelProps = {
  options: ComparisonOptions;
  onOptionChange: (options: ComparisonOptions) => void;
};

export function ComparisonOptionsPanel({ options, onOptionChange }: ComparisonOptionsPanelProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {(optionOrder as (keyof ComparisonOptions)[]).map(key => {
          const label = key.charAt(0).toUpperCase() + key.slice(1);
          return (
              <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                      id={key}
                      checked={!!options[key]}
                      onCheckedChange={(checked) => {
                        onOptionChange({ ...options, [key]: !!checked });
                      }}
                  />
                  <Label htmlFor={key} className="text-2xs capitalize font-medium cursor-pointer w-full">
                      <span className={`${optionTagMap[key]} px-2 py-0.5 rounded-md w-full inline-block`}>{label}</span>
                  </Label>
              </div>
          )
      })}
    </div>
  );
}
