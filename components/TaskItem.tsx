type TaskItemProps = {
  title: string;
};

export default function TaskItem({
  title,
}: TaskItemProps) {
  return (
    <label className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
      <input
        type="checkbox"
        className="h-5 w-5"
      />

      <span>
        {title}
      </span>
    </label>
  );
}