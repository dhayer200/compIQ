export default function NarrativeReport({ text }: { text: string }) {
  const paragraphs = text.split('\n\n').filter(Boolean)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 print:border-0 print:shadow-none">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Analysis Report</h2>
      <div className="prose prose-sm max-w-none text-gray-700 space-y-3 leading-relaxed">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  )
}
