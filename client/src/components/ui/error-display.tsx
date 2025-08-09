import { AlertCircle } from "lucide-react";

interface ErrorDisplayProps {
  error: any;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-center space-x-2">
      <AlertCircle className="w-5 h-5" />
      <div>
        <p className="font-semibold">An error occurred</p>
        <p className="text-sm">{error.message || "Something went wrong"}</p>
      </div>
    </div>
  );
}
