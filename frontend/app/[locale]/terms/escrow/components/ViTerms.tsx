import { useTranslations } from 'next-intl';

export default function ViTerms() {
  return (
    <div className="space-y-12">
      <section id="introduction" className="scroll-mt-24 space-y-4">
        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          Chính Sách Cốt Lõi
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">1. Giới thiệu</h2>
        <p className="text-muted-foreground leading-relaxed text-lg">
          Chào mừng đến với Hệ Thống Ký Quỹ Giải Đấu TesticTour. Tài liệu này vạch ra các quy tắc và quy trình quản lý cách các quỹ giải đấu được bảo đảm, quản lý và phân phối trên nền tảng của chúng tôi. Bằng việc tham gia hoặc tổ chức giải đấu, bạn đồng ý với các điều khoản này.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Hệ Thống Ký Quỹ đảm bảo rằng các quỹ giải thưởng được đảm bảo và quỹ được xử lý một cách minh bạch, bảo vệ cả ban tổ chức và người chơi khỏi các rủi ro tài chính.
        </p>
      </section>

      <section id="escrow-vs-community" className="scroll-mt-24 space-y-4">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">2. Ký Quỹ vs. Chế Độ Cộng Đồng</h2>
        <p className="text-muted-foreground leading-relaxed">
          Các giải đấu trên nền tảng của chúng tôi được chia thành hai danh mục tài chính riêng biệt dựa trên quỹ giải thưởng được quảng cáo:
        </p>
        <div className="grid gap-6 md:grid-cols-2 mt-4">
          <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-sm">
            <h3 className="flex items-center text-xl font-semibold mb-3 text-emerald-500">
              <span className="bg-emerald-500/20 p-2 rounded-lg mr-3">💎</span>
              Được Ký Quỹ
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Các giải đấu có tổng giải thưởng đạt hoặc vượt ngưỡng đảm bảo của nền tảng. Đối với các giải đấu này, ban tổ chức phải nạp 100% quỹ giải thưởng vào Hệ Thống Ký Quỹ an toàn của chúng tôi trước khi giải đấu có thể bắt đầu. Nền tảng đảm bảo việc thanh toán cho người chiến thắng.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-sm">
            <h3 className="flex items-center text-xl font-semibold mb-3 text-orange-500">
              <span className="bg-orange-500/20 p-2 rounded-lg mr-3">🤝</span>
              Chế Độ Cộng Đồng
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Các giải đấu nhỏ có tổng giải thưởng dưới ngưỡng quy định. Mặc dù nền tảng vẫn ghi nhận các giao dịch, quỹ giải thưởng <strong>không được đảm bảo</strong> bởi nền tảng. Người chơi tham gia với rủi ro tự chịu về việc nhận thưởng.
            </p>
          </div>
        </div>
      </section>

      <section id="organizer-funding" className="scroll-mt-24 space-y-4">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">3. Yêu Cầu Cấp Vốn của Ban Tổ Chức</h2>
        <ul className="space-y-4 text-muted-foreground list-none ml-0">
          <li className="flex items-start">
            <span className="text-primary mr-3 mt-1">•</span>
            <div>
              <strong className="text-foreground">Đảm Bảo Cấp Vốn Đầy Đủ:</strong> Đối với giải đấu Được Ký Quỹ, tổng giải thưởng yêu cầu phải được nạp 100% và được xác nhận bởi cổng thanh toán của chúng tôi trước khi giải đấu được phép bắt đầu.
            </div>
          </li>
          <li className="flex items-start">
            <span className="text-primary mr-3 mt-1">•</span>
            <div>
              <strong className="text-foreground">Xác Thực:</strong> Việc nạp tiền chủ yếu được xác minh qua hệ thống webhook tự động từ đối tác thanh toán. Đánh giá thủ công chỉ là cách xử lý ngoại lệ do quản trị viên nền tảng thực hiện.
            </div>
          </li>
          <li className="flex items-start">
            <span className="text-primary mr-3 mt-1">•</span>
            <div>
              <strong className="text-foreground">Tách Biệt Phí Tham Gia:</strong> Phí tham gia của người chơi được ghi nhận riêng biệt và ban tổ chức không thể sử dụng để thỏa mãn yêu cầu nạp tiền ký Quỹ trước khi giải đấu bắt đầu.
            </div>
          </li>
        </ul>
      </section>

      <section id="disputes" className="scroll-mt-24 space-y-4">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">4. Hủy Bỏ & Tranh Chấp</h2>
        <div className="rounded-xl border-l-4 border-l-primary bg-primary/5 p-6 space-y-3">
          <h3 className="text-lg font-medium text-foreground">Hủy Trước Khi Khóa</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Nếu giải đấu bị hủy <em>trước khi</em> chính thức bắt đầu (trước khi khóa): Phí tham gia của người chơi sẽ được hoàn lại. Ban tổ chức có thể yêu cầu rút lại khoản Ký Quỹ, phụ thuộc vào quá trình xem xét của admin và trừ đi các khoản phí cổng thanh toán không hoàn lại. Ký Quỹ sẽ chuyển sang trạng thái "Đã Hủy" sau khi việc hoàn tiền hoàn tất.
          </p>
        </div>
        <div className="rounded-xl border-l-4 border-l-destructive bg-destructive/5 p-6 space-y-3 mt-4">
          <h3 className="text-lg font-medium text-foreground">Sau Khi Khóa & Tranh Chấp</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Khi giải đấu bắt đầu, tiền quỹ sẽ bị khóa. Trong trường hợp có tranh chấp kết quả, nghi ngờ gian lận hoặc ban tổ chức hủy ngang, Ký Quỹ sẽ chuyển sang trạng thái "Có Tranh Chấp". Quỹ sẽ bị đóng băng cho đến khi Quản trị viên nền tảng điều tra và đưa ra quyết định giải quyết cuối cùng.
          </p>
        </div>
      </section>

      <section id="payouts" className="scroll-mt-24 space-y-4">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">5. Thanh Toán & Đối Soát</h2>
        <p className="text-muted-foreground leading-relaxed">
          Các quy trình sau quản lý cách người chiến thắng nhận phần thưởng và ban tổ chức kiểm tra tài chính:
        </p>
        <div className="space-y-4 mt-4">
          <div className="p-4 rounded-lg bg-card/30 border border-border">
            <strong className="text-foreground block mb-1">Thẩm Quyền Giải Phóng</strong>
            <span className="text-sm text-muted-foreground">Chỉ Quản trị viên (Admin) mới có thẩm quyền giải phóng quỹ thưởng. Ban tổ chức yêu cầu giải phóng dựa trên kết quả chính thức, nhưng admin là người thực hiện chuyển khoản cuối cùng để chống gian lận.</span>
          </div>
          <div className="p-4 rounded-lg bg-card/30 border border-border">
            <strong className="text-foreground block mb-1">Đối Soát Tự Động</strong>
            <span className="text-sm text-muted-foreground">Quá trình thanh toán cho người thắng cuộc được theo dõi sát sao. Trạng thái "Đã Thanh Toán" chỉ được cập nhật khi cổng thanh toán xác nhận giao dịch thành công qua hệ thống webhook hoặc admin xác minh hóa đơn thủ công.</span>
          </div>
          <div className="p-4 rounded-lg bg-card/30 border border-border">
            <strong className="text-foreground block mb-1">Báo Cáo Đối Soát</strong>
            <span className="text-sm text-muted-foreground">Ban tổ chức được cung cấp một báo cáo đối soát tổng thể, cân đối lại khoản nạp ban đầu, phí tham gia, tiền hoàn và tổng chi thưởng để đảm bảo sự minh bạch tuyệt đối.</span>
          </div>
        </div>
      </section>

      <div className="border-t border-border/50 pt-8 mt-12 text-sm text-muted-foreground text-center">
        Cập nhật lần cuối: Tháng 4 năm 2026. Chính sách này thay thế mọi thỏa thuận trước đây liên quan đến tài chính giải đấu.
      </div>
    </div>
  )
}
