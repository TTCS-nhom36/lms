import { Layers3 } from 'lucide-react';

export default function AuthCard({ kicker, title, children, centered = false }) {
  return (
    <section className={`card px-5 py-5 lg:px-6 lg:py-6 animate-slide-up${centered ? ' flex flex-col justify-center' : ''}`}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="section-kicker mb-2">{kicker}</div>
          <h2 className="card-title">{title}</h2>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent)] flex items-center justify-center">
          <Layers3 size={18} />
        </div>
      </div>

      {children}
    </section>
  );
}
