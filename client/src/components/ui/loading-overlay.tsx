import { Loader2 } from "lucide-react";

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 flex items-center gap-3">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
        <p className="text-slate-900">Carregando...</p>
      </div>
    </div>
  );
}
