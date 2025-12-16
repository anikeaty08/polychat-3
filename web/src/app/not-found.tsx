export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-[#020617] to-black px-4 py-6">
      <div className="w-full max-w-md rounded-[32px] border border-zinc-800/80 bg-zinc-950/90 p-8 shadow-[0_0_80px_rgba(139,92,246,0.25)] backdrop-blur-xl text-center">
        <h1 className="text-4xl font-bold text-zinc-100 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-zinc-300 mb-4">Page Not Found</h2>
        <p className="text-sm text-zinc-400 mb-6">
          The page you're looking for doesn't exist.
        </p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}
