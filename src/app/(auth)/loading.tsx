import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted">
      <div className="flex items-center gap-3">
        <Spinner />
        <span>Loading...</span>
      </div>
    </div>
  );
}
