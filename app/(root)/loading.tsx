export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-96">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-primary-200 border-t-transparent rounded-full animate-spin" />
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
