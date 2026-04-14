import { Metadata } from 'next';
import { Mail, MessageSquare, Globe, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  return {
    title: locale === 'vi' ? 'Liên Hệ | TesTicTour' : 'Contact Us | TesTicTour',
    description: locale === 'vi' ? 'Liên hệ với chúng tôi để được hỗ trợ.' : 'Get in touch with the TesTicTour team.'
  };
}

export default function ContactPage({ params: { locale } }: { params: { locale: string } }) {
  return (
    <div className="relative min-h-screen selection:bg-primary/20">
      {/* Background aesthetic enhancements */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-blue-500 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }}></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            {locale === 'vi' ? 'Liên Hệ Với Chúng Tôi' : 'Get in Touch'}
          </h1>
          <p className="text-xl text-muted-foreground">
            {locale === 'vi' 
              ? 'Đội ngũ TesTicTour luôn sẵn sàng lắng nghe và hỗ trợ bạn trong mọi vấn đề về giải đấu, quỹ thưởng, hoặc đề xuất hợp tác.' 
              : 'Our team is always ready to assist you with tournament issues, prize payouts, or partnership opportunities.'}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Form Section */}
          <div className="lg:w-1/2 p-8 rounded-3xl bg-card/60 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Mail className="w-48 h-48" />
            </div>
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-6 text-foreground">
                {locale === 'vi' ? 'Gửi tin nhắn' : 'Send a Message'}
              </h2>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-muted-foreground">{locale === 'vi' ? 'Tên của bạn' : 'Your Name'}</Label>
                    <Input id="name" placeholder="John Doe" className="bg-background/50 border-white/10 focus-visible:ring-primary/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                    <Input id="email" type="email" placeholder="john@example.com" className="bg-background/50 border-white/10 focus-visible:ring-primary/50" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-muted-foreground">{locale === 'vi' ? 'Chủ đề' : 'Subject'}</Label>
                  <Input id="subject" placeholder={locale === 'vi' ? 'Bạn cần hỗ trợ gì?' : 'How can we help?'} className="bg-background/50 border-white/10 focus-visible:ring-primary/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-muted-foreground">{locale === 'vi' ? 'Nội dung' : 'Message'}</Label>
                  <Textarea id="message" rows={5} placeholder={locale === 'vi' ? 'Kể cho chúng tôi chi tiết...' : 'Tell us more...'} className="bg-background/50 border-white/10 focus-visible:ring-primary/50 resize-none" />
                </div>
                <Button type="button" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-12 rounded-xl flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  {locale === 'vi' ? 'Gửi tin nhắn' : 'Send Message'}
                </Button>
              </form>
            </div>
          </div>

          {/* Direct Contacts Layout */}
          <div className="lg:w-1/2 flex flex-col gap-6">
            <div className="p-8 rounded-3xl bg-card border border-white/5 shadow-sm flex items-start gap-6 hover:border-primary/30 transition-colors">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-foreground">
                  {locale === 'vi' ? 'Hỗ Trợ Người Chơi' : 'Player Support'}
                </h3>
                <p className="text-muted-foreground mb-4 text-sm md:text-base">
                  {locale === 'vi' 
                    ? 'Gặp vấn đề về kết quả trận đấu hoặc tài khoản?' 
                    : 'Having issues with match results or your account?'}
                </p>
                <a href="mailto:support@testictour.com" className="text-primary font-semibold hover:underline">
                  support@testictour.com
                </a>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-card border border-white/5 shadow-sm flex items-start gap-6 hover:border-[#5865F2]/50 transition-colors">
              <div className="w-14 h-14 rounded-full bg-[#5865F2]/10 flex items-center justify-center shrink-0">
                <MessageSquare className="w-7 h-7 text-[#5865F2]" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-foreground">
                  {locale === 'vi' ? 'Cộng Đồng Discord' : 'Discord Community'}
                </h3>
                <p className="text-muted-foreground mb-4 text-sm md:text-base">
                  {locale === 'vi' 
                    ? 'Nhận phản hồi trực tiếp nhanh nhất từ Admin và cộng đồng.' 
                    : 'Get the fastest direct response from Admins and players.'}
                </p>
                <Button asChild variant="outline" className="border-[#5865F2] text-[#5865F2] hover:bg-[#5865F2] hover:text-white rounded-xl">
                  <Link href="https://discord.com/invite/R3rez3qDbf" target="_blank">
                    Join our Discord
                  </Link>
                </Button>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-card border border-white/5 shadow-sm flex items-start gap-6 hover:border-emerald-500/50 transition-colors">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Globe className="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-foreground">
                  {locale === 'vi' ? 'Hợp Tác Kinh Doanh' : 'Partnerships'}
                </h3>
                <p className="text-muted-foreground mb-4 text-sm md:text-base">
                  {locale === 'vi' 
                    ? 'Muốn trở thành Partner, mua gói gói phòng máy hoặc tài trợ giải?' 
                    : 'Looking to become a Partner, sponsor tournaments, or buy cybercafe plans?'}
                </p>
                <a href="mailto:business@testictour.com" className="text-emerald-500 font-semibold hover:underline">
                  business@testictour.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
