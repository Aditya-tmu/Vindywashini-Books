import React from 'react';
import {
  HelpCircle,
  X,
  Search,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  ListChecks,
  ChevronRight,
  ExternalLink,
  Info,
} from 'lucide-react';
import { HELP_TOPICS, HelpTopic } from '../help/helpContent';

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopicId?: string;
}

export const HelpDrawer: React.FC<HelpDrawerProps> = ({
  isOpen,
  onClose,
  initialTopicId = 'voucher',
}) => {
  const [selectedTopicId, setSelectedTopicId] = React.useState<string>(initialTopicId);
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  React.useEffect(() => {
    if (initialTopicId && HELP_TOPICS[initialTopicId]) {
      setSelectedTopicId(initialTopicId);
    }
  }, [initialTopicId, isOpen]);

  if (!isOpen) return null;

  const allTopics = Object.values(HELP_TOPICS);
  const filteredTopics = allTopics.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.commonErrors.some(
        (e) =>
          e.error.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.cause.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const currentTopic: HelpTopic = HELP_TOPICS[selectedTopicId] || allTopics[0];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full text-slate-100 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <span>Vindywashini Books Knowledge Base</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded font-mono">
                  v1.1
                </span>
              </h2>
              <p className="text-xs text-slate-400">Contextual guides, error troubleshooting & accounting rules</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close Help"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/90">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help topics, error messages, GST rules..."
              className="w-full bg-slate-950 text-xs pl-9 pr-4 py-2 rounded-lg border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Main Content Area: Left Sidebar (Topic Index) & Right Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Topic List */}
          <div className="w-48 border-r border-slate-800 bg-slate-950/50 p-2 overflow-y-auto space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1 tracking-wider">Topics</div>
            {filteredTopics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => setSelectedTopicId(topic.id)}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                  selectedTopicId === topic.id
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span className="truncate">{topic.title}</span>
                {selectedTopicId === topic.id && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
              </button>
            ))}
          </div>

          {/* Topic Details */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Topic Title & Category */}
            <div>
              <div className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 mb-1.5">
                {currentTopic.category}
              </div>
              <h1 className="text-xl font-black text-slate-100">{currentTopic.title}</h1>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{currentTopic.summary}</p>
            </div>

            {/* Required Fields Section */}
            {currentTopic.requiredFields && currentTopic.requiredFields.length > 0 && (
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <ListChecks className="w-4 h-4" />
                  <span>Required Fields & Validation</span>
                </div>
                <ul className="space-y-1 text-xs text-slate-300">
                  {currentTopic.requiredFields.map((field, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{field}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Common Errors & Solutions */}
            {currentTopic.commonErrors && currentTopic.commonErrors.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Troubleshooting Common Errors</span>
                </div>

                <div className="space-y-2.5">
                  {currentTopic.commonErrors.map((err, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 p-3 rounded-xl border border-rose-950/80 hover:border-rose-800/80 transition space-y-1.5"
                    >
                      <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                        <span>{err.error}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        <span className="text-slate-500 font-semibold">Why it happens:</span> {err.cause}
                      </div>
                      <div className="text-[11px] text-emerald-300 bg-emerald-950/40 p-2 rounded border border-emerald-900/60 leading-relaxed">
                        <span className="text-emerald-400 font-bold">Fix:</span> {err.solution}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step-by-Step Guide */}
            {currentTopic.stepByStep && currentTopic.stepByStep.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Step-by-Step Instructions</span>
                </div>
                <div className="space-y-1.5 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  {currentTopic.stepByStep.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                      <span className="w-5 h-5 rounded-full bg-sky-950 text-sky-400 font-mono font-bold flex items-center justify-center text-[10px] shrink-0 border border-sky-800/60">
                        {idx + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Guide Markdown Content */}
            {currentTopic.markdownContent && (
              <div className="border-t border-slate-800 pt-4 text-xs text-slate-300 leading-relaxed space-y-2 prose prose-invert max-w-none">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>Reference Guide</span>
                </div>
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-[11px] whitespace-pre-line">
                  {currentTopic.markdownContent.trim()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs text-slate-500">
          <span>Need more help? Contact support or check settings.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
