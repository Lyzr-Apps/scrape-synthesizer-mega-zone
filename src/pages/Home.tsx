import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { callAIAgent } from '@/utils/aiAgent'
import type { NormalizedAgentResponse } from '@/utils/aiAgent'
import {
  Globe,
  Copy,
  Download,
  Trash2,
  Moon,
  Sun,
  Search,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Agent ID from PRD
const AGENT_ID = "69725146d6d0dcaec111c478"

// TypeScript interfaces from actual_test_response
interface ExtractedField {
  definitions?: string
  features?: string
  pricing?: string
  [key: string]: string | undefined
}

interface ExtractedData {
  url: string
  title: string
  extracted_fields: ExtractedField
}

interface StructuredTableRow {
  Feature?: string
  'Pricing Tier'?: string
  [key: string]: string | undefined
}

interface AgentResult {
  urls_processed: string[]
  extracted_data: ExtractedData[]
  structured_table: StructuredTableRow[]
  summary: string
}

interface HistoryItem {
  id: string
  timestamp: string
  url: string
  parameters: string[]
  format: string
  response: NormalizedAgentResponse
}

// Predefined parameter chips
const PREDEFINED_PARAMS = [
  'Definitions',
  'Features',
  'Pricing',
  'Categories',
  'Specifications',
  'FAQs'
]

// Format options
const FORMAT_OPTIONS = [
  { value: 'table', label: 'Table' },
  { value: 'bullet', label: 'Bullet List' },
  { value: 'keyvalue', label: 'Key-Value' }
]

// Header Component
function Header({ theme, toggleTheme }: { theme: string; toggleTheme: () => void }) {
  return (
    <header className="border-b bg-white dark:bg-slate-900 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Web Content Extractor & Synthesizer
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Extract structured data from any URL
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="rounded-lg"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </Button>
      </div>
    </header>
  )
}

// History Sidebar Component
function HistorySidebar({
  history,
  onSelectHistory,
  onClearHistory,
  selectedId
}: {
  history: HistoryItem[]
  onSelectHistory: (item: HistoryItem) => void
  onClearHistory: () => void
  selectedId: string | null
}) {
  return (
    <div className="w-80 border-r bg-slate-50 dark:bg-slate-900 flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">History</h2>
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearHistory}
              className="h-8 text-slate-500 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {history.length} extraction{history.length !== 1 ? 's' : ''}
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {history.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
              No history yet. Start by extracting content from a URL.
            </div>
          ) : (
            history.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectHistory(item)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-colors",
                  selectedId === item.id
                    ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                )}
              >
                <div className="flex items-start gap-2">
                  <Globe className="w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {new URL(item.url).hostname}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {new Date(item.timestamp).toLocaleDateString()} at{' '}
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.parameters.slice(0, 2).map((param, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {param}
                        </Badge>
                      ))}
                      {item.parameters.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{item.parameters.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// Input Section Component
function InputSection({
  url,
  setUrl,
  selectedParams,
  toggleParam,
  customParam,
  setCustomParam,
  addCustomParam,
  format,
  setFormat,
  instructions,
  setInstructions,
  onExtract,
  loading
}: {
  url: string
  setUrl: (url: string) => void
  selectedParams: string[]
  toggleParam: (param: string) => void
  customParam: string
  setCustomParam: (param: string) => void
  addCustomParam: () => void
  format: string
  setFormat: (format: string) => void
  instructions: string
  setInstructions: (instructions: string) => void
  onExtract: () => void
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Extract Content</CardTitle>
        <CardDescription>Enter a URL and select parameters to extract</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* URL Input */}
        <div className="space-y-2">
          <Label htmlFor="url" className="text-slate-900 dark:text-white">
            URL
          </Label>
          <div className="relative">
            <Globe className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>
        </div>

        {/* Parameter Chips */}
        <div className="space-y-2">
          <Label className="text-slate-900 dark:text-white">Parameters to Extract</Label>
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_PARAMS.map((param) => (
              <Badge
                key={param}
                variant={selectedParams.includes(param) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedParams.includes(param)
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
                onClick={() => !loading && toggleParam(param)}
              >
                {param}
                {selectedParams.includes(param) && (
                  <X className="w-3 h-3 ml-1" />
                )}
              </Badge>
            ))}
          </div>

          {/* Custom Parameter Input */}
          <div className="flex gap-2 mt-3">
            <Input
              placeholder="Add custom parameter..."
              value={customParam}
              onChange={(e) => setCustomParam(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCustomParam()}
              disabled={loading}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={addCustomParam}
              disabled={!customParam.trim() || loading}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Format Selector */}
        <div className="space-y-2">
          <Label htmlFor="format" className="text-slate-900 dark:text-white">
            Output Format
          </Label>
          <Select value={format} onValueChange={setFormat} disabled={loading}>
            <SelectTrigger id="format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Additional Instructions */}
        <div className="space-y-2">
          <Label htmlFor="instructions" className="text-slate-900 dark:text-white">
            Additional Instructions (Optional)
          </Label>
          <Textarea
            id="instructions"
            placeholder="Add any specific instructions for the extraction..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={3}
            disabled={loading}
          />
        </div>

        {/* Extract Button */}
        <Button
          onClick={onExtract}
          disabled={!url || selectedParams.length === 0 || loading}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Extract & Synthesize
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

// Results Display Component
function ResultsDisplay({
  response,
  loading
}: {
  response: NormalizedAgentResponse | null
  loading: boolean
}) {
  const [copiedText, setCopiedText] = useState<string | null>(null)

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(label)
      setTimeout(() => setCopiedText(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const copyAllData = () => {
    if (!response?.result) return
    const result = response.result as AgentResult

    let text = `Web Content Extraction\n\n`
    text += `URLs Processed: ${result.urls_processed?.join(', ') || 'N/A'}\n\n`

    if (result.summary) {
      text += `Summary:\n${result.summary}\n\n`
    }

    if (result.extracted_data?.length > 0) {
      text += `Extracted Data:\n`
      result.extracted_data.forEach((item) => {
        text += `\nURL: ${item.url}\n`
        text += `Title: ${item.title}\n`
        Object.entries(item.extracted_fields || {}).forEach(([key, value]) => {
          if (value) text += `${key}: ${value}\n`
        })
      })
    }

    copyToClipboard(text, 'all')
  }

  const downloadCSV = () => {
    if (!response?.result) return
    const result = response.result as AgentResult

    if (!result.structured_table || result.structured_table.length === 0) return

    const headers = Object.keys(result.structured_table[0])
    const csvContent = [
      headers.join(','),
      ...result.structured_table.map(row =>
        headers.map(h => `"${row[h] || ''}"`).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `extraction-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing...</CardTitle>
          <CardDescription>Extracting content from the URL</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    )
  }

  if (!response) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-12 pb-12 text-center">
          <Globe className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            Results will appear here after extraction
          </p>
        </CardContent>
      </Card>
    )
  }

  if (response.status === 'error') {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                Extraction Failed
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                {response.message || 'An error occurred during extraction'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const result = response.result as AgentResult

  return (
    <div className="space-y-4">
      {/* Success Header */}
      <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                Extraction Complete
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Processed {result.urls_processed?.length || 0} URL(s)
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyAllData}
                className="bg-white dark:bg-slate-800"
              >
                <Copy className="w-4 h-4 mr-2" />
                {copiedText === 'all' ? 'Copied!' : 'Copy All'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadCSV}
                className="bg-white dark:bg-slate-800"
              >
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {result.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 dark:text-slate-300">{result.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Extracted Data */}
      {result.extracted_data && result.extracted_data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Extracted Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.extracted_data.map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </h4>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {item.url}
                    </a>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const text = Object.entries(item.extracted_fields || {})
                        .map(([key, value]) => `${key}: ${value}`)
                        .join('\n')
                      copyToClipboard(text, `data-${idx}`)
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <Separator />
                <div className="space-y-2">
                  {Object.entries(item.extracted_fields || {}).map(([key, value]) => {
                    if (!value) return null
                    return (
                      <div key={key}>
                        <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                          {key}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {value}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Structured Table */}
      {result.structured_table && result.structured_table.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Structured Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(result.structured_table[0]).map((header) => (
                      <TableHead key={header} className="font-semibold">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.structured_table.map((row, idx) => (
                    <TableRow key={idx}>
                      {Object.values(row).map((value, cellIdx) => (
                        <TableCell key={cellIdx}>{value || '-'}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Main Home Component
export default function Home() {
  const [theme, setTheme] = useState<string>('light')
  const [url, setUrl] = useState('')
  const [selectedParams, setSelectedParams] = useState<string[]>([])
  const [customParam, setCustomParam] = useState('')
  const [format, setFormat] = useState('table')
  const [instructions, setInstructions] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<NormalizedAgentResponse | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)

  // Load theme and history from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)
    document.documentElement.classList.toggle('dark', savedTheme === 'dark')

    const savedHistory = localStorage.getItem('extraction-history')
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory))
      } catch (e) {
        console.error('Failed to load history:', e)
      }
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  const toggleParam = (param: string) => {
    setSelectedParams(prev =>
      prev.includes(param)
        ? prev.filter(p => p !== param)
        : [...prev, param]
    )
  }

  const addCustomParam = () => {
    if (customParam.trim() && !selectedParams.includes(customParam.trim())) {
      setSelectedParams(prev => [...prev, customParam.trim()])
      setCustomParam('')
    }
  }

  const handleExtract = async () => {
    if (!url || selectedParams.length === 0) return

    setLoading(true)
    setResponse(null)
    setSelectedHistoryId(null)

    try {
      // Build message for agent
      const message = `Extract content from URL: ${url}

Parameters to extract: ${selectedParams.join(', ')}
Output format: ${format}
${instructions ? `Additional instructions: ${instructions}` : ''}

Please return the extracted data in a structured format.`

      const result = await callAIAgent(message, AGENT_ID)

      if (result.success) {
        setResponse(result.response)

        // Save to history
        const historyItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          url,
          parameters: selectedParams,
          format,
          response: result.response
        }

        const newHistory = [historyItem, ...history].slice(0, 50) // Keep last 50
        setHistory(newHistory)
        localStorage.setItem('extraction-history', JSON.stringify(newHistory))
      } else {
        setResponse(result.response)
      }
    } catch (error) {
      console.error('Extraction error:', error)
      setResponse({
        status: 'error',
        result: {},
        message: 'An unexpected error occurred during extraction'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectHistory = (item: HistoryItem) => {
    setSelectedHistoryId(item.id)
    setUrl(item.url)
    setSelectedParams(item.parameters)
    setFormat(item.format)
    setResponse(item.response)
  }

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all history?')) {
      setHistory([])
      localStorage.removeItem('extraction-history')
      setSelectedHistoryId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col">
      <Header theme={theme} toggleTheme={toggleTheme} />

      <div className="flex-1 flex">
        <HistorySidebar
          history={history}
          onSelectHistory={handleSelectHistory}
          onClearHistory={handleClearHistory}
          selectedId={selectedHistoryId}
        />

        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto p-6 space-y-6">
            <InputSection
              url={url}
              setUrl={setUrl}
              selectedParams={selectedParams}
              toggleParam={toggleParam}
              customParam={customParam}
              setCustomParam={setCustomParam}
              addCustomParam={addCustomParam}
              format={format}
              setFormat={setFormat}
              instructions={instructions}
              setInstructions={setInstructions}
              onExtract={handleExtract}
              loading={loading}
            />

            <ResultsDisplay response={response} loading={loading} />
          </div>
        </main>
      </div>
    </div>
  )
}
