import React from 'react';
import { Download, RefreshCw, CheckCircle2, ArrowUpCircle, X, Sparkles } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { UpdateStatusData } from '../types';

export const UpdateNotification: React.FC = () => {
  const { setActiveTab } = useAppStore();
  const [updateData, setUpdateData] = React.useState<UpdateStatusData | null>(null);
  const [dismissed, setDismissed] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);

  React.useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return;

    const cleanup = window.electronAPI.onUpdateStatus((data: UpdateStatusData) => {
      console.log('[AutoUpdater] Status received:', data);
      setUpdateData(data);
      setDismissed(false);

      if (data.status === 'downloading') {
        setIsDownloading(true);
      } else if (data.status === 'downloaded') {
        setIsDownloading(false);
      }
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  if (dismissed || !updateData) return null;

  // Only show floating notification for available, downloading, or downloaded states
  if (!['available', 'downloading', 'downloaded'].includes(updateData.status)) {
    return null;
  }

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await window.electronAPI?.downloadUpdate();
    } catch (err) {
      setIsDownloading(false);
    }
  };

  const handleInstall = () => {
    window.electronAPI?.quitAndInstall();
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 rounded-xl p-4 shadow-2xl shadow-emerald-950/40 text-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              {updateData.status === 'downloaded' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : updateData.status === 'downloading' ? (
                <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                {updateData.status === 'downloaded'
                  ? 'Update Ready to Install'
                  : updateData.status === 'downloading'
                  ? 'Downloading Update...'
                  : 'New Update Available!'}
                {updateData.version && (
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold border border-emerald-800/60">
                    v{updateData.version}
                  </span>
                )}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {updateData.status === 'downloaded'
                  ? 'Restart Vindywashini Books now to apply the latest version.'
                  : updateData.status === 'downloading'
                  ? `${updateData.percent || 0}% completed`
                  : 'A newer version is available on GitHub Releases.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-slate-200 transition p-1"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress Bar during download */}
        {updateData.status === 'downloading' && (
          <div className="mt-3">
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${updateData.percent || 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
              <span>
                {updateData.transferred
                  ? `${(updateData.transferred / 1024 / 1024).toFixed(1)} MB`
                  : ''}
              </span>
              <span>
                {updateData.bytesPerSecond
                  ? `${(updateData.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`
                  : ''}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
          <button
            onClick={() => {
              setActiveTab('settings');
              setDismissed(true);
            }}
            className="text-[11px] font-medium text-slate-400 hover:text-slate-200 px-2 py-1 transition"
          >
            View Details
          </button>

          {updateData.status === 'available' && (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/60 transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloading ? 'Downloading...' : 'Download Update'}</span>
            </button>
          )}

          {updateData.status === 'downloaded' && (
            <button
              onClick={handleInstall}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/60 transition"
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              <span>Restart & Install</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
