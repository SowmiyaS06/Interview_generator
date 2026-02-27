const TranscriptViewer = ({
  transcript,
}: {
  transcript?: Array<{ role: string; content: string }>;
}) => {
  if (!transcript || transcript.length === 0) {
    return <p className="text-light-100">No transcript available yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {transcript.map((entry, index) => (
        <div
          key={`${entry.role}-${index}`}
          className={
            entry.role === "assistant"
              ? "bg-dark-200/70 border border-dark-300 rounded-lg p-3"
              : "bg-dark-100 border border-dark-300 rounded-lg p-3"
          }
        >
          <p className="text-xs uppercase tracking-wide text-primary-200">
            {entry.role}
          </p>
          <p className="text-light-100 mt-1">{entry.content}</p>
        </div>
      ))}
    </div>
  );
};

export default TranscriptViewer;
