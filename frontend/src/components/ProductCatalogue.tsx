import React, { useState, useEffect } from 'react';
import { Search, Filter, ArrowRight, Calculator, FileCheck, Check, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchProducts } from '../services/api.ts';
import type { LoanProduct, Language, BusinessCategory } from '../types/index.ts';

interface ProductCatalogueProps {
  onAskAboutProduct: (productName: string, query?: string) => void;
  onCalculateEMIForProduct: (product: LoanProduct) => void;
  language: Language;
  selectedBusinessCategory: BusinessCategory | null;
}

export const ProductCatalogue: React.FC<ProductCatalogueProps> = ({
  onAskAboutProduct,
  onCalculateEMIForProduct,
  language,
  selectedBusinessCategory
}) => {
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load loan products');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', 'Kirana & Retail', 'Micro Enterprises (PMMY)', 'Textiles, Manufacturing & Repair', 'Services, Retail & Wholesale', 'Greenfield Enterprise'];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.targetBusiness.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === 'All' || p.category.toLowerCase().includes(categoryFilter.toLowerCase().split(' ')[0]);

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 tracking-tight">
            {language === 'hi' ? 'सिंथेटिक लोन उत्पाद कैटलॉग' : 'Synthetic Loan Products Catalogue'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'hi'
              ? 'भारतीय एमएसएमई और खुदरा दुकानदारों के लिए सांकेतिक ब्याज दरें व नियम (Fictional demonstration)'
              : 'Indicative parameters loaded dynamically from backend API for Indian MSMEs'}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by shop type, machine, scheme..."
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900 shadow-2xs"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              categoryFilter === cat
                ? 'bg-slate-900 text-white font-semibold shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 animate-pulse">
              <div className="h-5 bg-slate-200 rounded-md w-3/4" />
              <div className="h-4 bg-slate-100 rounded-md w-1/2" />
              <div className="h-16 bg-slate-50 rounded-lg" />
              <div className="h-9 bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <div className="text-sm font-semibold text-rose-900">Failed to load loan catalogue</div>
          <p className="text-xs text-rose-700">{error}</p>
          <button
            onClick={loadProducts}
            className="px-4 py-2 bg-rose-700 text-white rounded-lg text-xs font-medium hover:bg-rose-800 transition-colors inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Loading</span>
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredProducts.length === 0 && (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 space-y-2">
          <p className="text-sm font-semibold text-slate-800">No matching loan products found</p>
          <p className="text-xs text-slate-500">Try adjusting your search terms or filter selection.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('All');
            }}
            className="text-xs font-semibold text-emerald-700 hover:underline mt-2 inline-block"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => {
          return (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all hover:shadow-sm"
            >
              <div>
                {/* Header line with Scheme Code & Badge */}
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                  <span>{product.schemeCode}</span>
                  {product.badge && (
                    <span className="text-emerald-700 font-medium font-sans bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                      {product.badge}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-display text-base font-bold text-slate-900 leading-snug">
                  {product.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{product.category}</p>

                {/* Rates & Quantum KPI Strip */}
                <div className="grid grid-cols-2 gap-2 my-3.5 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Interest Rate</span>
                    <span className="font-mono text-emerald-800 font-bold text-sm tabular-nums">
                      {product.interestRateMin}% – {product.interestRateMax}%
                    </span>
                    <span className="text-[10px] text-slate-400 block">per annum</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Loan Quantum</span>
                    <span className="font-mono text-slate-900 font-bold text-sm tabular-nums">
                      ₹{(product.minAmount / 100000).toFixed(1)}L – ₹{(product.maxAmount / 100000).toFixed(0)}L
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Tenure: {product.minTenureMonths}–{product.maxTenureMonths} mo
                    </span>
                  </div>
                </div>

                {/* Summary */}
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {product.summary}
                </p>

                {/* Collateral & Fees */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-start gap-1.5">
                    <span className="font-medium text-slate-800 shrink-0">Security:</span>
                    <span className="text-slate-600 line-clamp-1">{product.collateralRequirement}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-medium text-slate-800 shrink-0">Fee:</span>
                    <span className="text-slate-600 line-clamp-1">{product.processingFeeNotes}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => onCalculateEMIForProduct(product)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Calculator className="w-3.5 h-3.5 text-slate-500" />
                  <span>Calc EMI</span>
                </button>

                <button
                  onClick={() => onAskAboutProduct(product.name, `Tell me more about eligibility and documents for ${product.name}`)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ask AI</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Synthetic Catalog Disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-800">Compliance Notice:</strong> All products, interest rate ranges, processing fees, and collateral rules are synthetic demonstration data for PrimeCapital AI testing. They are not official State Bank of India products or lending approvals.
        </p>
      </div>
    </div>
  );
};
