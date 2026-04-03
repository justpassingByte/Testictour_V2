"use client"
import { Globe } from "lucide-react"
import { usePathname } from 'next/navigation';
import { useRouter } from '../i18n/navigation';
import { routing } from '../i18n/routing';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type Locale = (typeof routing.locales)[number];

const languages = [
  { code: "en", name: "English" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "ko", name: "한국어" },
  { code: "zh", name: "中文" },
]

export function LanguageToggle() {
  const currentLocale = useLocale();
  const pathname = usePathname();
  
  console.log("[LanguageToggle] Current locale from useLocale:", currentLocale);
  console.log("[LanguageToggle] Current pathname:", pathname);
  
  // Capture errors in case useTranslations fails
  let changeLanguageText = "Change Language";
  try {
  const t = useTranslations('common');
    changeLanguageText = t('change_language');
    console.log("[LanguageToggle] Translated text:", changeLanguageText);
  } catch (error) {
    console.error("[LanguageToggle] Failed to load translation:", error);
  }

  const handleChange = (newLocale: Locale) => {
    console.log(`Changing language from ${currentLocale} to ${newLocale}`);
    
    // Đơn giản hóa cách tạo URL mới
    let path = window.location.pathname;

    // Xác định địa chỉ gốc (không bao gồm locale)
    let basePath = '/';
    const pathSegments = path.split('/').filter(Boolean);
    
    if (pathSegments.length > 0) {
      // Kiểm tra xem segment đầu tiên có phải là locale không
      if (routing.locales.includes(pathSegments[0] as Locale)) {
        // Nếu có, loại bỏ segment đầu tiên để lấy phần còn lại của path
        const remainingPath = pathSegments.slice(1).join('/');
        basePath = remainingPath ? `/${remainingPath}` : '/';
      } else {
        // Nếu không, giữ nguyên path
        basePath = path;
      }
    }
    
    // Tạo URL mới với locale mới và thêm query string để tránh cache
    const timestamp = new Date().getTime(); 
    const newUrl = `/${newLocale}${basePath === '/' ? '' : basePath}?_=${timestamp}`;
    console.log(`New URL: ${newUrl}`);
    
    // Chuyển hướng với hard reload
    window.location.href = newUrl;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="focus-visible:ring-0">
                <Globe className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">{changeLanguageText}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => handleChange(lang.code as Locale)}
                  className={currentLocale === lang.code ? "bg-muted" : ""}
                >
                  {lang.name} {currentLocale === lang.code ? '✓' : ''}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipTrigger>
        <TooltipContent>
          <p>{changeLanguageText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
