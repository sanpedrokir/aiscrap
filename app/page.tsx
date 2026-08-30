import Scraper from "./Scraper";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black min-h-screen">
      <main className="flex w-full max-w-2xl flex-col gap-8 py-16 px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            AI Scraper
          </h1>
        </div>

        <Scraper />
      </main>
    </div>
  );
}
