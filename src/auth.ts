export type UserRole = 'admin' | 'staff' | 'viewer';

export interface UserSession {
  username: string;
  name: string;
  role: UserRole;
}

interface DemoAccount extends UserSession {
  password: string;
  description: string;
}

const demoAccounts: DemoAccount[] = [
  {
    username: 'admin',
    password: 'admin123',
    name: 'Quản trị vựa',
    role: 'admin',
    description: 'Toàn quyền nhập, sửa, xử lý cảnh báo và cấu hình vận hành.',
  },
  {
    username: 'kho',
    password: 'kho123',
    name: 'Nhân viên kho',
    role: 'staff',
    description: 'Được nhập nghiệp vụ mua hàng, chế biến, xuất hàng và thanh toán.',
  },
  {
    username: 'viewer',
    password: 'viewer123',
    name: 'Chủ vựa xem báo cáo',
    role: 'viewer',
    description: 'Chỉ xem dashboard, báo cáo và hỏi trợ lý AI.',
  },
];

export function getDemoAccounts() {
  return demoAccounts.map(({ password: _password, ...account }) => account);
}

export function loginWithDemoAccount(username: string, password: string): UserSession | null {
  const normalizedUsername = username.trim().toLowerCase();
  const account = demoAccounts.find(
    item => item.username === normalizedUsername && item.password === password
  );

  if (!account) return null;

  return {
    username: account.username,
    name: account.name,
    role: account.role,
  };
}

export function canMutateData(session: Pick<UserSession, 'role'> | null) {
  return session?.role === 'admin' || session?.role === 'staff';
}

export function sanitizeSession(value: unknown): UserSession | null {
  if (!value || typeof value !== 'object') return null;

  const session = value as Partial<UserSession>;
  const roleIsValid = session.role === 'admin' || session.role === 'staff' || session.role === 'viewer';

  if (!session.username || !session.name || !roleIsValid) return null;

  return {
    username: session.username,
    name: session.name,
    role: session.role,
  };
}
