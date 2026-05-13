export default function AuthError({ message }) {
  if (!message) return null;
  return (
    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
      {message}
    </div>
  );
}
