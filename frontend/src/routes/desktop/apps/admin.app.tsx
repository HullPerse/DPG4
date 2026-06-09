import { VITE_API_URL } from "@/api/client.api";

export default function AdminApp() {
  return (
    <iframe
      src={`${VITE_API_URL}/admin`}
      className="h-full w-full border-none"
      title="Admin Panel"
    />
  );
}
