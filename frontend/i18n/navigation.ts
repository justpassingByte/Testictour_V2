import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';
 
// Tạo navigation với bảo tồn pathname khi chuyển ngôn ngữ
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing); 