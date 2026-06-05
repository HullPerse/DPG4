const VITE_API_URL = "http://26.15.36.191:3000";
const URL = VITE_API_URL ?? "http://127.0.0.1:3000";

export default function AdminApp() {
  return (
    <iframe
      src={`${URL}/admin`}
      className="h-full w-full border-none"
      title="Admin Panel"
    />
  );
}
