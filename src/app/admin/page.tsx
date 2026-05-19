"use client";

import { useEffect, useState, useCallback } from "react";

type PaymentStatus = "unpaid" | "paid" | "in_kind";

interface SponsorshipItem {
  id: string;
  category: string;
  portion: number | null;
  totalPortions: number | null;
  amount: number;
  claimedBy: string | null;
  claimedAt: string | null;
  paymentStatus: PaymentStatus;
}

const STATUS_CYCLE: PaymentStatus[] = ["unpaid", "paid", "in_kind"];

const STATUS_STYLES: Record<PaymentStatus, string> = {
  unpaid: "bg-stone-200 text-stone-600 hover:bg-stone-300",
  paid: "bg-green-200 text-green-800 hover:bg-green-300",
  in_kind: "bg-blue-200 text-blue-800 hover:bg-blue-300",
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  in_kind: "In Kind",
};

export default function AdminPage() {
  const [items, setItems] = useState<SponsorshipItem[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/sponsorships");
    setItems(await res.json());
  }, []);

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 5000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  const handleUnclaim = async (id: string) => {
    setRemoving(id);
    await fetch("/api/sponsorships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "unclaim" }),
    });
    await fetchItems();
    setRemoving(null);
  };

  const handleCycleStatus = async (id: string, current: PaymentStatus) => {
    setToggling(id);
    const nextIndex = (STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length;
    const next = STATUS_CYCLE[nextIndex];
    await fetch("/api/sponsorships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "setPaymentStatus", paymentStatus: next }),
    });
    await fetchItems();
    setToggling(null);
  };

  const claimed = items.filter((i) => i.claimedBy);
  const unclaimed = items.filter((i) => !i.claimedBy);

  // In-kind items are excluded from both goal and raised totals
  const inKindItems = items.filter((i) => i.paymentStatus === "in_kind");
  const inKindTotal = inKindItems.reduce((sum, i) => sum + i.amount, 0);

  const cashItems = items.filter((i) => i.paymentStatus !== "in_kind");
  const totalGoal = cashItems.reduce((sum, i) => sum + i.amount, 0);
  const totalPledged = cashItems
    .filter((i) => i.claimedBy)
    .reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = cashItems
    .filter((i) => i.paymentStatus === "paid")
    .reduce((sum, i) => sum + i.amount, 0);

  const sponsorTotals = new Map<string, { pledged: number; paid: number; inKind: number }>();
  for (const item of claimed) {
    const current = sponsorTotals.get(item.claimedBy!) || { pledged: 0, paid: 0, inKind: 0 };
    if (item.paymentStatus === "in_kind") {
      current.inKind += item.amount;
    } else {
      current.pledged += item.amount;
      if (item.paymentStatus === "paid") current.paid += item.amount;
    }
    sponsorTotals.set(item.claimedBy!, current);
  }

  return (
    <main className="flex-1 p-4 max-w-5xl mx-auto w-full">
      <div className="pt-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-yellow-800">
              &#127820; Admin Dashboard
            </h1>
            <p className="text-yellow-700 text-sm mt-1">
              Banana Clan Reunion — Sponsorship Tracker
            </p>
          </div>
          <a
            href="/"
            className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 text-sm font-medium"
          >
            &larr; Back to Sign-Up
          </a>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-green-700">
            ${totalPaid.toLocaleString()}
          </p>
          <p className="text-xs text-stone-500 mt-1">Paid</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">
            ${totalPledged.toLocaleString()}
          </p>
          <p className="text-xs text-stone-500 mt-1">Pledged</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-stone-500">
            ${(totalGoal - totalPledged).toLocaleString()}
          </p>
          <p className="text-xs text-stone-500 mt-1">Remaining</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            ${inKindTotal.toLocaleString()}
          </p>
          <p className="text-xs text-stone-500 mt-1">In Kind</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-stone-800">{claimed.length}</p>
          <p className="text-xs text-stone-500 mt-1">Items Claimed</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-stone-800">
            {sponsorTotals.size}
          </p>
          <p className="text-xs text-stone-500 mt-1">Sponsors</p>
        </div>
      </div>

      {/* Sponsor Summary */}
      {sponsorTotals.size > 0 && (
        <div className="bg-white rounded-xl shadow p-5 mb-8">
          <h2 className="font-bold text-stone-800 mb-3">
            Sponsors Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {Array.from(sponsorTotals.entries())
              .sort((a, b) => (b[1].pledged + b[1].inKind) - (a[1].pledged + a[1].inKind))
              .map(([name, totals]) => (
                <div
                  key={name}
                  className="flex justify-between items-center bg-green-50 rounded-lg px-4 py-2"
                >
                  <span className="font-medium text-stone-800">{name}</span>
                  <div className="text-right">
                    {totals.pledged > 0 && (
                      <span className="text-green-700 font-semibold">
                        ${totals.pledged.toLocaleString()}
                      </span>
                    )}
                    {totals.paid > 0 && (
                      <p className="text-xs text-green-600">
                        ${totals.paid.toLocaleString()} paid
                      </p>
                    )}
                    {totals.inKind > 0 && (
                      <p className="text-xs text-blue-600">
                        ${totals.inKind.toLocaleString()} in kind
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Claimed Items Table */}
      <div className="bg-white rounded-xl shadow p-5 mb-8">
        <h2 className="font-bold text-stone-800 mb-3">
          Claimed Items ({claimed.length})
        </h2>
        {claimed.length === 0 ? (
          <p className="text-stone-400 text-center py-4">
            No items claimed yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500">
                  <th className="pb-2 pr-4">Item</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Sponsor</th>
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4 text-center">Status</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {claimed.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-b border-stone-100 ${
                      item.paymentStatus === "paid"
                        ? "bg-green-50"
                        : item.paymentStatus === "in_kind"
                        ? "bg-blue-50"
                        : ""
                    }`}
                  >
                    <td className="py-2.5 pr-4 text-stone-800">
                      {item.category}
                      {item.portion
                        ? ` (${item.portion}/${item.totalPortions})`
                        : ""}
                    </td>
                    <td className="py-2.5 pr-4 text-stone-600">
                      ${item.amount}
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-stone-800">
                      {item.claimedBy}
                    </td>
                    <td className="py-2.5 pr-4 text-stone-500 text-xs">
                      {item.claimedAt
                        ? new Date(item.claimedAt).toLocaleDateString()
                        : ""}
                    </td>
                    <td className="py-2.5 pr-4 text-center">
                      <button
                        onClick={() => handleCycleStatus(item.id, item.paymentStatus)}
                        disabled={toggling === item.id}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${
                          STATUS_STYLES[item.paymentStatus]
                        }`}
                      >
                        {STATUS_LABELS[item.paymentStatus]}
                      </button>
                    </td>
                    <td className="py-2.5">
                      <button
                        onClick={() => handleUnclaim(item.id)}
                        disabled={removing === item.id}
                        className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unclaimed Items */}
      <div className="bg-white rounded-xl shadow p-5 mb-8">
        <h2 className="font-bold text-stone-800 mb-3">
          Unclaimed Items ({unclaimed.length})
        </h2>
        {unclaimed.length === 0 ? (
          <p className="text-green-600 text-center py-4 font-medium">
            All items have been sponsored!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500">
                  <th className="pb-2 pr-4">Item</th>
                  <th className="pb-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {unclaimed.map((item) => (
                  <tr key={item.id} className="border-b border-stone-100">
                    <td className="py-2 pr-4 text-stone-800">
                      {item.category}
                      {item.portion
                        ? ` (${item.portion}/${item.totalPortions})`
                        : ""}
                    </td>
                    <td className="py-2 text-stone-600">${item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
