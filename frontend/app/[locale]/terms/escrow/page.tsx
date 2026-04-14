import { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import EnTerms from './components/EnTerms';
import ViTerms from './components/ViTerms';
import { ShieldAlert, FileText, Lock, RefreshCcw, DollarSign } from 'lucide-react';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale });
  return {
    title: locale === 'vi' ? 'Chính Sách Ký Quỹ & Thanh Toán Giải Đấu' : 'Tournament Escrow & Payment Policy',
    description: locale === 'vi' ? 'Điều khoản và điều kiện đối với nền tảng ký quỹ, trách nhiệm nộp tiền và thanh toán giải đấu.' : 'Terms and conditions regarding our secure tournament escrow system, funding requirements, and payouts.'
  };
}

export default function EscrowTermsPage({ params: { locale } }: { params: { locale: string } }) {
  
  return (
    <div className="relative min-h-screen selection:bg-primary/20">
      {/* Background aesthetic enhancements */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-orange-500 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }}></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 flex flex-col lg:flex-row gap-12">
        
        {/* Sidebar Navigation */}
        <div className="lg:w-1/4 hidden lg:block">
          <div className="sticky top-32 space-y-8">
            <div>
              <h3 className="font-semibold text-lg mb-4 text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {locale === 'vi' ? 'Nội Dung Chính' : 'Contents'}
              </h3>
              <nav className="flex flex-col gap-3">
                <a href="#introduction" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">{locale === 'vi' ? '1. Giới thiệu' : '1. Introduction'}</a>
                <a href="#escrow-vs-community" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">{locale === 'vi' ? '2. Ký Quỹ & Cộng Đồng' : '2. Escrow vs. Community'}</a>
                <a href="#organizer-funding" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">{locale === 'vi' ? '3. Yêu Cầu Cấp Vốn' : '3. Organizer Funding'}</a>
                <a href="#disputes" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">{locale === 'vi' ? '4. Hủy Bỏ & Tranh Chấp' : '4. Cancellations & Disputes'}</a>
                <a href="#payouts" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">{locale === 'vi' ? '5. Thanh Toán Tiền Thưởng' : '5. Payouts & Settlement'}</a>
              </nav>
            </div>
            
            <div className="rounded-xl border border-border bg-card/60 backdrop-blur-md p-6 shadow-sm">
              <h4 className="flex justify-center items-center font-bold text-lg mb-4 text-foreground">
                <ShieldAlert className="w-5 h-5 text-emerald-500 mr-2" />
                {locale === 'vi' ? 'Chứng nhận An Toàn' : 'Guaranteed Safe'}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed text-center">
                {locale === 'vi' ? 'Tiền của người chơi được giám sát minh bạch, kết nối qua các đối tác thanh toán chuẩn quốc tế để bảo vệ mọi quyền lợi giải thưởng.' : 'Player funds are transparently monitored and routed through international payment partners to protect competition integrity.'}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:w-3/4 max-w-4xl">
          <div className="mb-16">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              {locale === 'vi' ? 'Chính Sách Ký Quỹ Giải Đấu' : 'Tournament Escrow Policy'}
            </h1>
            <p className="text-xl text-muted-foreground">
              {locale === 'vi' ? 'Quy định chi tiết về quản lý tài chính, cấp vốn giải đấu và thanh toán phần thưởng.' : 'Detailed regulations on financial management, tournament funding, and prize payouts.'}
            </p>
          </div>
          
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            {locale === 'vi' ? <ViTerms /> : <EnTerms />}
          </div>
        </div>
      </div>
    </div>
  )
}
