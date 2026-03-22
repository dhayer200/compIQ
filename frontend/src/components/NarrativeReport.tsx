export default function NarrativeReport({ text }: { text: string }) {
  const paragraphs = text.split('\n\n').filter(Boolean)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-sm font-medium text-gray-500 mb-4">Analysis Report</h2>
      <div className="prose prose-sm max-w-none text-gray-700 space-y-3">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  )
}
