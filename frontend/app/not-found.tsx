import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 text-white">
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-slate-400 mb-6">Could not find requested resource</p>
      <Link href="/" className="px-4 py-2 bg-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors">
        Return Home
      </Link>
    </div>
  );
}

