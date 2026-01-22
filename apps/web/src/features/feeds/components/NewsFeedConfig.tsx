/**
 * News Feed Configuration Component
 *
 * Specialized configuration form for news/OSINT feeds:
 * - NewsAPI configuration with keywords and domains
 * - RSS feed URLs management
 * - GDELT query builder
 * - Enrichment options (entity extraction, sentiment, topics, credibility)
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe, Newspaper, Plus, Rss, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';

// Validation schema
const newsFeedSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  enabled: z.boolean(),
  sourceType: z.enum(['newsapi', 'rss', 'gdelt']),
  pollIntervalSeconds: z.number().min(60).max(3600),
  // NewsAPI options
  newsApiKey: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  domains: z.array(z.string()).optional(),
  excludeDomains: z.array(z.string()).optional(),
  // RSS options
  feedUrls: z.array(z.string().url()).optional(),
  fetchFullContent: z.boolean().optional(),
  maxAgeHours: z.number().min(1).max(168).optional(),
  // GDELT options
  gdeltQuery: z.string().optional(),
  gdeltMode: z.enum(['doc', 'gkg']).optional(),
  sourceCountries: z.array(z.string()).optional(),
  themes: z.array(z.string()).optional(),
  // Enrichment options
  enrichmentOptions: z.object({
    extractEntities: z.boolean(),
    analyzeSentiment: z.boolean(),
    classifyTopics: z.boolean(),
    checkCredibility: z.boolean(),
  }),
});

type NewsFeedFormData = z.infer<typeof newsFeedSchema>;

interface NewsFeedConfigProps {
  projectId: string;
  existingConfig?: NewsFeedFormData & { id: string };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function NewsFeedConfig({
  projectId,
  existingConfig,
  onSuccess,
  onCancel,
}: NewsFeedConfigProps) {
  const queryClient = useQueryClient();

  // State for array fields
  const [keywords, setKeywords] = useState<string[]>(existingConfig?.keywords || []);
  const [feedUrls, setFeedUrls] = useState<string[]>(existingConfig?.feedUrls || []);
  const [domains, setDomains] = useState<string[]>(existingConfig?.domains || []);
  const [excludeDomains, setExcludeDomains] = useState<string[]>(
    existingConfig?.excludeDomains || []
  );
  const [sourceCountries, setSourceCountries] = useState<string[]>(
    existingConfig?.sourceCountries || []
  );

  // Input states
  const [keywordInput, setKeywordInput] = useState('');
  const [feedUrlInput, setFeedUrlInput] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [excludeDomainInput, setExcludeDomainInput] = useState('');
  const [countryInput, setCountryInput] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<NewsFeedFormData>({
    resolver: zodResolver(newsFeedSchema),
    defaultValues: existingConfig || {
      name: '',
      enabled: true,
      sourceType: 'newsapi',
      pollIntervalSeconds: 300,
      fetchFullContent: false,
      maxAgeHours: 24,
      gdeltMode: 'doc',
      enrichmentOptions: {
        extractEntities: true,
        analyzeSentiment: true,
        classifyTopics: true,
        checkCredibility: true,
      },
    },
  });

  const sourceType = watch('sourceType');

  const mutation = useMutation({
    mutationFn: async (data: NewsFeedFormData) => {
      const payload = {
        ...data,
        type: 'news',
        keywords,
        feedUrls,
        domains,
        excludeDomains,
        sourceCountries,
        options: {
          sourceType: data.sourceType,
          ...(data.sourceType === 'newsapi' && {
            apiKey: data.newsApiKey,
            keywords,
            domains,
            excludeDomains,
          }),
          ...(data.sourceType === 'rss' && {
            feedUrls,
            fetchFullContent: data.fetchFullContent,
            maxAgeHours: data.maxAgeHours,
          }),
          ...(data.sourceType === 'gdelt' && {
            query: data.gdeltQuery,
            mode: data.gdeltMode,
            sourceCountries,
            themes: data.themes,
          }),
          enrichment: data.enrichmentOptions,
        },
        pollInterval: data.pollIntervalSeconds * 1000,
      };

      if (existingConfig?.id) {
        return api.patch(`/projects/${projectId}/feeds/${existingConfig.id}`, payload);
      }
      return api.post(`/projects/${projectId}/feeds`, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feeds', projectId] });
      onSuccess?.();
    },
  });

  // Array field handlers
  const addToArray = (
    value: string,
    array: string[],
    setArray: React.Dispatch<React.SetStateAction<string[]>>,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const trimmed = value.trim();
    if (trimmed && !array.includes(trimmed)) {
      setArray([...array, trimmed]);
      setInput('');
    }
  };

  const removeFromArray = (
    value: string,
    setArray: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setArray((prev) => prev.filter((v) => v !== value));
  };

  const onSubmit = (data: NewsFeedFormData) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-accent-green">
            {existingConfig ? 'Edit News Feed' : 'Configure News Feed'}
          </CardTitle>
          <CardDescription>Set up news ingestion from NewsAPI, RSS feeds, or GDELT</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Settings */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Feed Name</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Ukraine Conflict News"
                className="bg-zinc-800 border-zinc-700"
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceType">Source Type</Label>
              <Select
                value={sourceType}
                onValueChange={(value) =>
                  setValue('sourceType', value as 'newsapi' | 'rss' | 'gdelt')
                }
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newsapi">
                    <div className="flex items-center gap-2">
                      <Newspaper className="h-4 w-4" />
                      NewsAPI
                    </div>
                  </SelectItem>
                  <SelectItem value="rss">
                    <div className="flex items-center gap-2">
                      <Rss className="h-4 w-4" />
                      RSS Feeds
                    </div>
                  </SelectItem>
                  <SelectItem value="gdelt">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      GDELT Project
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={watch('enabled')}
                onCheckedChange={(checked) => setValue('enabled', checked)}
              />
              <Label htmlFor="enabled">Enabled</Label>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="pollInterval">Poll Interval (seconds)</Label>
              <Input
                id="pollInterval"
                type="number"
                {...register('pollIntervalSeconds', { valueAsNumber: true })}
                className="w-24 bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          {/* NewsAPI Configuration */}
          {sourceType === 'newsapi' && (
            <div className="space-y-4 rounded-lg border border-zinc-800 p-4">
              <h4 className="text-sm font-medium text-zinc-300">NewsAPI Configuration</h4>

              <div className="space-y-2">
                <Label htmlFor="newsApiKey">API Key</Label>
                <Input
                  id="newsApiKey"
                  type="password"
                  {...register('newsApiKey')}
                  placeholder="Your NewsAPI key"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>

              <div className="space-y-2">
                <Label>Keywords</Label>
                <div className="flex gap-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="Add keyword"
                    className="bg-zinc-800 border-zinc-700"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray(keywordInput, keywords, setKeywords, setKeywordInput);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addToArray(keywordInput, keywords, setKeywords, setKeywordInput)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="bg-zinc-800">
                      {keyword}
                      <button
                        type="button"
                        onClick={() => removeFromArray(keyword, setKeywords)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Restrict to Domains (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    placeholder="e.g., reuters.com"
                    className="bg-zinc-800 border-zinc-700"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray(domainInput, domains, setDomains, setDomainInput);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addToArray(domainInput, domains, setDomains, setDomainInput)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {domains.map((domain) => (
                    <Badge key={domain} variant="secondary" className="bg-zinc-800">
                      {domain}
                      <button
                        type="button"
                        onClick={() => removeFromArray(domain, setDomains)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Exclude Domains (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    value={excludeDomainInput}
                    onChange={(e) => setExcludeDomainInput(e.target.value)}
                    placeholder="e.g., tabloid.com"
                    className="bg-zinc-800 border-zinc-700"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray(
                          excludeDomainInput,
                          excludeDomains,
                          setExcludeDomains,
                          setExcludeDomainInput
                        );
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      addToArray(
                        excludeDomainInput,
                        excludeDomains,
                        setExcludeDomains,
                        setExcludeDomainInput
                      )
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {excludeDomains.map((domain) => (
                    <Badge key={domain} variant="secondary" className="bg-zinc-800">
                      {domain}
                      <button
                        type="button"
                        onClick={() => removeFromArray(domain, setExcludeDomains)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* RSS Configuration */}
          {sourceType === 'rss' && (
            <div className="space-y-4 rounded-lg border border-zinc-800 p-4">
              <h4 className="text-sm font-medium text-zinc-300">RSS Feed Configuration</h4>

              <div className="space-y-2">
                <Label>RSS Feed URLs</Label>
                <div className="flex gap-2">
                  <Input
                    value={feedUrlInput}
                    onChange={(e) => setFeedUrlInput(e.target.value)}
                    placeholder="https://example.com/feed.xml"
                    className="bg-zinc-800 border-zinc-700"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray(feedUrlInput, feedUrls, setFeedUrls, setFeedUrlInput);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addToArray(feedUrlInput, feedUrls, setFeedUrls, setFeedUrlInput)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {feedUrls.map((url) => (
                    <Badge key={url} variant="secondary" className="bg-zinc-800 max-w-full">
                      <span className="truncate max-w-[200px]">{url}</span>
                      <button
                        type="button"
                        onClick={() => removeFromArray(url, setFeedUrls)}
                        className="ml-1 hover:text-red-500 flex-shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="fetchFullContent"
                  checked={watch('fetchFullContent')}
                  onCheckedChange={(checked) => setValue('fetchFullContent', checked)}
                />
                <Label htmlFor="fetchFullContent">Fetch full article content</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxAgeHours">Max Article Age (hours)</Label>
                <Input
                  id="maxAgeHours"
                  type="number"
                  {...register('maxAgeHours', { valueAsNumber: true })}
                  placeholder="24"
                  className="w-24 bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>
          )}

          {/* GDELT Configuration */}
          {sourceType === 'gdelt' && (
            <div className="space-y-4 rounded-lg border border-zinc-800 p-4">
              <h4 className="text-sm font-medium text-zinc-300">GDELT Configuration</h4>

              <div className="space-y-2">
                <Label htmlFor="gdeltQuery">Search Query</Label>
                <Textarea
                  id="gdeltQuery"
                  {...register('gdeltQuery')}
                  placeholder="e.g., Ukraine conflict OR Russia military"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gdeltMode">API Mode</Label>
                <Select
                  value={watch('gdeltMode') || 'doc'}
                  onValueChange={(value) => setValue('gdeltMode', value as 'doc' | 'gkg')}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doc">Document API</SelectItem>
                    <SelectItem value="gkg">Global Knowledge Graph</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Source Countries (ISO codes)</Label>
                <div className="flex gap-2">
                  <Input
                    value={countryInput}
                    onChange={(e) => setCountryInput(e.target.value)}
                    placeholder="e.g., US, GB, UA"
                    className="bg-zinc-800 border-zinc-700"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray(
                          countryInput.toUpperCase(),
                          sourceCountries,
                          setSourceCountries,
                          setCountryInput
                        );
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      addToArray(
                        countryInput.toUpperCase(),
                        sourceCountries,
                        setSourceCountries,
                        setCountryInput
                      )
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {sourceCountries.map((country) => (
                    <Badge key={country} variant="secondary" className="bg-zinc-800">
                      {country}
                      <button
                        type="button"
                        onClick={() => removeFromArray(country, setSourceCountries)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Enrichment Options */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <h4 className="text-sm font-medium text-zinc-400">Enrichment Options</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="extractEntities"
                  checked={watch('enrichmentOptions.extractEntities')}
                  onCheckedChange={(checked) =>
                    setValue('enrichmentOptions.extractEntities', checked)
                  }
                />
                <Label htmlFor="extractEntities">Extract entities (people, orgs, locations)</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="analyzeSentiment"
                  checked={watch('enrichmentOptions.analyzeSentiment')}
                  onCheckedChange={(checked) =>
                    setValue('enrichmentOptions.analyzeSentiment', checked)
                  }
                />
                <Label htmlFor="analyzeSentiment">Analyze sentiment</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="classifyTopics"
                  checked={watch('enrichmentOptions.classifyTopics')}
                  onCheckedChange={(checked) =>
                    setValue('enrichmentOptions.classifyTopics', checked)
                  }
                />
                <Label htmlFor="classifyTopics">Classify topics</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="checkCredibility"
                  checked={watch('enrichmentOptions.checkCredibility')}
                  onCheckedChange={(checked) =>
                    setValue('enrichmentOptions.checkCredibility', checked)
                  }
                />
                <Label htmlFor="checkCredibility">Check source credibility</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : existingConfig ? 'Update Feed' : 'Create Feed'}
        </Button>
      </div>
    </form>
  );
}

export default NewsFeedConfig;
