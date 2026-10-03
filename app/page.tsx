'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  calculateAll, 
  TrackInputs, 
  FullCalculationResult 
} from '@/lib/calculator';
import { 
  CurrencyItem, 
  MAX_CURRENCIES, 
  MAX_TEST_PRICES,
  STORAGE_KEY_CURRENCIES, 
  STORAGE_KEY_DEFAULTS 
} from '@/types/currency';
import { CurrencyDashboard } from '@/components/CurrencyDashboard';
import { FloatingContainer } from '@/components/FloatingContainer';
import { TradeDataSection } from '@/components/TradeDataSection';
import { BreakEvenSection } from '@/components/BreakEvenSection';
import { TestPricesSection } from '@/components/TestPricesSection';
import { ProfitLossChart } from '@/components/ProfitLossChart';
import { LiveMonitoringSection } from '@/components/LiveMonitoringSection';
import { SettingsModal, DefaultFeeSettings } from '@/components/SettingsModal';
import { WorkspaceBackground } from '@/components/WorkspaceBackground';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { WindowMode } from '@/components/WindowHeader';

export default function CalculatorPage() {
  // Window State for Calculator
  const [windowMode, setWindowMode] = useState<WindowMode>('normal');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Default fee settings from localStorage
  const [defaultFees, setDefaultFees] = useState<DefaultFeeSettings>({
    entryFeePercent: '',
    exitFeePercent: '',
    entryFeeFixed: '',
    exitFeeFixed: '',
  });

  // Currencies list (max 10)
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  // Currently active currency ID (null = showing Currency Dashboard)
  const [activeCurrencyId, setActiveCurrencyId] = useState<string | null>(null);

  // Load saved default fees and currencies asynchronously after hydration completes
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        // Load default fees
        const savedDefaults = localStorage.getItem(STORAGE_KEY_DEFAULTS);
        if (savedDefaults) {
          setDefaultFees(JSON.parse(savedDefaults));
        }

        // Load currencies
        const savedCurrencies = localStorage.getItem(STORAGE_KEY_CURRENCIES);
        if (savedCurrencies) {
          const parsed: CurrencyItem[] = JSON.parse(savedCurrencies);
          if (Array.isArray(parsed)) {
            setCurrencies(parsed.slice(0, MAX_CURRENCIES));
          }
        }
      } catch {
        // Ignore storage errors in restricted contexts
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Helper to persist currencies
  const persistCurrencies = useCallback((items: CurrencyItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_CURRENCIES, JSON.stringify(items));
    } catch {
      // Ignore
    }
  }, []);

  // Add currency (max 10)
  const handleAddCurrency = (name: string) => {
    if (currencies.length >= MAX_CURRENCIES) return;

    const newCurrency: CurrencyItem = {
      id: `curr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim().toUpperCase(),
      createdAt: Date.now(),
      entryPrice: '',
      tradeAmount: '',
      entryFeePercent: defaultFees.entryFeePercent || '',
      exitFeePercent: defaultFees.exitFeePercent || '',
      entryFeeFixed: defaultFees.entryFeeFixed || '',
      exitFeeFixed: defaultFees.exitFeeFixed || '',
      testPrices: [''],
    };

    const updated = [...currencies, newCurrency];
    setCurrencies(updated);
    persistCurrencies(updated);
    // Directly open the newly added currency calculator
    setActiveCurrencyId(newCurrency.id);
  };

  // Delete currency
  const handleDeleteCurrency = (id: string) => {
    const updated = currencies.filter((c) => c.id !== id);
    setCurrencies(updated);
    persistCurrencies(updated);
    if (activeCurrencyId === id) {
      setActiveCurrencyId(null);
    }
  };

  // Active currency object
  const activeCurrency = useMemo(() => {
    if (!activeCurrencyId) return null;
    return currencies.find((c) => c.id === activeCurrencyId) || null;
  }, [currencies, activeCurrencyId]);

  // Update fields of the currently active currency
  const updateActiveCurrency = useCallback((fields: Partial<CurrencyItem>) => {
    if (!activeCurrencyId) return;

    setCurrencies((prev) => {
      const next = prev.map((c) => {
        if (c.id === activeCurrencyId) {
          return { ...c, ...fields };
        }
        return c;
      });
      persistCurrencies(next);
      return next;
    });
  }, [activeCurrencyId, persistCurrencies]);

  // Reset inputs for the active currency only
  const handleResetActiveCurrency = () => {
    if (!activeCurrencyId) return;
    updateActiveCurrency({
      entryPrice: '',
      tradeAmount: '',
      entryFeePercent: defaultFees.entryFeePercent || '',
      exitFeePercent: defaultFees.exitFeePercent || '',
      entryFeeFixed: defaultFees.entryFeeFixed || '',
      exitFeeFixed: defaultFees.exitFeeFixed || '',
      testPrices: [''],
    });
  };

  // Test prices handlers for active currency (max 10)
  const handleAddTestPrice = () => {
    if (!activeCurrency) return;
    if (activeCurrency.testPrices.length < MAX_TEST_PRICES) {
      updateActiveCurrency({
        testPrices: [...activeCurrency.testPrices, ''],
      });
    }
  };

  const handleRemoveTestPrice = (index: number) => {
    if (!activeCurrency) return;
    if (activeCurrency.testPrices.length > 1) {
      const updated = activeCurrency.testPrices.filter((_, i) => i !== index);
      updateActiveCurrency({ testPrices: updated });
    } else {
      updateActiveCurrency({ testPrices: [''] });
    }
  };

  const handleChangeTestPrice = (index: number, val: string) => {
    if (!activeCurrency) return;
    const updated = [...activeCurrency.testPrices];
    updated[index] = val;
    updateActiveCurrency({ testPrices: updated });
  };

  const handleApplyLivePriceAsEntry = (priceStr: string) => {
    updateActiveCurrency({ entryPrice: priceStr });
  };

  const handleAddLivePriceAsTest = (priceStr: string) => {
    if (!activeCurrency) return;
    const currentList = [...activeCurrency.testPrices];
    const emptyIndex = currentList.findIndex((p) => !p.trim());
    if (emptyIndex !== -1) {
      currentList[emptyIndex] = priceStr;
      updateActiveCurrency({ testPrices: currentList });
    } else if (currentList.length < MAX_TEST_PRICES) {
      updateActiveCurrency({ testPrices: [...currentList, priceStr] });
    }
  };

  // Calculation results for active currency
  const calculationResult: FullCalculationResult = useMemo(() => {
    if (!activeCurrency) {
      return {
        hasValidBaseInputs: false,
        percentTrack: { hasTrack: false, isValid: false, quantity: 0, breakEvenPrice: 0, testResults: [] },
        fixedTrack: { hasTrack: false, isValid: false, quantity: 0, breakEvenPrice: 0, testResults: [] },
      };
    }

    const inputs: TrackInputs = {
      entryPrice: activeCurrency.entryPrice,
      tradeAmount: activeCurrency.tradeAmount,
      entryFeePercent: activeCurrency.entryFeePercent,
      exitFeePercent: activeCurrency.exitFeePercent,
      entryFeeFixed: activeCurrency.entryFeeFixed,
      exitFeeFixed: activeCurrency.exitFeeFixed,
    };
    return calculateAll(inputs, activeCurrency.testPrices);
  }, [activeCurrency]);

  // Save or clear default fees
  const handleSaveDefaults = (newDefaults: DefaultFeeSettings) => {
    setDefaultFees(newDefaults);
    try {
      localStorage.setItem(STORAGE_KEY_DEFAULTS, JSON.stringify(newDefaults));
    } catch {
      // Ignore
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
      // Ignore
    }
  };

  const hasDefaultsSaved = Boolean(
    defaultFees.entryFeePercent ||
    defaultFees.exitFeePercent ||
    defaultFees.entryFeeFixed ||
    defaultFees.exitFeeFixed
  );

  return (
    <main className="relative min-h-screen w-full flex flex-col justify-start items-center p-3 sm:p-6 overflow-x-hidden transition-colors">
      {/* Background Ambience and Guide */}
      <WorkspaceBackground 
        mode={activeCurrencyId ? windowMode : 'normal'}
        onSetMode={setWindowMode}
      />

      {/* Offline Status Toast */}
      <OfflineIndicator />

      {/* MAIN VIEW: Currency Dashboard OR Active Currency Calculator */}
      <div className="relative z-10 w-full flex justify-center py-2">
        {!activeCurrencyId || !activeCurrency ? (
          /* View 1: Currency Dashboard (لوحة العملات) */
          <CurrencyDashboard
            currencies={currencies}
            onSelectCurrency={(id) => setActiveCurrencyId(id)}
            onAddCurrency={handleAddCurrency}
            onDeleteCurrency={handleDeleteCurrency}
            onOpenSettings={() => setIsSettingsOpen(true)}
            hasDefaultsSaved={hasDefaultsSaved}
          />
        ) : (
          /* View 2: Full Calculator for the Active Currency (حاسبة العملة المحددة) */
          <FloatingContainer
            mode={windowMode}
            onSetMode={setWindowMode}
            onReset={handleResetActiveCurrency}
            onToggleSettings={() => setIsSettingsOpen(true)}
            hasDefaultsSaved={hasDefaultsSaved}
            currencyName={activeCurrency.name}
            onBackToDashboard={() => setActiveCurrencyId(null)}
            percentTrack={calculationResult.percentTrack}
            fixedTrack={calculationResult.fixedTrack}
          >
            {/* Section 0: Live Monitoring & Alerts from Binance (وضع المراقبة اللحظية والتنبيهات) */}
            <LiveMonitoringSection
              currencyName={activeCurrency.name}
              isActive={Boolean(activeCurrency.isMonitoringActive)}
              onToggleActive={(active) => updateActiveCurrency({ isMonitoringActive: active })}
              targetPrice={activeCurrency.targetPrice || ''}
              onChangeTargetPrice={(price) => updateActiveCurrency({ targetPrice: price })}
              targetDirection={activeCurrency.targetDirection || 'above'}
              onChangeTargetDirection={(dir) => updateActiveCurrency({ targetDirection: dir })}
              onApplyPriceAsEntry={handleApplyLivePriceAsEntry}
              onAddPriceAsTest={handleAddLivePriceAsTest}
              breakEvenPrice={
                calculationResult.percentTrack.hasTrack && calculationResult.percentTrack.isValid
                  ? calculationResult.percentTrack.breakEvenPrice
                  : calculationResult.fixedTrack.hasTrack && calculationResult.fixedTrack.isValid
                  ? calculationResult.fixedTrack.breakEvenPrice
                  : undefined
              }
            />

            {/* Section 1: Trade Data (بيانات الصفقة) */}
            <TradeDataSection

              entryPrice={activeCurrency.entryPrice}
              onChangeEntryPrice={(val) => updateActiveCurrency({ entryPrice: val })}
              tradeAmount={activeCurrency.tradeAmount}
              onChangeTradeAmount={(val) => updateActiveCurrency({ tradeAmount: val })}
              entryFeePercent={activeCurrency.entryFeePercent}
              onChangeEntryFeePercent={(val) => updateActiveCurrency({ entryFeePercent: val })}
              exitFeePercent={activeCurrency.exitFeePercent}
              onChangeExitFeePercent={(val) => updateActiveCurrency({ exitFeePercent: val })}
              entryFeeFixed={activeCurrency.entryFeeFixed}
              onChangeEntryFeeFixed={(val) => updateActiveCurrency({ entryFeeFixed: val })}
              exitFeeFixed={activeCurrency.exitFeeFixed}
              onChangeExitFeeFixed={(val) => updateActiveCurrency({ exitFeeFixed: val })}
              errorMessage={
                !calculationResult.hasValidBaseInputs && (activeCurrency.entryPrice || activeCurrency.tradeAmount)
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
              testPrices={activeCurrency.testPrices}
              onChangeTestPrice={handleChangeTestPrice}
              onAddTestPrice={handleAddTestPrice}
              onRemoveTestPrice={handleRemoveTestPrice}
              percentTrack={calculationResult.percentTrack}
              fixedTrack={calculationResult.fixedTrack}
            />

            {/* Section 4: Interactive Profit/Loss Chart (الرسم البياني التفاعلي للأرباح والخسائر) */}
            <ProfitLossChart
              entryPrice={activeCurrency.entryPrice}
              hasValidBase={calculationResult.hasValidBaseInputs}
              percentTrack={calculationResult.percentTrack}
              fixedTrack={calculationResult.fixedTrack}
              currencyName={activeCurrency.name}
            />
          </FloatingContainer>

        )}
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
