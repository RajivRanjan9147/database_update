
import React, { useState } from 'react';
import { fetchAllForVariant } from '../services/api';
import { ChevronDown, ChevronRight, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

// ─── Small helpers ──────────────────────────────────────────────────────────

const fullId = (id) => (id ? String(id) : '—');

const ModuleIcon = ({ type }) =>
  type === 'OCR' ? (
    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500 mr-1.5 flex-shrink-0" title="OCR" />
  ) : (
    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-orange-500 mr-1.5 flex-shrink-0" title="Detection" />
  );

// ─── GT rows ────────────────────────────────────────────────────────────────

const GtRow = ({ gt, type }) => {
  if (type === 'OCR') {
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600 pl-4 py-0.5 border-l-2 border-blue-100 ml-3">
        {gt.option_key && <span><span className="text-gray-400">key:</span> <code className="font-mono">{gt.option_key}</code></span>}
        {gt.option_label && <span><span className="text-gray-400">label:</span> {gt.option_label}</span>}
        {gt.value && <span><span className="text-gray-400">value:</span> <code className="font-mono">{gt.value}</code></span>}
        {gt.prefix && <span><span className="text-gray-400">prefix:</span> {gt.prefix}</span>}
        {gt.suffix && <span><span className="text-gray-400">suffix:</span> {gt.suffix}</span>}
        {gt.match_type && <span><span className="text-gray-400">match:</span> {gt.match_type}</span>}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600 pl-4 py-0.5 border-l-2 border-orange-100 ml-3">
      {(gt.class || gt.class_name) && <span><span className="text-gray-400">class:</span> <code className="font-mono">{gt.class ?? gt.class_name}</code></span>}
      {gt.option_key && <span><span className="text-gray-400">key:</span> <code className="font-mono">{gt.option_key}</code></span>}
      {gt.option_label && <span><span className="text-gray-400">label:</span> {gt.option_label}</span>}
    </div>
  );
};

// ─── GT label chips (shown inline next to module ID) ─────────────────────────

const GtChips = ({ gtEntries, type }) => {
  const labels = gtEntries
    .map((gt) => (type === 'OCR' ? gt.value : gt.option_label))
    .filter(Boolean);

  if (labels.length === 0) return null;

  const chipClass =
    type === 'OCR'
      ? 'bg-blue-50 text-blue-700 border border-blue-200'
      : 'bg-orange-50 text-orange-700 border border-orange-200';

  return (
    <span className="flex flex-wrap gap-1 ml-1">
      {labels.map((label, i) => (
        <span key={i} className={`px-1.5 py-0 rounded text-xs font-medium ${chipClass}`}>
          {label}
        </span>
      ))}
    </span>
  );
};

// ─── Module block ────────────────────────────────────────────────────────────

const ModuleBlock = ({ moduleData }) => {
  const { module, gtEntries } = moduleData;
  const [open, setOpen] = useState(true);

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900 w-full text-left flex-wrap"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <ModuleIcon type={module.type} />
        <span>
          Module #{module.order} –{' '}
          <span className={module.type === 'OCR' ? 'text-blue-700' : 'text-orange-700'}>{module.type}</span>
        </span>
        <span className="font-mono text-gray-400 text-xs">(id: {fullId(module.id)})</span>
        <GtChips gtEntries={gtEntries} type={module.type} />
        {module.detection_model_name && (
          <span className="ml-1 text-gray-400 italic text-xs">det: {module.detection_model_name}</span>
        )}
        {module.recognition_model_name && (
          <span className="ml-1 text-gray-400 italic text-xs">rec: {module.recognition_model_name}</span>
        )}
        <span className="ml-auto text-gray-400 font-normal">
          {gtEntries.length} GT {gtEntries.length === 1 ? 'entry' : 'entries'}
        </span>
      </button>

      {open && (
        <div className="mt-1 space-y-0.5">
          {gtEntries.length === 0 ? (
            <p className="text-xs text-gray-400 italic pl-5">No ground-truth entries.</p>
          ) : (
            gtEntries.map((gt, i) => (
              <GtRow key={i} gt={gt} type={module.type} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─── Capture block ───────────────────────────────────────────────────────────

const CaptureBlock = ({ captureData }) => {
  const { capture, modules } = captureData;
  const [open, setOpen] = useState(true);

  return (
    <div className="mt-2 bg-white rounded border border-gray-200 p-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-900 w-full text-left"
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-xs mr-1">#{capture.order}</span>
        <span>Capture</span>
        <span className="ml-1 font-mono text-gray-400 text-xs">(id: {fullId(capture.id)})</span>
        {capture.capture_name && (
          <span className="ml-1 text-gray-500 text-xs">"{capture.capture_name}"</span>
        )}
        <span className="ml-auto text-gray-400 font-normal">
          {modules.length} {modules.length === 1 ? 'module' : 'modules'}
        </span>
      </button>

      {open && (
        <div className="mt-2 pl-3 space-y-2">
          {modules.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No modules for this capture.</p>
          ) : (
            modules.map((md, i) => <ModuleBlock key={md.module.id ?? i} moduleData={md} />)
          )}
        </div>
      )}
    </div>
  );
};

// ─── Part block ──────────────────────────────────────────────────────────────

const PartBlock = ({ partData }) => {
  const { partName, partId, captures } = partData;
  const [open, setOpen] = useState(true);

  const totalModules = captures.reduce((sum, cd) => sum + cd.modules.length, 0);
  const totalGt = captures.reduce(
    (sum, cd) => sum + cd.modules.reduce((s2, md) => s2 + md.gtEntries.length, 0),
    0
  );

  return (
    <div className="mb-4 bg-gray-50 rounded-lg border border-gray-200 p-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left"
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="text-sm font-semibold text-gray-800">📦 {partName}</span>
        <span className="font-mono text-gray-400 text-xs">(id: {fullId(partId)})</span>
        <span className="ml-auto flex gap-3 text-xs text-gray-500">
          <span>{captures.length} capture{captures.length !== 1 ? 's' : ''}</span>
          <span>{totalModules} module{totalModules !== 1 ? 's' : ''}</span>
          <span>{totalGt} GT {totalGt !== 1 ? 'entries' : 'entry'}</span>
        </span>
      </button>

      {open && (
        <div className="mt-2">
          {captures.length === 0 ? (
            <p className="text-xs text-gray-400 italic pl-5">No captures for this part.</p>
          ) : (
            captures.map((cd, i) => (
              <CaptureBlock key={cd.capture.id ?? i} captureData={cd} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main panel ──────────────────────────────────────────────────────────────

const FetchAllPanel = ({ variantId, parts }) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null); // null = not fetched yet
  const [error, setError] = useState('');

  const handleFetchAll = async () => {
    if (!variantId || !parts || parts.length === 0) {
      setError('No parts available for this variant.');
      return;
    }
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const data = await fetchAllForVariant(variantId, parts);
      setResults(data);
    } catch (e) {
      console.error('FetchAll failed', e);
      setError(e.message || 'Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  const totalCaptures = results
    ? results.reduce((s, p) => s + p.captures.length, 0)
    : 0;
  const totalModules = results
    ? results.reduce((s, p) => s + p.captures.reduce((s2, c) => s2 + c.modules.length, 0), 0)
    : 0;
  const totalGt = results
    ? results.reduce(
        (s, p) =>
          s + p.captures.reduce((s2, c) => s2 + c.modules.reduce((s3, m) => s3 + m.gtEntries.length, 0), 0),
        0
      )
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 mb-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Fetch All Ground Truth</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Fetches all captures → modules → GT entries for every part in this variant.
          </p>
        </div>
        <button
          onClick={handleFetchAll}
          disabled={loading || !parts || parts.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          {loading ? 'Fetching…' : 'Fetch All'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2 mb-3">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[...Array(Math.max(parts?.length ?? 1, 1))].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && results && (
        <>
          {/* Summary bar */}
          <div className="flex gap-4 text-xs text-gray-500 mb-4 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
            <span>🗂 <strong>{results.length}</strong> part{results.length !== 1 ? 's' : ''}</span>
            <span>📷 <strong>{totalCaptures}</strong> capture{totalCaptures !== 1 ? 's' : ''}</span>
            <span>🔷 <strong>{totalModules}</strong> module{totalModules !== 1 ? 's' : ''}</span>
            <span>✅ <strong>{totalGt}</strong> GT {totalGt !== 1 ? 'entries' : 'entry'}</span>
          </div>

          {results.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-4">No parts found.</p>
          ) : (
            results.map((pd) => (
              <PartBlock key={pd.partId} partData={pd} />
            ))
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && !results && !error && (
        <p className="text-sm text-gray-400 italic text-center py-6">
          Press <strong>Fetch All</strong> to load the full capture → module → ground-truth tree.
        </p>
      )}
    </div>
  );
};

export default FetchAllPanel;
