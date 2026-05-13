import { ArrowRight } from 'lucide-react';

export default function AuthSubmitButton({ loading, loadingText, children }) {
  return (
    <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
      {loading ? loadingText : children}
      {!loading && <ArrowRight size={18} />}
    </button>
  );
}
