import { Metadata } from 'next';
import { Briefcase, Code, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  return {
    title: locale === 'vi' ? 'Tuyển Dụng | TesTicTour' : 'Careers | TesTicTour',
    description: locale === 'vi' ? 'Cơ hội nghề nghiệp tại TesTicTour.' : 'Career opportunities at TesTicTour.'
  };
}

export default function CareersPage({ params: { locale } }: { params: { locale: string } }) {
  return (
    <div className="relative min-h-screen selection:bg-primary/20">
      {/* Background aesthetic enhancements */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-emerald-500 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }}></div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
            {locale === 'vi' ? 'Xây Dựng Tương Lai Esports Cùng Chúng Tôi' : 'Build the Future of Esports With Us'}
          </h1>
          <p className="text-xl text-muted-foreground">
            {locale === 'vi' 
              ? 'Chúng tôi là một đội ngũ đam mê công nghệ và game, với tham vọng cách mạng hóa nền tảng tổ chức giải đấu trên toàn cầu.' 
              : 'We are a passionate team of gamers and engineers out to revolutionize competitive grassroots tournaments globally.'}
          </p>
        </div>

        <div className="border-t border-border pt-16">
          <h2 className="text-2xl font-bold mb-8 text-foreground">
            {locale === 'vi' ? 'Vị Trí Đang Mở' : 'Open Positions'}
          </h2>

          <div className="grid gap-6">
            <div className="p-6 md:p-8 bg-card border rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Code className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Senior Fullstack Engineer</h3>
                  <div className="text-muted-foreground text-sm mt-1 flex gap-3">
                    <span>Remote / Vietnam</span>
                    <span>•</span>
                    <span>Full-time</span>
                  </div>
                </div>
              </div>
              <Button asChild variant="outline">
                <Link href="mailto:career@testictour.com?subject=Application:%20Fullstack%20Engineer">
                  {locale === 'vi' ? 'Ứng Tuyển' : 'Apply Now'}
                </Link>
              </Button>
            </div>

            <div className="p-6 md:p-8 bg-card border rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Megaphone className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Community Growth Manager</h3>
                  <div className="text-muted-foreground text-sm mt-1 flex gap-3">
                    <span>Remote / Global</span>
                    <span>•</span>
                    <span>Full-time</span>
                  </div>
                </div>
              </div>
              <Button asChild variant="outline">
                <Link href="mailto:career@testictour.com?subject=Application:%20Community%20Manager">
                  {locale === 'vi' ? 'Ứng Tuyển' : 'Apply Now'}
                </Link>
              </Button>
            </div>

            <div className="p-6 md:p-8 bg-card border rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Briefcase className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Business Development</h3>
                  <div className="text-muted-foreground text-sm mt-1 flex gap-3">
                    <span>Vietnam</span>
                    <span>•</span>
                    <span>Part-time / B2B</span>
                  </div>
                </div>
              </div>
              <Button asChild variant="outline">
                <Link href="mailto:career@testictour.com?subject=Application:%20Business%20Development">
                  {locale === 'vi' ? 'Ứng Tuyển' : 'Apply Now'}
                </Link>
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
