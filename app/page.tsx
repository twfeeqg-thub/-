'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  calculateAll, 
  TrackInputs, 
  FullCalculationResult 
} from '@/lib/calculator';
import { FloatingContainer } from '@/components/FloatingContainer';
import { TradeDataSection } from '@/components/TradeDataSection';
import { BreakEvenSection } from '@/components/BreakEvenSection';
import { TestPricesSection } from '@/components/TestPricesSection';
import { SettingsModal, DefaultFeeSettings } from '@/components/SettingsModal';
import { WorkspaceBackground } from '@/components/WorkspaceBackground';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { WindowMode } from '@/components/WindowHeader';

const STORAGE_KEY_DEFAULTS = 'price_calc_v0_defaults';

export default function CalculatorPage() {
  // Window State
  const [windowMode, setWindowMode] = useState<WindowMode>('normal');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Default fee settings from localStorage (initialized with blanks for consistent SSR hydration)
  const [defaultFees, setDefaultFees] = useState<DefaultFeeSettings>({
    entryFeePercent: '',
    exitFeePercent: '',
    entryFeeFixed: '',
    exitFeeFixed: '',
  });

  // Base Trade Inputs (always start empty each session)
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [tradeAmount, setTradeAmount] = useState<string>('');

  // Cost Inputs
  const [entryFeePercent, setEntryFeePercent] = useState<string>('');
  const [exitFeePercent, setExitFeePercent] = useState<string>('');
  const [entryFeeFixed, setEntryFeeFixed] = useState<string>('');
  const [exitFeeFixed, setExitFeeFixed] = useState<string>('');

  // Test Prices: Starts with exactly 1 empty field ("سعر الاختبار 1"), max 5
  const [testPrices, setTestPrices] = useState<string[]>(['']);

  // Load saved default fees asynchronously after hydration completes
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_DEFAULTS);
        if (saved) {
          const parsed: DefaultFeeSettings = JSON.parse(saved);
          setDefaultFees(parsed);
          if (parsed.entryFeePercent) setEntryFeePercent(parsed.entryFeePercent);
          if (parsed.exitFeePercent) setExitFeePercent(parsed.exitFeePercent);
          if (parsed.entryFeeFixed) setEntryFeeFixed(parsed.entryFeeFixed);
          if (parsed.exitFeeFixed) setExitFeeFixed(parsed.exitFeeFixed);
        }
      } catch {
        // Ignore
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);



  // Save or clear default fees
  const handleSaveDefaults = (newDefaults: DefaultFeeSettings) => {
    setDefaultFees(newDefaults);
    try {
      localStorage.setItem(STORAGE_KEY_DEFAULTS, JSON.stringify(newDefaults));
    } catch {
      // Ignore storage error
    }
  };

  const handleClearDefaults = () => {
    setDefaultFees({
      entryFeePercent: '',
      exitFeePercent: '',
      entryFeeFixed: '',
      exitFeeFixed: '',
    });
    try {
      localStorage.removeItem(STORAGE_KEY_DEFAULTS);
    } catch {
      // Ignore storage error
    }
  };

  // Reset inputs
  const handleReset = () => {
    setEntryPrice('');
    setTradeAmount('');
    setTestPrices(['']);
    // Reset costs to saved defaults or blank
    setEntryFeePercent(defaultFees.entryFeePercent || '');
    setExitFeePercent(defaultFees.exitFeePercent || '');
    setEntryFeeFixed(defaultFees.entryFeeFixed || '');
    setExitFeeFixed(defaultFees.exitFeeFixed || '');
  };

  // Test prices handlers (max 5)
  const handleAddTestPrice = () => {
    if (testPrices.length < 5) {
      setTestPrices([...testPrices, '']);
    }
  };

  const handleRemoveTestPrice = (index: number) => {
    if (testPrices.length > 1) {
      const updated = testPrices.filter((_, i) => i !== index);
      setTestPrices(updated);
    } else {
      // If only 1, clear its value
      setTestPrices(['']);
    }
  };

  const handleChangeTestPrice = (index: number, val: string) => {
    const updated = [...testPrices];
    updated[index] = val;
    setTestPrices(updated);
  };

  // Perform calculations
  const calculationResult: FullCalculationResult = useMemo(() => {
    const inputs: TrackInputs = {
      entryPrice,
      tradeAmount,
      entryFeePercent,
      exitFeePercent,
      entryFeeFixed,
      exitFeeFixed,
    };
    return calculateAll(inputs, testPrices);
  }, [
    entryPrice,
    tradeAmount,
    entryFeePercent,
    exitFeePercent,
    entryFeeFixed,
    exitFeeFixed,
    testPrices,
  ]);

  const hasDefaultsSaved = Boolean(
    defaultFees.entryFeePercent ||
    defaultFees.exitFeePercent ||
    defaultFees.entryFeeFixed ||
    defaultFees.exitFeeFixed
  );

  return (
    <main className="relative min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-start sm:justify-center items-center p-3 sm:p-6 overflow-x-hidden">
      {/* Background Ambience and Guide */}
      <WorkspaceBackground 
        mode={windowMode}
        onSetMode={setWindowMode}
      />

      {/* Offline Status Toast */}
      <OfflineIndicator />

      {/* Floating or Centered Calculator Container */}
      <div className="relative z-10 w-full flex justify-center py-2">
        <FloatingContainer
          mode={windowMode}
          onSetMode={setWindowMode}
          onReset={handleReset}
          onToggleSettings={() => setIsSettingsOpen(true)}
          hasDefaultsSaved={hasDefaultsSaved}
          percentTrack={calculationResult.percentTrack}
          fixedTrack={calculationResult.fixedTrack}
        >
          {/* Section 1: Trade Data (بيانات الصفقة) */}
          <TradeDataSection
            entryPrice={entryPrice}
            onChangeEntryPrice={setEntryPrice}
            tradeAmount={tradeAmount}
            onChangeTradeAmount={setTradeAmount}
            entryFeePercent={entryFeePercent}
            onChangeEntryFeePercent={setEntryFeePercent}
            exitFeePercent={exitFeePercent}
            onChangeExitFeePercent={setExitFeePercent}
            entryFeeFixed={entryFeeFixed}
            onChangeEntryFeeFixed={setEntryFeeFixed}
            exitFeeFixed={exitFeeFixed}
            onChangeExitFeeFixed={setExitFeeFixed}
            errorMessage={
              !calculationResult.hasValidBaseInputs && (entryPrice || tradeAmount)
                ? calculationResult.baseErrorMessage
                : undefined
            }
          />

          {/* Section 2: Break-Even Price (سعر التعادل) */}
          <BreakEvenSection
            hasValidBase={calculationResult.hasValidBaseInputs}
            percentTrack={calculationResult.percentTrack}
            fixedTrack={calculationResult.fixedTrack}
          />

          {/* Section 3: Test Prices & Linked Results (أسعار الاختبار ونتائجها) */}
          <TestPricesSection
            testPrices={testPrices}
            onChangeTestPrice={handleChangeTestPrice}
            onAddTestPrice={handleAddTestPrice}
            onRemoveTestPrice={handleRemoveTestPrice}
            percentTrack={calculationResult.percentTrack}
            fixedTrack={calculationResult.fixedTrack}
          />
        </FloatingContainer>
      </div>

      {/* Settings Modal for default fees */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSettings={defaultFees}
        onSaveDefaults={handleSaveDefaults}
        onClearDefaults={handleClearDefaults}
      />
    </main>
  );
}
