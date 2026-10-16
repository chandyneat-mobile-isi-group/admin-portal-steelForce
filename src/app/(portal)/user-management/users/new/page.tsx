'use client';

import { CreateUserWizard } from '@/features/users';

export default function CreateUserPage() {
  return <CreateUserWizard backHref="/user-management/users" />;
}
