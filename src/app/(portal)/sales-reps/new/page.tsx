'use client';

/**
 * Creates a field representative with the same wizard as User Management.
 *
 * A representative is a user account, so this is that flow with the role fixed to
 * Sales Representative — the only role the Sales Reps board lists.
 */

import { useQueryClient } from '@tanstack/react-query';
import { CreateUserWizard } from '@/features/users';
import { SALES_REP_ROLE, salesRepKeys } from '@/features/sales-reps';

export default function CreateSalesRepPage() {
  const client = useQueryClient();

  return (
    <CreateUserWizard
      backHref="/sales-reps"
      lockedRole={SALES_REP_ROLE}
      title="Create New Sales Rep"
      subtitle="A portal account that can sign in to the mobile app and be given a route."
      successMessage="Sales rep created successfully."
      onCreated={() => client.invalidateQueries({ queryKey: salesRepKeys.all })}
    />
  );
}
