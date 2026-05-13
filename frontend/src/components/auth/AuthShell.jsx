export default function AuthShell({ children, showFooter = false }) {
  return (
    <div className="min-h-screen px-5 py-6 lg:px-10 lg:py-8 flex items-center justify-center">
      <div className="w-full max-w-md">{children}</div>

      {showFooter && (
        <div className="fixed bottom-4 left-0 right-0 text-center pointer-events-none">
          <p className="micro-ui text-[color:var(--app-text-soft)]">LMS Portal Platform (c) 2026</p>
        </div>
      )}
    </div>
  );
}
