import { Spinner } from "@/components/ui/spinner";

export const metadata = {
  title: "Loading",
};

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted">
      <div className="flex items-center gap-3">
        <Spinner size="lg" />
        <span>Loading...</span>
      </div>
    </div>
  );
}
