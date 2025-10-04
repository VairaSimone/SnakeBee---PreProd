import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";

export default function FeedingSuggestions() {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const { data } = await api.get("/inventory/feeding-suggestions");
        setSuggestions(data.suggestions || []);
        setMessage(data.message || null);
      } catch (err) {
        console.error("Error fetching feeding suggestions:", err);
        setMessage(t("inventoryPage.error_loading"));
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [t]);

  const formatWeight = (w) => (w ? `${w}g` : "—");

  if (loading) return <p className="text-center text-slate-500">{t("loading")}...</p>;

  if (message && suggestions.length === 0)
    return <p className="text-center text-slate-600">{message}</p>;

  return (
    <div className="p-6 bg-white rounded-2xl shadow-md border border-slate-100">
      <h2 className="text-xl font-semibold text-slate-800 mb-4">
        {t("inventoryPage.feedingSuggestions")}
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="p-3 text-left">{t("inventoryPage.reptile")}</th>
              <th className="p-3 text-left">{t("inventoryPage.foodType")}</th>
              <th className="p-3 text-right">{t("inventoryPage.idealSize")}</th>
              <th className="p-3 text-right">{t("inventoryPage.suggestedSize")}</th>
              <th className="p-3 text-center">{t("inventoryPage.available")}</th>
              <th className="p-3 text-center">{t("inventoryPage.status")}</th>
            </tr>
          </thead>

          <tbody>
            {suggestions.map((s, idx) => {
              const isClosestMatch = s.warning === "closest_match";
              const isNotEnough = s.warning === "not_enough_stock";
              const isMissing = s.warning === "food_not_found";

              return (
                <tr
                  key={idx}
                  className={`border-b last:border-0 transition-colors ${
                    isClosestMatch
                      ? "bg-yellow-50 hover:bg-yellow-100/70"
                      : isNotEnough
                      ? "bg-orange-50 hover:bg-orange-100/60"
                      : isMissing
                      ? "bg-rose-50 hover:bg-rose-100/60"
                      : "hover:bg-emerald-50/40"
                  }`}
                >
                  <td className="p-3 font-medium text-slate-800">{s.reptileName || "—"}</td>
                  <td className="p-3 text-slate-700">{s.foodType}</td>
                  <td className="p-3 text-right text-slate-700 font-mono">
                    {formatWeight(s.idealWeight)}
                  </td>
                  <td className="p-3 text-right text-slate-700 font-mono">
                    {s.suggestedWeight
                      ? formatWeight(s.suggestedWeight)
                      : formatWeight(s.idealWeight)}
                    {s.suggestedWeight && s.suggestedWeight !== s.idealWeight && (
                      <span className="ml-2 text-xs text-slate-500">
                        ({t("inventoryPage.closest")})
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center text-slate-700">{s.available ?? "—"}</td>
                  <td className="p-3 text-center">
                    {isClosestMatch ? (
                      <div className="flex items-center justify-center text-yellow-700 gap-1">
                        <Info size={16} />
                        <span>{t("inventoryPage.closest_match")}</span>
                      </div>
                    ) : isNotEnough ? (
                      <div className="flex items-center justify-center text-orange-700 gap-1">
                        <AlertTriangle size={16} />
                        <span>{t("inventoryPage.not_enough_stock")}</span>
                      </div>
                    ) : isMissing ? (
                      <div className="flex items-center justify-center text-rose-700 gap-1">
                        <AlertTriangle size={16} />
                        <span>{t("inventoryPage.food_not_found")}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center text-emerald-700 gap-1">
                        <CheckCircle size={16} />
                        <span>{t("inventoryPage.ok")}</span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {suggestions.some((s) => s.note) && (
        <div className="mt-4 space-y-1">
          {suggestions.map(
            (s, i) =>
              s.note && (
                <p key={i} className="text-xs text-slate-600 italic">
                  {s.reptileName ? `${s.reptileName}: ` : ""}
                  {s.note}
                </p>
              )
          )}
        </div>
      )}
    </div>
  );
}
