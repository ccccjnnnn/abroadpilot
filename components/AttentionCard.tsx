type AttentionCardProps = {
  title: string;
  due: string;
};

export default function AttentionCard({
  title,
  due,
}: AttentionCardProps) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">Needs attention</p>

      <h2 className="mt-2 text-lg font-semibold">
        {title}
      </h2>

      <p className="mt-1 text-sm text-red-500">
        Due {due}
      </p>
    </div>
  );
}