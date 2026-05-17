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
}

interface GroupedCategory {
  category: string;
  totalAmount: number;
  items: SponsorshipItem[];
}

function groupByCategory(items: SponsorshipItem[]): GroupedCategory[] {
  const map = new Map<string, SponsorshipItem[]>();
  for (const item of items) {
    const list = map.get(item.category) || [];
    list.push(item);
    map.set(item.category, list);
  }
  return Array.from(map.entries()).map(([category, items]) => ({
    category,
    totalAmount: items.reduce((sum, i) => sum + i.amount, 0),
    items,
  }));
}

export default function Home() {
  const [items, setItems] = useState<SponsorshipItem[]>([]);
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/sponsorships");
    setItems(await res.json());
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("banana-clan-name");
    if (stored) setSavedName(stored);
    fetchItems();
    const interval = setInterval(fetchItems, 5000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  const handleSetName = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem("banana-clan-name", trimmed);
    setSavedName(trimmed);
  };

  const handleClaim = async (id: string) => {
    if (!savedName) return;
    setClaiming(id);
    setError(null);
    const res = await fetch("/api/sponsorships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: savedName }),
    });
    const data = await res.json();
    if (!data.success) setError(data.error);
    await fetchItems();
    setClaiming(null);
  };

  const handleUnclaim = async (id: string) => {
    setClaiming(id);
    setError(null);
    const res = await fetch("/api/sponsorships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "unclaim" }),
    });
    await res.json();
    await fetchItems();
    setClaiming(null);
  };

  const handleChangeName = () => {
    localStorage.removeItem("banana-clan-name");
    setSavedName(null);
    setName("");
  };

  const groups = groupByCategory(items);
  const totalRaised = items
    .filter((i) => i.claimedBy)
    .reduce((sum, i) => sum + i.amount, 0);
  const totalGoal = items.reduce((sum, i) => sum + i.amount, 0);
  const progressPct = totalGoal > 0 ? (totalRaised / totalGoal) * 100 : 0;

  if (!savedName) {
    return (
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">&#127820;</div>
          <h1 className="text-3xl font-bold text-yellow-800 mb-2">
            Banana Clan Reunion
          </h1>
          <p className="text-yellow-700 mb-6">
            Welcome! Enter your name to get started sponsoring items for the
            reunion.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetName()}
              placeholder="Your full name"
              className="flex-1 px-4 py-3 border-2 border-yellow-300 rounded-xl focus:outline-none focus:border-yellow-500 text-lg"
            />
            <button
              onClick={handleSetName}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl transition-colors"
            >
              Go
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="text-center mb-8 pt-6">
        <div className="text-5xl mb-2">&#127820;</div>
        <h1 className="text-3xl font-bold text-yellow-800">
          Banana Clan Reunion
        </h1>
        <p className="text-yellow-700 mt-1">Sponsorship Sign-Up</p>
        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-yellow-700">
          <span>
            Signed in as <strong>{savedName}</strong>
          </span>
          <button
            onClick={handleChangeName}
            className="text-yellow-600 underline hover:text-yellow-800"
          >
            change
          </button>
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-yellow-100 border border-yellow-300 rounded-xl p-4 mb-6 text-center">
        <p className="text-yellow-800 text-sm font-medium">
          Feel free to sponsor as many items as you&apos;d like! Every
          contribution helps make our reunion amazing.
        </p>
      </div>

      {/* Your Sponsorships Panel */}
      {items.filter((i) => i.claimedBy === savedName).length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-8">
          <h2 className="font-bold text-green-800 mb-3">
            Your Sponsorships
          </h2>
          <div className="space-y-1.5 mb-4">
            {items
              .filter((i) => i.claimedBy === savedName)
              .map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-green-800">
                    {item.category}
                    {item.portion
                      ? ` (portion ${item.portion}/${item.totalPortions})`
                      : ""}
                  </span>
                  <span className="font-semibold text-green-700">
                    ${item.amount}
                  </span>
                </div>
              ))}
          </div>
          <div className="flex justify-between items-center border-t border-green-200 pt-3 mb-4">
            <span className="font-bold text-green-900">Your Total</span>
            <span className="text-xl font-bold text-green-800">
              $
              {items
                .filter((i) => i.claimedBy === savedName)
                .reduce((sum, i) => sum + i.amount, 0)
                .toLocaleString()}
            </span>
          </div>
          <a
            href="https://pay.collctiv.com/2026-banana-reunion-fund-38504"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors text-lg"
          >
            Make Payment &rarr;
          </a>
          <p className="text-xs text-green-600 text-center mt-2">
            You&apos;ll be taken to our secure Collctiv payment page
          </p>
        </div>
      )}

      {/* Progress Bar */}
      <div className="bg-white rounded-xl shadow p-4 mb-8">
        <div className="flex justify-between text-sm font-medium text-yellow-800 mb-2">
          <span>
            ${totalRaised.toLocaleString()} raised
          </span>
          <span>
            ${totalGoal.toLocaleString()} goal
          </span>
        </div>
        <div className="w-full bg-yellow-100 rounded-full h-4 overflow-hidden">
          <div
            className="bg-yellow-500 h-4 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
        </div>
        <p className="text-center text-xs text-yellow-600 mt-2">
          {items.filter((i) => i.claimedBy).length} of {items.length} items
          sponsored
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-center text-sm">
          {error}
        </div>
      )}

      {/* Categories */}
      <div className="space-y-6">
        {groups.map((group) => {
          const claimedCount = group.items.filter((i) => i.claimedBy).length;
          const claimedAmount = group.items
            .filter((i) => i.claimedBy)
            .reduce((s, i) => s + i.amount, 0);

          return (
            <div
              key={group.category}
              className="bg-white rounded-xl shadow overflow-hidden"
            >
              <div className="px-5 py-4 bg-yellow-50 border-b border-yellow-100">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-yellow-900">
                    {group.category}
                  </h2>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-yellow-700">
                      ${group.totalAmount.toLocaleString()} total
                    </span>
                    {group.items.length > 1 && (
                      <p className="text-xs text-yellow-600">
                        {claimedCount} of {group.items.length} portions claimed
                        (${claimedAmount.toLocaleString()})
                      </p>
                    )}
                  </div>
                </div>
                {group.items.length > 1 && (
                  <div className="mt-2 w-full bg-yellow-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${(claimedCount / group.items.length) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="divide-y divide-yellow-50">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className={`px-5 py-3 flex items-center justify-between ${
                      item.claimedBy ? "bg-green-50" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-stone-800">
                          ${item.amount}
                        </span>
                        {item.portion && (
                          <span className="text-xs text-stone-500">
                            (portion {item.portion} of {item.totalPortions})
                          </span>
                        )}
                      </div>
                      {item.claimedBy && (
                        <p className="text-sm text-green-700 mt-0.5">
                          &#10003; Sponsored by{" "}
                          <strong>{item.claimedBy}</strong>
                        </p>
                      )}
                    </div>

                    <div className="ml-3 shrink-0">
                      {item.claimedBy ? (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-green-100 text-green-800 text-sm font-medium">
                          Claimed
                        </span>
                      ) : (
                        <button
                          onClick={() => handleClaim(item.id)}
                          disabled={claiming === item.id}
                          className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          {claiming === item.id ? "..." : "Sponsor"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin toggle */}
      <div className="mt-12 mb-8 text-center">
        <button
          onClick={() => setShowAdmin(!showAdmin)}
          className="text-xs text-stone-400 hover:text-stone-600"
        >
          {showAdmin ? "Hide" : "Show"} Admin View
        </button>
        {showAdmin && (
          <div className="mt-4 bg-white rounded-xl shadow p-5">
            <h3 className="font-bold text-stone-800 mb-3">
              All Claimed Items
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500">
                    <th className="pb-2 pr-4">Item</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2 pr-4">Sponsor</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items
                    .filter((i) => i.claimedBy)
                    .map((item) => (
                      <tr key={item.id} className="border-b border-stone-100">
                        <td className="py-2 pr-4 text-stone-800">
                          {item.category}
                          {item.portion
                            ? ` (${item.portion}/${item.totalPortions})`
                            : ""}
                        </td>
                        <td className="py-2 pr-4 text-stone-600">
                          ${item.amount}
                        </td>
                        <td className="py-2 pr-4 font-medium text-stone-800">
                          {item.claimedBy}
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => handleUnclaim(item.id)}
                            disabled={claiming === item.id}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  {items.filter((i) => i.claimedBy).length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-4 text-center text-stone-400"
                      >
                        No items claimed yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
