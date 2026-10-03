/**
 * حاسبة الفروقات السعرية — وحدة الحسابات الرياضية والتحقق (V0)
 * 
 * تم فصل جميع المعادلات والتحقق من صحة المدخلات في هذه الوحدة
 * لتسهيل الاختبار والاعتمادية دون تشتيت مكونات واجهة المستخدم.
 */

export interface TrackInputs {
  entryPrice: string; // E: سعر الدخول
  tradeAmount: string; // A: مبلغ الصفقة بالـ USDT
  // مسار النسبة
  entryFeePercent?: string; // B: نسبة تكلفة الدخول (%)
  exitFeePercent?: string; // S: نسبة تكلفة الخروج (%)
  // مسار المبلغ
  entryFeeFixed?: string; // Fbuy: مبلغ تكلفة الدخول (USDT)
  exitFeeFixed?: string; // Fsell: مبلغ تكلفة الخروج (USDT)
}

export interface TestPriceResult {
  price: string;
  priceNum: number;
  netPnL: number;
  pnlPercent: number;
  grossExit: number;
  status: 'profit' | 'loss' | 'breakeven';
}

export interface CalculationTrackResult {
  hasTrack: boolean;
  isValid: boolean;
  errorMessage?: string;
  quantity: number;
  breakEvenPrice: number;
  testResults: TestPriceResult[];
}

export interface FullCalculationResult {
  hasValidBaseInputs: boolean;
  baseErrorMessage?: string;
  percentTrack: CalculationTrackResult;
  fixedTrack: CalculationTrackResult;
}

/**
 * تحويل رقم إلى نص عشري صريح بدون صيغة علمية (Scientific Notation e.g. 1.2e-7)
 */
export function toExactDecimalString(num: number, maxSignificantDigits = 12): string {
  if (isNaN(num) || !isFinite(num)) return '0';
  
  // إذا كان الرقم صفر
  if (Math.abs(num) < 1e-18) return '0';

  const str = num.toString();

  // معالجة الصيغة العلمية مثل 1.23456789e-7
  if (str.includes('e') || str.includes('E')) {
    const [base, expStr] = str.toLowerCase().split('e');
    const exp = parseInt(expStr, 10);
    const [intPart, decPart = ''] = base.split('.');
    const combined = intPart + decPart;

    if (exp < 0) {
      const leadingZeros = Math.abs(exp) - intPart.length;
      if (leadingZeros >= 0) {
        return '0.' + '0'.repeat(leadingZeros) + combined.replace('-', '');
      } else {
        const splitIndex = intPart.length + exp;
        return combined.slice(0, splitIndex) + '.' + combined.slice(splitIndex);
      }
    } else {
      const trailingZeros = exp - decPart.length;
      if (trailingZeros >= 0) {
        return combined + '0'.repeat(trailingZeros);
      } else {
        const splitIndex = intPart.length + exp;
        return combined.slice(0, splitIndex) + '.' + combined.slice(splitIndex);
      }
    }
  }

  // إذا كان رقماً عادياً، تحسين الدقة بدون فقدان المنازل الصغيرة
  // نحدد عدد المنازل بحسب القيمة
  if (Math.abs(num) < 1) {
    // رقم صغير جداً: نحدد عدد الأصفار بعد الفاصلة ونعرض المنازل الدقيقة
    const formatted = num.toFixed(Math.min(16, Math.max(8, -Math.floor(Math.log10(Math.abs(num))) + maxSignificantDigits)));
    return trimTrailingZeros(formatted);
  }

  // أرقام عادية أو كبيرة
  const formatted = num.toFixed(Math.min(8, maxSignificantDigits));
  return trimTrailingZeros(formatted);
}

/**
 * إزالة الأصفار الزائدة بعد الفاصلة
 */
export function trimTrailingZeros(valStr: string): string {
  if (!valStr.includes('.')) return valStr;
  let trimmed = valStr.replace(/0+$/, '');
  if (trimmed.endsWith('.')) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed;
}

/**
 * تنسيق سعر العملة للعرض مع الحفاظ على الدقة الكاملة وبدون تقريب جائر
 */
export function formatCurrencyPrice(val: number | string): string {
  if (typeof val === 'string') {
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    val = num;
  }
  return toExactDecimalString(val, 10);
}

/**
 * تنسيق سعر العملة المختصر لبطاقات العرض لتناسب العرض الأفقي بسطرين
 */
export function formatCompactPrice(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '—';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return String(val);
  if (Math.abs(num) < 1e-12) return '0';

  if (Math.abs(num) >= 100) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  if (Math.abs(num) >= 1) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  }
  if (Math.abs(num) >= 0.001) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
  }
  return toExactDecimalString(num, 6);
}

/**
 * تنسيق مبالغ USDT
 */
export function formatUSDT(val: number): string {
  if (Math.abs(val) < 1e-12) return '0.00';
  
  // إذا كان المبلغ صغير جداً (أقل من 0.01) نعرض دقة تصل لـ 6 منازل
  if (Math.abs(val) < 0.01) {
    return toExactDecimalString(val, 6);
  }
  
  // المبالغ العادية تعرض بمنزلتين إلى 4 منازل
  return val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
    useGrouping: true,
  });
}

/**
 * تنسيق النسبة المئوية
 */
export function formatPercent(val: number): string {
  if (Math.abs(val) < 1e-6) return '0.00%';
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${val.toFixed(2)}%`;
}

/**
 * التحقق من المدخلات الأساسية (سعر الدخول ومبلغ الصفقة)
 */
export function validateBaseInputs(entryPriceStr: string, tradeAmountStr: string): {
  isValid: boolean;
  errorMessage?: string;
  entryPrice: number;
  tradeAmount: number;
} {
  const trimmedEntry = entryPriceStr.trim();
  const trimmedAmount = tradeAmountStr.trim();

  if (!trimmedEntry) {
    return { isValid: false, errorMessage: 'يرجى إدخال سعر الدخول', entryPrice: 0, tradeAmount: 0 };
  }

  const entryPrice = parseFloat(trimmedEntry);
  if (isNaN(entryPrice) || entryPrice <= 0) {
    return { isValid: false, errorMessage: 'سعر الدخول يجب أن يكون رقماً أكبر من صفر', entryPrice: 0, tradeAmount: 0 };
  }

  if (!trimmedAmount) {
    return { isValid: false, errorMessage: 'يرجى إدخال مبلغ الصفقة', entryPrice, tradeAmount: 0 };
  }

  const tradeAmount = parseFloat(trimmedAmount);
  if (isNaN(tradeAmount) || tradeAmount <= 0) {
    return { isValid: false, errorMessage: 'مبلغ الصفقة يجب أن يكون أكبر من صفر', entryPrice, tradeAmount: 0 };
  }

  return { isValid: true, entryPrice, tradeAmount };
}

/**
 * حساب مسار النسبة المئوية
 * المعادلات المعتمدة:
 * Quantity = A * (1 - B) / E
 * BreakEven = E / ((1 - B) * (1 - S))
 * GrossExit = Quantity * P
 * ExitCost = GrossExit * S
 * NetExit = GrossExit - ExitCost
 * NetPnL = NetExit - A
 * PnLPercent = NetPnL / A * 100
 */
export function calculatePercentTrack(
  entryPrice: number,
  tradeAmount: number,
  entryFeePercentStr: string | undefined,
  exitFeePercentStr: string | undefined,
  testPrices: string[]
): CalculationTrackResult {
  // فحص هل المستخدم أدخل أي نسبة
  const hasEntry = entryFeePercentStr !== undefined && entryFeePercentStr.trim() !== '';
  const hasExit = exitFeePercentStr !== undefined && exitFeePercentStr.trim() !== '';

  if (!hasEntry && !hasExit) {
    return {
      hasTrack: false,
      isValid: false,
      quantity: 0,
      breakEvenPrice: 0,
      testResults: [],
    };
  }

  const bPercent = hasEntry ? parseFloat(entryFeePercentStr!.trim()) : 0;
  const sPercent = hasExit ? parseFloat(exitFeePercentStr!.trim()) : 0;

  if (isNaN(bPercent) || bPercent < 0) {
    return {
      hasTrack: true,
      isValid: false,
      errorMessage: 'نسبة تكلفة الدخول غير صالحة (يجب ألا تكون سالبة)',
      quantity: 0,
      breakEvenPrice: 0,
      testResults: [],
    };
  }

  if (isNaN(sPercent) || sPercent < 0) {
    return {
      hasTrack: true,
      isValid: false,
      errorMessage: 'نسبة تكلفة الخروج غير صالحة (يجب ألا تكون سالبة)',
      quantity: 0,
      breakEvenPrice: 0,
      testResults: [],
    };
  }

  if (bPercent >= 100) {
    return {
      hasTrack: true,
      isValid: false,
      errorMessage: 'نسبة تكلفة الدخول لا يمكن أن تساوي أو تتجاوز 100%',
      quantity: 0,
      breakEvenPrice: 0,
      testResults: [],
    };
  }

  if (sPercent >= 100) {
    return {
      hasTrack: true,
      isValid: false,
      errorMessage: 'نسبة تكلفة الخروج لا يمكن أن تساوي أو تتجاوز 100%',
      quantity: 0,
      breakEvenPrice: 0,
      testResults: [],
    };
  }

  const B = bPercent / 100;
  const S = sPercent / 100;

  // الحسابات
  const quantity = (tradeAmount * (1 - B)) / entryPrice;
  const breakEvenPrice = entryPrice / ((1 - B) * (1 - S));

  // نتائج أسعار الاختبار
  const testResults: TestPriceResult[] = [];
  for (const pStr of testPrices) {
    const trimmed = pStr.trim();
    if (!trimmed) continue;
    const P = parseFloat(trimmed);
    if (isNaN(P) || P <= 0) continue;

    const grossExit = quantity * P;
    const exitCost = grossExit * S;
    const netExit = grossExit - exitCost;
    const netPnL = netExit - tradeAmount;
    const pnlPercent = (netPnL / tradeAmount) * 100;

    // تحديد الحالة بدقة
    let status: 'profit' | 'loss' | 'breakeven';
    const relativeDiff = Math.abs(P - breakEvenPrice) / breakEvenPrice;
    if (Math.abs(netPnL) < 1e-9 || relativeDiff < 1e-9) {
      status = 'breakeven';
    } else if (netPnL > 0) {
      status = 'profit';
    } else {
      status = 'loss';
    }

    testResults.push({
      price: trimmed,
      priceNum: P,
      netPnL,
      pnlPercent,
      grossExit,
      status,
    });
  }

  return {
    hasTrack: true,
    isValid: true,
    quantity,
    breakEvenPrice,
    testResults,
  };
}

/**
 * حساب مسار المبلغ الثابت
 * المعادلات المعتمدة:
 * Quantity = (A - Fbuy) / E
 * BreakEven = (A + Fsell) / Quantity
 * GrossExit = Quantity * P
 * NetExit = GrossExit - Fsell
 * NetPnL = NetExit - A
 * PnLPercent = NetPnL / A * 100
 */
export function calculateFixedTrack(
  entryPrice: number,
  tradeAmount: number,
  entryFeeFixedStr: string | undefined,
  exitFeeFixedStr: string | undefined,
  testPrices: string[]
): CalculationTrackResult {
  const hasEntry = entryFeeFixedStr !== undefined && entryFeeFixedStr.trim() !== '';
  const hasExit = exitFeeFixedStr !== undefined && exitFeeFixedStr.trim() !== '';

  if (!hasEntry && !hasExit) {
    return {
      hasTrack: false,
      isValid: false,
      quantity: 0,
      breakEvenPrice: 0,
      testResults: [],
    };
  }

  const fBuy = hasEntry ? parseFloat(entryFeeFixedStr!.trim()) : 0;
  const fSell = hasExit ? parseFloat(exitFeeFixedStr!.trim()) : 0;

  if (isNaN(fBuy) || fBuy < 0) {
    return {
      hasTrack: true,
      isValid: false,
      errorMessage: 'مبلغ تكلفة الدخول غير صالح (يجب ألا يكون سالباً)',
      quantity: 0,
      breakEvenPrice: 0,
      testResults: [],
    };
  }

  if (isNaN(fSell) || fSell < 0) {
    return {
      hasTrack: true,
      isValid: false,
      errorMessage: 'مبلغ تكلفة الخروج غير صالح (يجب ألا يكون سالباً)',
      quantity: 0,
      breakEvenPrice: 0,
      testResults: [],
    };
  }

  if (fBuy >= tradeAmount) {
    return {
      hasTrack: true,
      isValid: false,
      errorMessage: 'مبلغ تكلفة الدخول الثابتة أكبر من أو يساوي مبلغ الصفقة',
      quantity: 0,
      breakEvenPrice: 0,
      testResults: [],
    };
  }

  const quantity = (tradeAmount - fBuy) / entryPrice;
  const breakEvenPrice = (tradeAmount + fSell) / quantity;

  const testResults: TestPriceResult[] = [];
  for (const pStr of testPrices) {
    const trimmed = pStr.trim();
    if (!trimmed) continue;
    const P = parseFloat(trimmed);
    if (isNaN(P) || P <= 0) continue;

    const grossExit = quantity * P;
    const netExit = grossExit - fSell;
    const netPnL = netExit - tradeAmount;
    const pnlPercent = (netPnL / tradeAmount) * 100;

    let status: 'profit' | 'loss' | 'breakeven';
    const relativeDiff = Math.abs(P - breakEvenPrice) / breakEvenPrice;
    if (Math.abs(netPnL) < 1e-9 || relativeDiff < 1e-9) {
      status = 'breakeven';
    } else if (netPnL > 0) {
      status = 'profit';
    } else {
      status = 'loss';
    }

    testResults.push({
      price: trimmed,
      priceNum: P,
      netPnL,
      pnlPercent,
      grossExit,
      status,
    });
  }

  return {
    hasTrack: true,
    isValid: true,
    quantity,
    breakEvenPrice,
    testResults,
  };
}

/**
 * حساب كامل يجمع المسارين بناءً على المدخلات
 */
export function calculateAll(
  inputs: TrackInputs,
  testPrices: string[]
): FullCalculationResult {
  const baseValidation = validateBaseInputs(inputs.entryPrice, inputs.tradeAmount);

  if (!baseValidation.isValid) {
    return {
      hasValidBaseInputs: false,
      baseErrorMessage: baseValidation.errorMessage,
      percentTrack: {
        hasTrack: false,
        isValid: false,
        quantity: 0,
        breakEvenPrice: 0,
        testResults: [],
      },
      fixedTrack: {
        hasTrack: false,
        isValid: false,
        quantity: 0,
        breakEvenPrice: 0,
        testResults: [],
      },
    };
  }

  const percentTrack = calculatePercentTrack(
    baseValidation.entryPrice,
    baseValidation.tradeAmount,
    inputs.entryFeePercent,
    inputs.exitFeePercent,
    testPrices
  );

  const fixedTrack = calculateFixedTrack(
    baseValidation.entryPrice,
    baseValidation.tradeAmount,
    inputs.entryFeeFixed,
    inputs.exitFeeFixed,
    testPrices
  );

  return {
    hasValidBaseInputs: true,
    percentTrack,
    fixedTrack,
  };
}
