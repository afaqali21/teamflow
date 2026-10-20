export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="max-w-lg space-y-3 text-center">
        <p className="text-sm font-medium text-muted-foreground">Teamflow</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Workspace setup is ready
        </h1>
        <p className="text-muted-foreground">
          The app shell, database schema, and local seed are in place. Sign-in
          is the next slice.
        </p>
      </div>
    </main>
  );
}
