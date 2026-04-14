import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Shield, Lock, Eye, Server } from 'lucide-react';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  return {
    title: locale === 'vi' ? 'Chính Sách Bảo Mật | TesTicTour' : 'Privacy Policy | TesTicTour',
    description: locale === 'vi' ? 'Chính sách thu thập và bảo mật thông tin người dùng.' : 'Data collection and privacy policy.'
  };
}

export default function PrivacyPolicyPage({ params: { locale } }: { params: { locale: string } }) {
  return (
    <div className="relative min-h-screen selection:bg-primary/20">
      {/* Background aesthetic enhancements */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-orange-500 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }}></div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            {locale === 'vi' ? 'Chính Sách Bảo Mật' : 'Privacy Policy'}
          </h1>
          <p className="text-xl text-muted-foreground">
            {locale === 'vi' ? 'Cập nhật lần cuối: Tháng 4, 2026' : 'Last updated: April 2026'}
          </p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          {locale === 'vi' ? (
            <>
              <p>
                Tại TesTicTour, chúng tôi coi trọng quyền riêng tư của bạn. Chính sách này giải thích cách chúng tôi thu thập, sử dụng, và bảo vệ thông tin của bạn khi bạn sử dụng nền tảng của chúng tôi để tham gia các giải đấu Teamfight Tactics.
              </p>

              <h3>1. Thông tin chúng tôi thu thập</h3>
              <ul>
                <li><strong>Thông tin tài khoản:</strong> Khi bạn đăng nhập thông qua Discord hoặc email, chúng tôi lưu trữ tên hiển thị, email và avatar.</li>
                <li><strong>Dữ liệu Riot Games:</strong> Để cập nhật kết quả tự động, chúng tôi liên kết với Riot API. Chúng tôi lưu trữ <code>Riot ID</code>, <code>PUUID</code>, và dữ liệu các trận đấu TFT của bạn (Thứ hạng, điểm số). </li>
                <li><strong>Dữ liệu tài chính:</strong> Nếu bạn tham gia hệ thống giải thưởng, thông tin thanh toán được quản lý bảo mật thông qua đối tác thanh toán (Stripe/MoMo) và chúng tôi không lưu trữ trực tiếp số thẻ tín dụng của bạn.</li>
              </ul>

              <h3>2. Cách thông tin được sử dụng</h3>
              <p>
                Thông tin của bạn chỉ được sử dụng cho mục đích: Tạo tài khoản, tính toán xếp hạng (leaderboard), lấy lịch sử trận đấu từ Riot Games, trao giải thưởng, và gửi thông báo nhắc nhở lịch thi đấu qua Discord/Email.
              </p>

              <h3>3. Chia sẻ thông tin</h3>
              <p>
                Chúng tôi tuyệt đối <strong>không bán</strong> dữ liệu của bạn cho bên thứ ba. Dữ liệu chỉ được chia sẻ một phần với các công cụ chống gian lận nội bộ và hệ thống của Riot Games theo các quy định bắt buộc của Riot API.
              </p>

              <h3>4. Bảo mật dữ liệu</h3>
              <p>
                Mọi kết nối được mã hóa chuẩn SSL/TLS. Quỹ giải thưởng của người chơi được mã hóa và bảo vệ khắt khe trên cơ sở hạ tầng đám mây không thể xâm phạm từ bên ngoài. Dù vậy, bạn nên tự bảo vệ tài khoản bằng mật khẩu mạnh hoặc Discord 2FA.
              </p>

              <h3>5. Tuyên Bố Miễn Trừ Trách Nhiệm (Disclaimer)</h3>
              <p>
                <strong>Không liên kết với Riot Games:</strong> TesTicTour là một nền tảng giải đấu tổ chức bởi cộng đồng và hoàn toàn độc lập. Chúng tôi <strong>KHÔNG</strong> được tài trợ, xác nhận, hay có bất kỳ sự liên kết chính thức nào với Riot Games, Inc. hay bất kỳ tổ chức công ty nào khác. "Teamfight Tactics" và các tài sản liên quan là tài sản đã được đăng ký bản quyền của Riot Games.
              </p>
              <p>
                <strong>Về nhà tài trợ (Sponsors):</strong> Trong trường hợp có các đối tác, thương hiệu hoặc nhà tài trợ đồng hành cùng một giải đấu cụ thể, logo và thông tin của họ sẽ được chúng tôi công bố minh bạch và rõ ràng ngay trên giao diện của giải đấu đó.
              </p>
            </>
          ) : (
            <>
              <p>
                At TesTicTour, we take your privacy seriously. This policy explains how we collect, use, and protect your personal information when you use our platform for Teamfight Tactics tournaments.
              </p>

              <h3>1. Information We Collect</h3>
              <ul>
                <li><strong>Account Data:</strong> When logging in via Discord or email, we collect your display name, email address, and avatar.</li>
                <li><strong>Riot Games Data:</strong> For automatic match results, we link with the Riot API and store your <code>Riot ID</code>, <code>PUUID</code>, and TFT match performance data. </li>
                <li><strong>Financial Data:</strong> Tournament entry and payouts are handled securely through partners (Stripe/MoMo). We do not directly store your credit card numbers.</li>
              </ul>

              <h3>2. How We Use It</h3>
              <p>
                Your data is strictly used to create your profile, update leaderboards, pull match history from Riot Games, process your prize payouts, and send notifications regarding tournament schedules.
              </p>

              <h3>3. Sharing with Third Parties</h3>
              <p>
                We <strong>never sell</strong> your private data. Your data is only selectively shared with internal anti-cheat metrics and Riot Games to comply with Riot API regulations.
              </p>

              <h3>4. Security of Your Data</h3>
              <p>
                All data transfers run on encrypted SSL/TLS layers. Player funds and sensitive data are strictly protected out of reach from public breaches. We still recommend using strong passwords and Discord 2FA.
              </p>

              <h3>5. Legal Disclaimer & Non-Affiliation</h3>
              <p>
                <strong>Not affiliated with Riot Games:</strong> TesTicTour is an independent, community-driven tournament platform. We are <strong>NOT</strong> endorsed, sponsored by, or officially affiliated with Riot Games, Inc. or any other corporation. "Teamfight Tactics" and all associated properties are registered trademarks of Riot Games.
              </p>
              <p>
                <strong>Regarding Sponsors:</strong> If direct sponsors or partner brands officially fund a specific tournament, their logos and identities will be strictly and explicitly displayed on the respective tournament's page.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
