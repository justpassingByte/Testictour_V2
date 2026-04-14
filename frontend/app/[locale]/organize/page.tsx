import { Metadata } from 'next';
import { Target, Users, Zap, TrendingUp, Handshake, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  return {
    title: locale === 'vi' ? 'Partner Program | TesTicTour' : 'Partner Program | TesTicTour',
    description: locale === 'vi' ? 'Cơ hội trở thành đối tác tổ chức giải đấu, tạo thu nhập và phát triển cộng đồng.' : 'Become a tournament organizing partner, earn revenue, and grow your community.'
  };
}

export default function PartnerProgramPage({ params: { locale } }: { params: { locale: string } }) {
  return (
    <div className="relative selection:bg-primary/20">
      {/* Background aesthetic enhancements */}
      <div className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-orange-400 to-[#D4B263] opacity-25 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }}></div>
      </div>
      
      {/* Hero Section */}
      <div className="relative border-b border-white/10 bg-black/40 backdrop-blur-md pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 text-foreground">
            {locale === 'vi' ? 'Trở Thành ' : 'Become a '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#D4B263]">
              {locale === 'vi' ? 'Đối Tác (Partner)' : 'Partner'}
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10">
            {locale === 'vi' 
              ? 'Nền tảng giúp bạn tự động hóa việc tổ chức giải TFT, tạo ra dòng tiền từ cộng đồng và xây dựng thương hiệu phòng máy/KOL của riêng mình.' 
              : 'The ultimate platform to automate TFT tournaments, monetize your community, and build your CyberCafe or KOL brand.'}
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="bg-[#D4B263] hover:bg-[#c39b4b] text-black font-semibold px-8 rounded-full" asChild>
              <a href="#apply-form">
                {locale === 'vi' ? 'Ứng Tuyển Ngay' : 'Apply Now'}
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        
        {/* Perks Section */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground">
            {locale === 'vi' ? 'Đặc Quyền Của Organizer' : 'Organizer Perks'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-32">
          <div className="p-6 bg-card/60 backdrop-blur-sm rounded-2xl border border-white/5 shadow-xl hover:-translate-y-2 transition-transform duration-300">
            <TrendingUp className="w-12 h-12 text-[#D4B263] mb-6 drop-shadow-md" />
            <h3 className="text-xl font-bold mb-3">{locale === 'vi' ? 'Chia Sẻ Doanh Thu' : 'Revenue Share'}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {locale === 'vi' 
                ? 'Nhận từ 5% đến 15% phí nền tảng trên mỗi giải đấu Mini hoặc Big Tour bạn tổ chức. Biến sự kiện thành nguồn thu.' 
                : 'Earn 5% to 15% platform fees on every Mini or Big Tour you organize. Turn events into consistent revenue.'}
            </p>
          </div>

          <div className="p-6 bg-card/60 backdrop-blur-sm rounded-2xl border border-white/5 shadow-xl hover:-translate-y-2 transition-transform duration-300">
            <Zap className="w-12 h-12 text-orange-400 mb-6 drop-shadow-md" />
            <h3 className="text-xl font-bold mb-3">{locale === 'vi' ? 'Tự Động Hóa' : 'Full Automation'}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {locale === 'vi' 
                ? 'Được cấp API quét kết quả thần tốc độc quyền: Tự động tính điểm, chia bảng, vượt qua vòng loại và trả thưởng tự động.' 
                : 'Exclusive direct API access: Automatic scoring, bracket progression, and prize payouts without manual screenshot checks.'}
            </p>
          </div>

          <div className="p-6 bg-card/60 backdrop-blur-sm rounded-2xl border border-white/5 shadow-xl hover:-translate-y-2 transition-transform duration-300">
            <Users className="w-12 h-12 text-blue-400 mb-6 drop-shadow-md" />
            <h3 className="text-xl font-bold mb-3">{locale === 'vi' ? 'Cộng Đồng Độc Quyền' : 'Custom Communities'}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {locale === 'vi' 
                ? 'Phần mềm cho phép bạn quản lý user nội bộ và tự quyết định việc cấp/phát tài nguyên cho player thông qua bảng quản trị.' 
                : 'Allow players to fund their wallets through your exclusive partner community dashboard and custom lobbies.'}
            </p>
          </div>

          <div className="p-6 bg-card/60 backdrop-blur-sm rounded-2xl border border-white/5 shadow-xl hover:-translate-y-2 transition-transform duration-300">
            <Target className="w-12 h-12 text-emerald-400 mb-6 drop-shadow-md" />
            <h3 className="text-xl font-bold mb-3">{locale === 'vi' ? 'Gói Phòng Máy (Cyber)' : 'CyberCafe Packages'}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {locale === 'vi' 
                ? 'Gói Subscription linh hoạt giúp các cyber cafes tự chạy giải hằng tuần trên phần mềm TesTicTour với chi phí tối ưu.' 
                : 'Flexible subscriptions enabling cyber cafes to run weekly tournaments using TesTicTour platform with optimized fixed costs.'}
            </p>
          </div>
        </div>

        {/* Application Form Section */}
        <div id="apply-form" className="relative max-w-4xl mx-auto bg-card rounded-[2.5rem] border border-[#D4B263]/30 p-8 md:p-12 shadow-2xl overflow-hidden scroll-m-24">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-[#D4B263]"></div>
          
          <div className="text-center mb-10">
            <Handshake className="w-12 h-12 text-[#D4B263] mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-2">{locale === 'vi' ? 'Gửi Yêu Cầu Hợp Tác' : 'Partner Application'}</h2>
            <p className="text-muted-foreground">
              {locale === 'vi' ? 'Vui lòng điền thông tin bên dưới để bắt đầu thảo luận.' : 'Fill out the form below to initiate discussion with our team.'}
            </p>
          </div>

          <form className="space-y-6 max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">{locale === 'vi' ? 'Họ và Tên' : 'Full Name'}</Label>
                <Input id="name" placeholder={locale === 'vi' ? 'Nhập tên của bạn' : 'Enter your name'} className="bg-background/80" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{locale === 'vi' ? 'Email Liên Hệ' : 'Contact Email'}</Label>
                <Input id="email" type="email" placeholder="email@example.com" className="bg-background/80" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="discord">{locale === 'vi' ? 'Discord ID / Link' : 'Discord ID / Handle'}</Label>
                <Input id="discord" placeholder="username#1234" className="bg-background/80" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org">{locale === 'vi' ? 'Phòng Máy / Tên Cộng Đồng' : 'Organization / CyberCafe Name'}</Label>
                <Input id="org" placeholder="Esports Arena / Group" className="bg-background/80" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">{locale === 'vi' ? 'Giới thiệu ngắn về cộng đồng của bạn' : 'Briefly describe your community/venue'}</Label>
              <Textarea id="message" rows={4} placeholder={locale === 'vi' ? 'Số lượng thành viên, tần suất muốn tổ chức giải...' : 'Number of members, expected tournament frequency...'} className="bg-background/80 resize-none" />
            </div>

            <div className="pt-4 flex justify-center">
              <Button type="button" className="bg-[#D4B263] hover:bg-[#c39b4b] text-black font-semibold px-12 h-14 rounded-full text-lg shadow-[0_0_20px_rgba(212,178,99,0.3)] hover:shadow-[0_0_30px_rgba(212,178,99,0.5)] transition-all">
                <CheckCircle className="w-5 h-5 mr-2" />
                {locale === 'vi' ? 'Gửi Hồ Sơ' : 'Submit Application'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
