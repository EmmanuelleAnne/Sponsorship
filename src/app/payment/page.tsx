export default function PaymentPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">&#127820;</div>
        <h1 className="text-2xl font-bold text-yellow-800 mb-3">
          Banana Clan Reunion
        </h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
          <p className="text-yellow-800 text-lg font-semibold mb-2">
            Payment option coming later this week.
          </p>
          <p className="text-yellow-700 text-sm">
            Thank you for signing up to sponsor! We&apos;ll update this page
            with payment instructions shortly.
          </p>
        </div>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl transition-colors"
        >
          &larr; Back to Sponsorships
        </a>
      </div>
    </main>
  );
}
