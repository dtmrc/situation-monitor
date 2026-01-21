import { FileText, Sparkles, Copy, Check } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ExecutiveSummaryProps {
  content: string;
  onGenerate?: () => void;
  isGenerating?: boolean;
  onChange?: (content: string) => void;
  readOnly?: boolean;
}

export function ExecutiveSummary({
  content,
  onGenerate,
  isGenerating,
  onChange,
  readOnly = false,
}: ExecutiveSummaryProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Executive Summary
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!content}>
              {copied ? (
                <Check className="h-4 w-4 text-tactical-green" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            {onGenerate && (
              <Button variant="outline" size="sm" onClick={onGenerate} disabled={isGenerating}>
                <Sparkles className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {readOnly ? (
          <div className="prose prose-invert prose-sm max-w-none">
            {content ? (
              <div className="whitespace-pre-wrap">{content}</div>
            ) : (
              <p className="text-muted-foreground italic">
                No executive summary generated. Click "Generate" to create an AI-assisted summary
                based on your analysis data.
              </p>
            )}
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder="Enter executive summary or click Generate to create an AI-assisted summary..."
            className="w-full min-h-[200px] bg-transparent border-0 resize-none focus:outline-none text-sm"
          />
        )}
      </CardContent>
    </Card>
  );
}
