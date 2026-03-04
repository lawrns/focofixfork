import { DELEGATION_STATUS_COLORS } from './constants';

export function DelegationBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${DELEGATION_STATUS_COLORS[status] ?? DELEGATION_STATUS_COLORS.none}`}>
      {status ?? 'none'}
    </span>
  );
}
