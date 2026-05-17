"use client";

import { useEffect, useState, useCallback } from "react";

interface SponsorshipItem {
  id: string;
  category: string;
  portion: number | null;
  totalPortions: number | null;
  amount: number;
  claimedBy: string | null;
  claimedAt: string | null;
  paid: boolean;
}

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

  const handleTogglePaid = async (id: string, currentlyPaid: boolean) => {
    setToggling(id);
    await fetch("/api/sponsorships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "markPaid", paid: !currentlyPaid }),
    });
    await fetchItems();
    setToggling(null);
  };

  const claimed = items.filter((i) => i.claimedBy);
  const unclaimed = items.filter((i) => !i.claimedBy);
  const totalRaised = claimed.reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = claimed.filter((i) => i.paid).reduce((sum, i) => sum + i.amount, 0);
  const totalGoal = items.reduce((sum, i) => sum + i.amount, 0);

  const sponsorTotals = new Map<string, { pledged: number; paid: number }>();
  for (const item of claimed) {
    const current = sponsorTotals.get(item.claimedBy!) || { pledged: 0, paid: 0 };
    current.pledged += item.amount;
    if (item.paid) current.paid += item.amount;
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
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-green-700">
            ${totalPaid.toLocaleString()}
          </p>
          <p className="text-xs text-stone-500 mt-1">Paid</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">
            ${totalRaised.toLocaleString()}
          </p>
          <p className="text-xs text-stone-500 mt-1">Pledged</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-stone-500">
            ${(totalGoal - totalRaised).toLocaleString()}
          </p>
          <p className="text-xs text-stone-500 mt-1">Remaining</p>
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
              .sort((a, b) => b[1].pledged - a[1].pledged)
              .map(([name, totals]) => (
                <div
                  key={name}
                  className="flex justify-between items-center bg-green-50 rounded-lg px-4 py-2"
                >
                  <span className="font-medium text-stone-800">{name}</span>
                  <div className="text-right">
                    <span className="text-green-700 font-semibold">
                      ${totals.pledged.toLocaleString()}
                    </span>
                    {totals.paid > 0 && (
                      <p className="text-xs text-green-600">
                        ${totals.paid.toLocaleString()} paid
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
                  <th className="pb-2 pr-4 text-center">Paid</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {claimed.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-b border-stone-100 ${
                      item.paid ? "bg-green-50" : ""
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
                        onClick={() => handleTogglePaid(item.id, item.paid)}
                        disabled={toggling === item.id}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${
                          item.paid
                            ? "bg-green-200 text-green-800 hover:bg-green-300"
                            : "bg-stone-200 text-stone-600 hover:bg-stone-300"
                        }`}
                      >
                        {item.paid ? "Paid" : "Unpaid"}
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
