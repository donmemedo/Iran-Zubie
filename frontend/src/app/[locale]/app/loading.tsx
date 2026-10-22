import { Skeleton } from "@/components/ui/skeleton";

/** Shown by Next while a dashboard route streams in, so navigation never flashes blank. */
export default function Loading() {
  return (
    <div className="space-y-4 p-4 sm:p-6" role="status" aria-busy="true">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-[124px]" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
