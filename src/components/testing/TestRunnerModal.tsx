import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FlaskConical,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { TestCaseResult } from '../../scoring/scoringEngine.ts';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TEST_LABELS: Record<string, string> = {
  T01_WEIGHT_SUM: 'KPI weights',
  T02_DIV_ZERO: 'Zero denominator',
  T03_MISSING_COUNT: 'Missing count',
  T04_EXPLICIT_ZERO_COUNT: 'Zero count',
  T05_SCORE_CAPPING: 'Score cap',
  T06_BINARY_SCORING: 'Yes / No scoring',
  T07_NEGATIVE_VALIDATION: 'Negative values',
  T08_PROVISIONAL_CALC: 'Provisional score',
  T09_PERFECT_SCORECARD: 'Perfect score',
  T10_REALISTIC_SCORING: 'Mixed results',
};

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [testSuiteResult, setTestSuiteResult] = useState<{
    allPassed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    results: TestCaseResult[];
  } | null>(null);

  const runAllTests = async () => {
    setLoading(true);
    try {
      const res = await api.runTests();
      setTestSuiteResult(res);
    } catch (err: any) {
      alert(`Test run failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runAllTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="glass-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="scoring-tests-title" className="glass-dialog relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <h2 id="scoring-tests-title" className="text-base font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <span>Scoring Tests</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runAllTests}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Run Again</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close tests"
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Aggregate Status Banner */}
        {testSuiteResult && !loading && (
          <div className="glass-soft px-5 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {testSuiteResult.allPassed ? (
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-red-500" />
              )}
              <div>
                <div className="font-medium text-sm text-slate-900 dark:text-white">
                  {testSuiteResult.allPassed ? 'All tests passed' : 'Tests failed'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {testSuiteResult.passedTests}/{testSuiteResult.totalTests} passed
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Test Items List */}
        <div className="overflow-y-auto px-5 py-4 space-y-2.5 flex-1">
          {loading && (
            <div className="py-12 text-center text-xs text-slate-500 space-y-2">
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto" />
              <div>Running tests...</div>
            </div>
          )}

          {testSuiteResult &&
            !loading &&
            testSuiteResult.results.map((test) => {
              return (
                <div
                  key={test.id}
                  className="glass-tile p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 text-xs flex items-start justify-between gap-3 shadow-xs"
                >
                  <div className="min-w-0 flex-1 space-y-1 break-words">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {TEST_LABELS[test.id] || test.name}
                      </span>
                    </div>

                    <details open={!test.passed} className="text-slate-600 dark:text-slate-400 space-y-0.5 text-[11px]">
                      <summary className="cursor-pointer">Results</summary>
                      <p className="pt-1">{test.name}</p>
                      <p className="font-mono">{test.id} · {test.category}</p>
                      <div>
                        <span className="text-slate-500">Expected: </span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{test.expected}</span>
                      </div>
                      {test.details && <p className="pt-1">{test.details}</p>}
                      <div>
                        <span className="text-slate-500">Actual: </span>
                        <span className="font-mono text-slate-900 dark:text-slate-100 font-semibold">
                          {test.actual}
                        </span>
                      </div>
                    </details>
                  </div>

                  <div className="shrink-0 pt-0.5">
                    {test.passed ? (
                      <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>PASS</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500 font-semibold">
                        <XCircle className="w-4 h-4" />
                        <span>FAIL</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div className="glass-soft px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-slate-500 text-xs flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
