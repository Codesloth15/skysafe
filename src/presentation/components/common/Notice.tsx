import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
export default function Notice({
  children,
  tone = 'warning',
}: {
  children: ReactNode;
  tone?: 'warning' | 'error' | 'info';
}) {
  return (
    <div
      className={'notice ' + tone}
      role={tone === 'error' ? 'alert' : 'note'}
    >
      <AlertTriangle size={17} />
      <div>{children}</div>
    </div>
  );
}
