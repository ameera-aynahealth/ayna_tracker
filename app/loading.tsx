export default function Loading() {
  return (
    <div className="min-h-screen bg-page flex">
      <aside className="hidden md:block w-60 border-r border-border bg-surface p-4">
        <div className="skeleton w-20 h-7 rounded-lg mb-8" />
        <div className="space-y-2">
          {Array.from({ length: 9 }, (_, index) => <div key={index} className="skeleton h-9 rounded-xl" />)}
        </div>
      </aside>
      <main className="flex-1 p-5 sm:p-8">
        <div className="max-w-[1500px] mx-auto">
          <div className="flex items-center justify-between mb-8"><div className="skeleton w-64 h-10 rounded-xl" /><div className="skeleton w-28 h-10 rounded-xl" /></div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">{Array.from({ length: 4 }, (_, index) => <div key={index} className="skeleton h-28 rounded-2xl" />)}</div>
          <div className="grid xl:grid-cols-2 gap-4">{Array.from({ length: 2 }, (_, index) => <div key={index} className="border border-border bg-surface p-5 rounded-2xl"><div className="skeleton w-40 h-6 rounded-lg mb-5" /><div className="space-y-3">{Array.from({ length: 5 }, (_, row) => <div key={row} className="skeleton h-12 rounded-xl" />)}</div></div>)}</div>
        </div>
      </main>
    </div>
  );
}
