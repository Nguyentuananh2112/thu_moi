/* =====================================================================
   THƯ MỜI DỰ LỄ TỐT NGHIỆP - FILE NỘI DUNG
   Lời thư, tên hai bạn và thông tin buổi lễ đều nằm trong file này: sửa ở đây là đủ.
   (Chỉ có một việc nhỏ ở file khác, làm sau khi đưa trang lên mạng: xem bước cuối bên dưới.)

   Mẹo:
   - Viết {to} ở đâu thì chỗ đó hiện tên người nhận.
   - Viết {from} ở đâu thì chỗ đó hiện tên bạn.
   - Muốn đổi tên người nhận ngay trên link, thêm ?to=Tên vào cuối link.
     Ví dụ: https://ten-trang.netlify.app/?to=Bé%20Mèo
   - Mỗi trang nên giữ khoảng 60 chữ. Viết dài hơn thì chữ tự thu nhỏ cho vừa.
   - Chỗ nào còn chữ "Lorem ipsum" là chữ giữ chỗ: nhớ thay bằng lời của bạn.
   - Dòng bắt đầu bằng hai dấu // là ghi chú: trang bỏ qua, không đọc.
     Muốn một dòng mẫu như vậy có tác dụng thì xoá hai dấu // ở đầu dòng đi.

   Giữ đúng dấu khi sửa (sai một dấu là cả file không đọc được, trang sẽ hiện bảng báo lỗi
   kèm số dòng cần xem lại):
   - Chỉ sửa chữ nằm GIỮA hai dấu nháy '...'. Giữ nguyên dấu nháy và dấu phẩy ở cuối dòng.
   - Nếu trong chữ có dấu nháy đơn ' (ví dụ Baby's) thì viết thành \' (Baby\'s),
     hoặc bọc cả câu bằng nháy kép: "Baby's".

   Xem lại từ đầu:
   - Phong bì, trò gõ nhầm ở trang lời chào và tấm ảnh mờ chỉ diễn ở lần mở link đầu tiên,
     và máy còn nhớ những gì đã bấm (đã nhận lời, đã ngoéo tay, đã chuyển tua, đã bóc thư).
     Sửa xong muốn xem lại y như người nhận thấy lần đầu thì mở link bằng một tab ẩn danh
     mới (trên Safari gọi là tab Riêng tư).

   Bước cuối, sau khi đưa trang lên mạng:
   - Mở file index.html, tìm hai dòng có chữ og:url và og:image ở gần đầu file. Trong hai dòng
     đó, thay chữ TEN-TRANG-CUA-BAN.example bằng địa chỉ trang của bạn (ví dụ ten-trang.netlify.app),
     giữ nguyên phần https:// ở đầu và /assets/og-image.png phía sau.
     Nhờ vậy khi gửi link qua Zalo hay Messenger, khung xem trước hiện đúng ảnh và tên thư.
   ===================================================================== */

window.INVITE_CONFIG = {

  /* Người nhận thư: tên thân mật bạn hay gọi người ấy, ngắn thôi (ví dụ 'Bé Mèo'),
     không cần họ tên đầy đủ. Tên này hiện ở phong bì, bìa thư, lời chào, tấm bằng và tấm vé. */
  recipient: {
    name: 'Em bé'
  },

  /* Người gửi thư (là bạn): tên người ấy hay gọi bạn, cũng nên ngắn (một hai chữ).
     Tên này hiện ở chữ ký, tấm bằng và tấm vé; họ tên đầy đủ thường quá dài cho màn hình điện thoại. */
  sender: {
    name: 'Tuấn Anh'
  },

  /* Thông tin buổi lễ */
  event: {
    title: 'Lễ tốt nghiệp',

    /* Giờ bắt đầu và kết thúc buổi lễ. Chỉ sửa các con số, giữ nguyên chữ T ở giữa
       và đuôi +07:00 (nghĩa là giờ Việt Nam).
       Thứ tự là: năm-tháng-ngày, rồi chữ T, rồi giờ:phút:giây (giờ viết kiểu 24 giờ).
       Ví dụ 8 giờ sáng ngày 15/11/2026 là '2026-11-15T08:00:00+07:00',
       còn 2 giờ rưỡi chiều cùng ngày là '2026-11-15T14:30:00+07:00'.
       Lỡ viết '2026-11-15 08:00' hay '15/11/2026 08:00' thì trang vẫn hiểu (theo giờ Việt Nam).
       Chỉ ghi ngày, không ghi giờ thì dòng Giờ tự ẩn. Viết sai dạng thì trang tạm ẩn ngày giờ,
       đồng hồ đếm ngược và nút "Thêm vào lịch", rồi hiện một dòng nhắc để bạn sửa lại.
       Đồng hồ đếm ngược, nút "Thêm vào lịch" và lá thư niêm phong đều dùng 2 dòng này. */
    start: '2026-10-31T08:00:00+07:00',
    end:   '2026-10-31T11:00:00+07:00',

    /* Để trống '' thì trang tự viết ngày giờ theo "start".
       Muốn tự viết thì điền vào, ví dụ: 'Chủ nhật, 15/11/2026' và '8 giờ sáng'. */
    dateText: '',
    timeText: '',

    venue: 'Trung tâm Hội nghị Quốc gia',
    address: 'Đại lộ Thăng Long, Mễ Trì, Nam Từ Liêm, Hà Nội',

    /* Link Google Maps. Để trống '' thì trang tự tìm theo tên địa điểm ở trên. */
    mapUrl: 'https://www.google.com/maps/place/National+Convention+Center/@21.0056309,105.7850331,1052m/data=!3m2!1e3!4b1!4m6!3m5!1s0x3135acac08698957:0xcb92e58f7f3e275c!8m2!3d21.0056259!4d105.787608!16s%2Fm%2F0408_k6?entry=ttu&g_ep=EgoyMDI2MDkyOS4wIKXMDSoASAFQAw%3D%3D'
  },

  /* Đếm ngày bên nhau (hiện ở trang ảnh). Điền ngày hai bạn bắt đầu yêu,
     dạng năm-tháng-ngày, ví dụ '2024-02-14' là ngày 14/2/2024. Để trống '' là ẩn đi.
     {days} là số ngày, trang tự tính. */
  together: {
    since: '2026-06-14',
    text: 'Bên nhau {days} ngày rồi đó'
  },

  /* Bạn gấu. Chạm vào gấu thì gấu lần lượt nói các câu trong "says". */
  mascot: {
    hint: 'Chạm vào gấu nè!',
    says: [
      'Hi hi, nhột quá!',
      'Nhớ {to} ghê á!',
      'Ôm một cái nào!',
      'Hôm đó nhớ đến nha!',
      'Thương {to} nhiều!'
    ]
  },

  /* Lời văn từng trang, theo đúng thứ tự trong thư.
     (Số trang in ở góc mỗi trang có thể lệch khi bật thêm trang, nên ở đây gọi trang theo tên.) */
  pages: {

    /* Màn chờ lúc mới mở link */
    loader: {
      text: 'Có thư cho {to} nè'
    },

    /* Trang bìa */
    cover: {
      kicker: 'Thư mời',
      title: 'dự Lễ tốt nghiệp',
      to: 'Gửi {to}',
      hint: 'Chạm hoặc vuốt để mở'
    },

    /* Trang lời chào, ngay sau bìa (dòng tiêu đề sẽ được gõ từng chữ) */
    greeting: {
      title: 'Gửi {to},',
      lead: 'Hôm nay {from} có một chuyện quan trọng lắm muốn kể, mà phải kể cho {to} nghe đầu tiên cơ. Lật tiếp đi nha!'
    },

    /* Trang lá thư "Có điều này muốn nói". Mỗi dòng trong ngoặc vuông là một đoạn văn:
       mỗi đoạn để trong dấu nháy, các đoạn cách nhau bằng dấu phẩy, giữ nguyên hai dấu [ ]. */
    letter: {
      title: 'Có điều này muốn nói',
      paragraphs: [
        'Mấy năm đi học, có hôm mệt muốn bỏ cuộc luôn á. Những lúc đó chỉ cần nghĩ tới {to} là {from} lại có thêm sức để cố thêm chút nữa.',
        'Giờ {from} sắp tốt nghiệp rồi nè. Ngày quan trọng như vậy, người đứng cạnh nhất định phải là {to} mới chịu cơ!'
      ]
    },

    /* Trang thông tin buổi lễ (ngày, giờ, địa điểm lấy từ mục event ở trên) */
    details: {
      title: 'Lễ tốt nghiệp',
      note: 'Đến sớm xíu nha, {from} muốn thấy {to} đầu tiên!'
    },

    /* Trang ảnh. Muốn dùng ảnh của bạn: chép file ảnh vào thư mục assets, rồi ghi đúng
       tên file đó vào "src", ví dụ 'assets/anh-cua-minh.jpg' (viết y hệt tên file, cả đuôi
       .jpg hay .png). Tên file nên viết không dấu và không có dấu cách. Ảnh vuông sẽ đẹp nhất.
       Nhớ thu nhỏ ảnh còn khoảng 1000 px ở cạnh dài (tầm 200 KB) trước khi chép: ảnh chụp
       điện thoại để nguyên rất nặng, mở trong Zalo hay Messenger dễ bị tắt ngang
       (cách thu nhỏ xem ở mục photoStack bên dưới). */
    photo: {
      title: 'Khoảnh khắc nhỏ',
      src: 'assets/photo.svg',
      alt: 'Ảnh kỷ niệm',
      caption: 'Hai đứa ở bờ hồ',
      text: 'Lần nào đi dạo bờ hồ cũng muốn đi thêm một vòng nữa, vì có {to} đi cạnh.'
    },

    /* Trang đếm ngược tới ngày lễ */
    countdown: {
      title: 'Đếm ngược nào!',
      text: 'Mỗi ngày trôi qua là gần thêm một chút tới hôm {from} mặc áo cử nhân, đứng chờ {to} tới.',
      done: 'Đến ngày rồi nè!'
    },

    /* Trang lời mời cuối: trang có nút "Mình sẽ đến!", nằm ngay trước bìa sau
       (và ngay sau trang bằng danh dự nếu bật tính năng diploma).
       "no" là nút từ chối cho vui: mỗi lần bấm nó nhảy đi chỗ khác, nhỏ lại
       và đổi sang câu kế tiếp trong "noReplies". Hết câu thì nút biến mất. */
    rsvp: {
      question: 'Đến chung vui nhé?',
      text: 'Có {to} ở đó thì ngày vui mới trọn vẹn. Không tới là {from} dỗi thật đó nha!',
      button: 'Mình sẽ đến!',
      after: 'Yay! Hẹn gặp nhé!',
      again: 'Ăn mừng lần nữa',
      no: 'Để nghĩ đã…',
      noReplies: [
        'Nghĩ gì nữa mà!',
        'Bấm nhầm rồi đó',
        'Nút này hư rồi nha',
        'Thôi mà, đến đi!'
      ]
    },

    /* Bìa sau */
    back: {
      title: 'Hẹn gặp nhé!',
      text: 'Cảm ơn {to} vì đã luôn ở bên. Lễ xong mình ra bờ hồ ăn mừng nha!',
      sign: '{from}'
    }
  },

  /* Âm thanh */
  audio: {
    /* Âm thanh lúc mới mở thư: tiếng lật trang, tiếng ăn mừng (tự tạo, không cần file)
       và cả nhạc nền bên dưới.
       true: có tiếng. false: mở thư ra là im lặng hết, KỂ CẢ nhạc nền; người nhận vẫn
       bấm nút loa ở góc trên để bật lên (máy sẽ nhớ lựa chọn đó cho những lần mở sau). */
    enabled: true,

    /* Nhạc nền: phát lần lượt theo danh sách dưới đây, thử phát ngay khi trang mở xong.
       Phần lớn điện thoại chỉ cho phát tiếng sau cú chạm đầu tiên, nên thường nhạc bắt đầu
       đúng lúc người nhận chạm vào dấu sáp phong bì.
       - "chờ chút..." (cắt sẵn từ giây 0:37 của bài gốc, độ to đã chỉnh cho vừa) phát 3 lượt,
         lượt nào cũng bắt đầu từ 0:37.
       - Lượt thứ 4 chuyển sang bản piano nhẹ, rồi piano lặp mãi.
       - Chuyển sang app khác rồi quay lại: nhạc tạm dừng rồi phát tiếp đúng chỗ.
         Mở lại link: nhạc bắt đầu lại từ "chờ chút...".
       Mỗi bài gồm: src (đường dẫn file), times (phát mấy lượt rồi sang bài sau; bài cuối bỏ
       trống times thì lặp mãi), start (bắt đầu từ giây thứ mấy, ví dụ start: 37 nếu dùng
       file gốc chưa cắt). Để bgm: '' là không có nhạc nền. */
    bgm: [
      { src: 'assets/audio/cho-chut.mp3', times: 3 },
      { src: 'assets/audio/nhac-nen.mp3' }
    ],

    /* Độ to của nhạc nền, từ 0 (im) đến 1 (to nhất). Hai file đi kèm đã được chỉnh độ to sẵn
       nên cứ để 1. Riêng iPhone không cho trang chỉnh độ to, nên trên iPhone nhạc luôn phát
       đúng độ to của file. */
    bgmVolume: 1,

    /* Bong bóng nhỏ cạnh nút loa khi trình duyệt chưa cho phát nhạc (chạm vào đâu cũng được) */
    tapToPlay: 'Chạm để nghe nhạc nha'
  },

  /* Lời nhắn lúc vừa mở link (tính năng music-prompt). Trang web không tự tắt được chế độ
     im lặng hay chỉnh âm lượng điện thoại, nên thư nhắc người nhận tự làm, rồi chạm Đồng ý
     là nhạc phát. Chạm Để sau thì thư mở trong im lặng, bấm nút loa ở góc trên để nghe sau.
     Lời nhắn hiện mỗi lần mở link. */
  musicPrompt: {
    title: 'Thư này có nhạc nè',
    text: 'Tắt chế độ im lặng và mở âm lượng lên một chút để nghe trọn vẹn nha.',
    yes: 'Đồng ý, bật nhạc',
    later: 'Để sau'
  },

  /* ===== CÁC TÍNH NĂNG ĐÁNG YÊU THÊM (bắt đầu) ===== */
  /* Bật (true) hoặc tắt (false) từng tính năng. Tắt thì tính năng biến mất hoàn toàn khỏi thư.
     Muốn tắt hay bật thì chỉ đổi chữ true / false. Lỡ xoá mất dòng của tính năng nào thì tính năng
     đó theo mặc định của nó: lọ sao (star-jar) và trò đua (love-race) mặc định tắt, còn lại bật.
     Chữ và tuỳ chọn của từng tính năng nằm ở các mục ngay bên dưới. Mục nào cũng có sẵn giá trị
     mặc định: không sửa gì vẫn chạy được, xoá cả mục đi cũng không sao. */
  features: {
    envelope: true,        // Phong bì dấu sáp hiện ra trước khi mở thư
    'greeting-play': true, // Trang lời chào: viết rồi xoá, dấu bưu điện, gấu chào theo giờ
    'photo-stack': true,   // Trang ảnh: chồng ảnh có mặt sau, lắc cho hiện hình
    'sealed-letter': true, // Thư niêm phong chờ ngày lễ (chỉ hiện khi bạn đã viết thư)
    'voice-note': true,    // Tin nhắn thoại (chỉ hiện khi bạn có file ghi âm)
    'star-jar': true,      // Trang lọ sao giấy: mỗi ngôi sao một lý do
    'love-race': false,    // Trang trò chơi "Ai thương nhiều hơn?" (đang tắt)
    diploma: true,         // Trang bằng danh dự trao cho người ấy
    'puppy-eyes': true,    // Gấu mếu dần khi bị trêu "Để nghĩ đã…"
    'pinky-promise': true, // Ngoéo tay điểm chỉ sau khi nhận lời
    ticket: true,          // Vé mời độc bản số 0001/0001
    'margin-bears': true,  // Đôi gấu tí hon xích lại gần ở lề mỗi trang
    tassel: true,          // Chuyển tua mũ cho gấu ở bìa sau
    'music-prompt': true   // Lúc mở link: nhắc tắt chế độ im lặng, chạm Đồng ý là nhạc phát
  },

  envelope: {
    /* Phong bì niêm phong dấu sáp hiện ra trước cuốn sách. Người nhận chạm vào để mở thư. */

    /* false: lần nào mở link cũng thấy phong bì.
       true: chỉ thấy phong bì ở lần mở link đầu tiên, các lần sau vào thẳng cuốn sách.
       Vì vậy sửa chữ trên phong bì xong mà mở lại không thấy phong bì thì không phải lỗi:
       mở link bằng một tab ẩn danh mới là xem lại được. */
    once: true,

    /* Dòng chữ viết tay trên phong bì. {to} là tên người nhận. Nên viết ngắn, khoảng 35 ký tự trở lại. */
    to: 'Gửi {to}',

    /* Nhãn dán nhỏ màu vàng ở góc dưới phong bì. Để '' là bỏ nhãn dán. Nên viết ngắn, dài quá sẽ bị cắt bằng dấu "…". */
    sticker: 'Bên trong có một trái tim',

    /* Dòng gợi ý nằm dưới phong bì. Để '' là ẩn đi. */
    hint: 'Chạm vào dấu sáp để mở thư'
  },

  greetingPlay: {
    rewrite: true,                        // trò "viết rồi xoá": lần đầu mở thư, tiêu đề gõ nhầm một dòng trịnh trọng rồi xoá đi
    rewriteEvery: false,                  // true: lần nào mở thư cũng diễn lại trò này
    wrong: 'Kính gửi Quý khách,',         // dòng viết nhầm (có thể đổi thành biệt danh trêu nhau)
    oops: 'Ấy, nghiêm túc quá!',          // câu bạn gấu thốt lên trước khi xoá (đêm khuya gấu ngủ thì thành câu nói mớ)
    postmark: true,                       // dấu bưu điện đóng lên con tem, ghi ngày giờ thư đến tay lần đầu
    postmarkLabel: 'ĐÃ ĐẾN TAY',          // chữ nhỏ trong vòng dấu (ngắn thôi, khoảng 10 ký tự)
    hello: true,                          // bạn gấu chào theo giờ trong ngày
    helloLines: {                         // câu chào theo từng khung giờ; {to} là tên người nhận
      morning: 'Chào buổi sáng, {to}!',          // 5 giờ đến 10 giờ
      noon: '{to} ăn cơm chưa?',                 // 11 giờ đến 13 giờ
      afternoon: 'Chiều rồi, uống miếng nước đi nha', // 14 giờ đến 17 giờ
      evening: 'Buổi tối vui vẻ nha {to}',       // 18 giờ đến 21 giờ
      night: 'Khuya rồi, đọc xong ngủ sớm nha'   // 22 giờ đến 4 giờ sáng (gấu đang ngủ gật thì nói câu này sau khi được chạm cho tỉnh)
    },
    sleepy: true,                         // đêm khuya (22 giờ đến 4 giờ) bạn gấu đội mũ ngủ gật; chạm vào thì gấu tỉnh, nói câu wakeLine, lát sau nói câu night (hoặc câu trêu khi mở lại)
    wakeLine: 'Ơ… {to} tới rồi hả?',      // câu bạn gấu nói khi vừa được gọi dậy
    tease: true,                          // từ lần mở thư thứ hai, bạn gấu trêu
    teaseLine: 'Lần thứ {n} mở thư rồi nha. Nhớ {from} hả?'  // {n} là số lần đã mở, {from} là tên người gửi
  },

  /* Trang ảnh: chồng ảnh kỷ niệm. Tấm ảnh ở trang ảnh thành một chồng ảnh nhỏ:
  chạm vào ảnh để lật ra mặt sau đọc lời nhắn, chạm mặt sau để sang tấm kế.
  Tấm cuối là khung trống "để dành" cho tấm ảnh chụp chung hôm lễ.
  Không điền gì thì trang dùng tấm ảnh ở pages.photo phía trên. */
  photoStack: {
    /* true: lần đầu xem, tấm ảnh đầu còn "mờ sữa", chạm 3 lần (hoặc chờ 4 giây)
       thì ảnh mới hiện rõ. false: ảnh rõ ngay từ đầu. */
    develop: true,

    /* 3 câu hiện dưới tấm ảnh mờ, lần lượt sau mỗi lần chạm.
       Câu đầu nên mời CHẠM (đừng bảo lắc điện thoại, người xem sẽ lắc máy mãi). */
    shake: ['Chạm để lắc ảnh nè!', 'Lắc nữa đi…', 'Sắp rõ rồi!'],

    /* Nhãn nhỏ dưới ô đếm, nhắc người xem chạm để lật ảnh (chỉ hiện lần đầu,
       lật một lần là tự mất). Để '' là không hiện nhãn này. */
    flipHint: 'Chạm để lật ảnh',

    /* Danh sách ảnh, tối đa 5 tấm (thừa thì trang bỏ qua). Mỗi tấm gồm:
         src     : đường dẫn ảnh, ví dụ 'assets/anh-1.jpg'
         caption : dòng chữ dưới ảnh (ngắn thôi, khoảng 20 ký tự)
         back    : lời nhắn viết ở mặt sau tấm ảnh (nên dưới khoảng 80 ký tự để
                   điện thoại nhỏ vẫn hiện đủ)
         date    : ngày ghi ở góc mặt sau, ví dụ '14.02.2024' (không bắt buộc)
         alt     : mô tả ảnh cho người dùng trình đọc màn hình (không bắt buộc)

       QUAN TRỌNG về ảnh:
       - Ảnh chụp bằng điện thoại thường rất nặng (vài MB). Mở trong Zalo hay
         Messenger, ảnh nặng có thể làm trang bị tắt ngang. Trước khi chép ảnh
         vào thư mục assets, hãy thu nhỏ mỗi ảnh còn khoảng 1000 px ở cạnh dài
         (tầm 200 KB): dùng nút "Chỉnh sửa" / "Đổi kích thước" có sẵn trong điện
         thoại, hoặc bất kỳ trang thu nhỏ ảnh trực tuyến nào.
       - Nên chọn ảnh gần vuông: ảnh được cắt thành hình vuông, ảnh quá dài
         hay quá dẹt sẽ bị mất bớt hai đầu.
       Viết {to} ở đâu thì chỗ đó hiện tên người nhận, {from} là tên bạn.

       CÁCH ĐIỀN: hai dòng mẫu bên dưới đang có hai dấu // ở đầu nên trang BỎ QUA chúng.
       Sửa thành ảnh và lời của bạn, rồi XOÁ hai dấu // ở đầu dòng đi (giữ nguyên
       dấu ngoặc { }, các dấu nháy và dấu phẩy ở cuối dòng). Muốn thêm tấm thì chép
       thêm một dòng như vậy. */
    photos: [
      // { src: 'assets/anh-1.jpg', caption: 'Lần đầu đi chơi', back: 'Hôm đó trời mưa…', date: '14.02.2024' },
      // { src: 'assets/anh-2.jpg', caption: 'Sinh nhật {to}', back: 'Cười tít mắt luôn nè!', date: '03.08.2024' },
    ],

    /* Lời nhắn mặt sau cho những tấm ảnh không ghi "back" (và cho tấm ảnh ở pages.photo
       khi danh sách photos để trống). Người nhận chạm "Chạm để lật ảnh" là đọc được dòng này,
       nên hãy viết lại bằng lời của bạn. */
    defaultBack: 'Nhìn lại tấm này là thấy thương ghê',

    /* Chữ ký nho nhỏ dưới lời nhắn ở mặt sau. Để '' là không ký. */
    sign: 'Thương, {from}',

    /* Tấm cuối: khung trống chờ ảnh chụp chung hôm lễ. Để '' là bỏ tấm này. */
    reserved: 'Để dành cho hôm đó',

    /* Lời nhắn mặt sau của tấm để dành (ngày lễ tự ghi ở góc) */
    reservedBack: 'Chỗ này chờ tấm hình chụp chung hôm lễ'
  },

  sealedLetter: {
    // LÁ THƯ BÍ MẬT ở trang đếm ngược: phong bì có dấu sáp, chỉ mở được đúng ngày lễ.
    //
    // QUAN TRỌNG: chưa viết đoạn thư nào (paragraphs để trống []) thì phong bì KHÔNG hiện,
    // trang đếm ngược giữ nguyên như cũ. Nếu thư còn chữ "Lorem ipsum" thì cũng bị ẩn,
    // để không bao giờ có chữ giữ chỗ được mở ra đúng ngày lễ.
    //
    // MUỐN XEM TRƯỚC lá thư lúc đã mở: tạm ghi unlock: '2020-01-01T00:00:00+07:00'
    // (một ngày đã qua), mở trang, xem xong thì xoá dòng đó đi (để lại unlock: '').
    // Lưu ý: lần xem trước được máy nhớ là "đã bóc"; muốn xem lại cảnh bóc dấu sáp thì
    // mở bằng một tab ẩn danh mới.

    unlock: '',                 // để trống: mở được từ 0 giờ ngày diễn ra buổi lễ (theo giờ ghi trong event.start). Hoặc ghi rõ, ví dụ '2026-11-15T06:00:00+07:00'
    tag: 'Mở vào ngày lễ',      // chữ trên thẻ treo khi thư còn khoá
    readyTag: 'Mở được rồi nè', // chữ trên thẻ khi đã tới giờ mở
    againTag: 'Đọc lại thư nè', // chữ trên thẻ sau khi đã đọc thư một lần
    teases: [                   // các câu trêu hiện lần lượt khi chạm vào thư lúc còn khoá. {days} = số ngày còn lại, {from} = tên bạn, {to} = tên người nhận
      'Chưa tới ngày mà!',
      'Còn {days} ngày nữa thôi',
      'Nhìn trộm là gấu mách {from} đó'
    ],
    title: 'Gửi {to}, đúng ngày hôm nay', // tiêu đề lá thư ({to} = tên người nhận)
    paragraphs: [               // lời thư: một đến ba đoạn ngắn, mỗi đoạn để trong dấu nháy và cách nhau bằng dấu phẩy. Thư dài hơn màn hình thì tự cuộn được
      // Bản nháp Claude viết: sửa lại cho đúng giọng của bạn nhé (giữ dấu nháy và dấu phẩy).
      'Hôm nay là ngày {from} chờ lâu lắm rồi. Cảm ơn {to} đã tới, đã ở đây, và đã nắm tay {from} suốt chặng đường vừa qua.',
      'Tấm bằng này có một nửa là công của {to} đó. Thương {to} nhiều lắm, nhiều hơn mọi chữ trong lá thư này cộng lại.'
    ],
    sign: '{from}'              // chữ ký cuối thư ({from} = tên bạn). Để trống '' thì không có chữ ký
  },

  voiceNote: {
    // Đường dẫn file ghi âm giọng của bạn, ví dụ 'assets/audio/loi-moi.m4a'.
    // Cách làm: ghi âm 10 đến 20 giây bằng điện thoại, lưu dạng .m4a (bản ghi âm của iPhone)
    // hoặc .mp3: hai dạng này phát được trên cả iPhone lẫn Android.
    // Các dạng .ogg, .amr, .3gp KHÔNG phát được trên iPhone, đừng dùng.
    // Tạo thư mục audio bên trong thư mục assets (chưa có thì tạo mới), chép file vào đó
    // rồi ghi đường dẫn vào đây. Tên file nên viết không dấu, không có dấu cách.
    // Giữ file dưới khoảng 1 MB cho trang mở nhanh.
    // Để trống '': không hiện gì cả, trang thư giữ nguyên như cũ.
    src: '',
    // Dòng chữ nhỏ phía trên tin nhắn thoại. {from} là tên người gửi, {to} là tên người nhận.
    // Tên dài mà màn hình hẹp thì tự đổi thành câu ngắn 'Nghe {from} nói nè'.
    label: 'Bấm để nghe {from} nói nè',
    // Tuỳ chọn: ghi sẵn độ dài đoạn ghi âm, ví dụ '0:12'. Để trống thì tự đo khi bấm nghe.
    duration: ''
  },

  starJar: {
    // Tiêu đề của trang lọ sao. {to} sẽ tự đổi thành tên người nhận, {from} thành tên người gửi
    title: 'Vì sao phải có {to}?',
    // Dòng nhắc dưới chiếc lọ khi lọ còn sao
    hint: 'Chạm vào lọ để lấy một ngôi sao',
    // Danh sách lý do: mỗi dòng là một ngôi sao, tối đa 8 dòng (dòng thứ 9 trở đi bị bỏ qua).
    // Ngôi sao cuối cùng màu vàng, nên để lý do quan trọng nhất ở cuối.
    // Để danh sách trống [] thì trang hiện một dải giấy "đang gấp dở" thay vì báo lỗi.
    reasons: [
      'Vì {to} cười lên là cả ngày của {from} sáng bừng',
      'Vì đi bờ hồ với {to}, vòng nào cũng thấy ngắn',
      'Vì {to} luôn nhắc {from} ăn uống đúng giờ',
      'Vì những đêm ôn thi muộn có {to} nhắn tin cổ vũ',
      'Vì nhõng nhẽo với {to} là vui nhất trên đời',
      'Vì có chuyện vui là {from} muốn khoe {to} đầu tiên',
      'Vì có {to}, mọi cố gắng đều có ý nghĩa'
    ],
    // Câu hiện ra khi đã lấy hết sao
    empty: 'Hết sao rồi, nhưng lý do thì còn nhiều lắm',
    // Lời nhắc chạm vào lọ trống để gấp sao lại từ đầu
    refill: 'Chạm để gấp sao lại vào lọ',
    // Chữ mờ trên dải giấy trước khi lấy ngôi sao đầu tiên
    waiting: 'Mỗi ngôi sao giấy giữ một lý do'
  },

  loveRace: {
    // Số giây của mỗi hiệp chạm tim (từ 1 đến 60, mặc định 8)
    seconds: 8,
    // Tiêu đề của trang trò chơi
    title: 'Ai thương nhiều hơn?',
    // Lời nhắc lúc chưa chơi. {seconds} sẽ được thay bằng số giây ở trên
    hint: 'Chạm vào tim thật nhanh trong {seconds} giây!',
    // Chữ nằm giữa trái tim lớn để mời chạm
    tap: 'Chạm!',
    // Câu hiện ra ở giữa hiệp
    faster: 'Nhanh nữa lên!',
    // Câu hiện ra khi chỉ còn 1 giây
    almost: 'Sắp hết giờ!',
    // Kết quả hiệp 1. {from} là tên người gửi (bỏ trống tên thì là "Gấu"), {to} là tên người nhận
    win: '{from} thương nhiều hơn đúng 1 tim!',
    // Kết quả hiệp 2
    again: 'Lại hơn 1 tim. Lần nào cũng vậy á!',
    // Hiệp 3: gấu chịu hòa
    tie: 'Hòa rồi! Thôi, thương bằng nhau nha',
    // Câu cuối cùng sau khi cộng tim hai đứa. {sum} là tổng số tim
    sum: 'Cộng lại là {sum} tim của hai đứa',
    // Khi người nhận bấm "Phục thù" rồi không chạm cái nào
    zero: '{to} không chạm mà vẫn được thương 1 tim nè',
    // Nhãn nút để chơi hiệp tiếp theo
    rematch: 'Phục thù',
    // Nhãn nút chơi lại từ đầu sau hiệp hòa
    replay: 'Chơi lại',
    // Viên nhỏ ở cuối trang cho biết đang ở hiệp mấy. {n} là hiệp hiện tại, {rounds} là tổng số hiệp (3)
    round: 'Hiệp {n}/{rounds}',
    // Chỉ dùng khi máy bật "giảm chuyển động": số giây còn lại hiện bằng chữ. {n} là số giây
    left: 'Còn {n} giây'
  },

  diploma: {
    // Câu dẫn ở đầu trang, phía trên bạn gấu ôm cuộn giấy
    lead: 'Khoan đã, còn một tấm bằng nữa…',
    // Lời nhắc nhỏ dưới bạn gấu, rủ người xem chạm vào cuộn giấy
    hint: 'Chạm để mở',
    // Tên tấm bằng, in hoa màu vàng kim ở đầu tờ giấy
    heading: 'BẰNG DANH DỰ',
    // Chữ nhỏ đứng ngay trước tên người nhận
    awardedTo: 'Trao cho',
    // Câu nằm giữa tên người nhận và tên khoá học
    line: 'đã hoàn thành khoá học',
    // Tên khoá học. {from} sẽ được thay bằng tên người gửi; nếu để trống tên người gửi thì tự đổi thành "Đồng hành cùng nhau"
    course: 'Đồng hành cùng {from}',
    // Bảng điểm: từ 1 đến 3 dòng (dòng thứ 4 trở đi bị bỏ qua). Người xem chạm từng dòng để đóng dấu điểm 10.
    // Để danh sách rỗng [] thì con dấu vàng rơi xuống ngay khi mở cuộn giấy
    subjects: ['Kiên nhẫn nghe than thở', 'Tiếp sức mùa thi', 'Luôn ở bên'],
    // Lời nhắc hiện ở chân tấm bằng cho tới khi chấm đủ điểm
    stampHint: 'Chạm từng dòng để chấm điểm nhé',
    // Xếp loại hiện ra khi đã đóng đủ dấu
    grade: 'Xếp loại: Xuất sắc',
    // Chữ ký ở góc dưới bên phải, viết bằng nét chữ bay bướm. {from} là tên người gửi; để '' thì không có chữ ký
    sign: '{from}'
  },

  puppyEyes: {
    /* Tiếng "ỉ ôi" rất khẽ (hai nốt nhạc đi xuống) mỗi lần bạn gấu buồn thêm một nấc
       khi người nhận bấm nút "Để nghĩ đã…".
       true = có tiếng, false = im lặng. Nếu người xem đã tắt âm thanh của trang thì cũng không kêu. */
    sound: true
  },

  pinkyPromise: {
    // Dòng chữ mời người nhận đặt ngón tay lên hộp mực (hiện sau khi bấm "Mình sẽ đến!")
    label: 'Giữ ngón tay ở đây để ngoéo tay',
    // Câu trêu khi người nhận nhả tay sớm quá
    early: 'Ơ, giữ thêm xíu nữa mà!',
    // Câu hiện sau mỗi cú chạm ngắn: chạm đủ 5 lần cũng xong. {left} = số lần chạm còn lại
    tapHint: 'Chạm thêm {left} lần nữa cũng được nha',
    // Dòng ghi nhớ sau khi ngoéo tay xong. {date} = ngày hôm đó (dd/mm)
    done: 'Đã ngoéo tay ngày {date}.',
    // Câu "phạt" vui ở dòng thứ hai. Để '' là bỏ câu phạt
    penalty: 'Ai nuốt lời phải bao trà sữa!',
    // Phải giữ bao lâu thì xong (mili giây, 1600 = 1,6 giây)
    holdMs: 1600
    // Có thể dùng {to} (tên người nhận) và {from} (tên người gửi) trong mọi câu ở trên
  },

  ticket: {
    heading: 'VÉ MỜI',
    guest: 'Khách danh dự',
    seat: 'Chỗ ngồi: Sát bên {from}',
    seatNoName: 'Chỗ ngồi: Hàng ghế đầu',       // dùng khi chưa điền tên người gửi (trống hoặc toàn dấu cách)
    number: 'Số vé: 0001/0001',
    gate: 'Vào cổng bằng một nụ cười',
    stampPromise: 'ĐÃ NGOÉO TAY',
    stampYes: 'ĐÃ NHẬN LỜI',
    keep: 'Chụp màn hình lại làm kỷ niệm nha',
    clerk: 'Vé xinh ra lò nè!'                 // lời bạn gấu soát vé; để '' thì ẩn bong bóng lời
    // Để trống '' một dòng thì dòng đó ẩn; mọi dòng trong một khối đều trống thì ẩn cả khối
  },

  marginBears: {
    // Đôi gấu tí hon ở lề dưới mỗi trang: mỗi trang nhích lại gần nhau một bước,
    // tới trang lời mời cuối thì chạm má nhau. Không cần chỉnh gì, mục này có thể bỏ trống.
    heart: true        // trái tim đập phía trên khi hai bạn gấu gặp nhau (true = có, false = không vẽ tim)
  },

  /* Chuyển tua mũ cho gấu (ở bìa sau).
  Người nhận chạm vào đôi gấu để chuyển tua mũ sang bên kia, giống nghi thức chuyển tua lúc nhận bằng.
  Chuyển tua xong thì mọi bạn gấu đội mũ trong thư đều đeo tua ở bên "đã tốt nghiệp",
  mở lại link vẫn giữ nguyên.
  Viết {to} / {from} ở đâu thì chỗ đó hiện tên người nhận / tên bạn.
  Nên viết ngắn (khoảng 30 chữ cái trở lại). Lưu ý: {to} được thay bằng tên thật,
  tên đầy đủ thường dài nên câu có {to} dễ thành 2 dòng; trên điện thoại nhỏ
  đôi gấu sẽ phải thu nhỏ lại để nhường chỗ. Dài quá nữa sẽ bị cắt còn 2 dòng.
  Muốn tắt hẳn tính năng này: đổi tassel: true thành tassel: false trong mục "features" ở trên. */
  tassel: {
    /* Câu trong bong bóng TRƯỚC khi chuyển tua (lời gấu nhờ). Để trống '' thì không hiện bong bóng. */
    ask: 'Chuyển tua mũ giúp gấu nha',

    /* Câu trong bong bóng SAU khi chuyển tua (lời chúc mừng). Để trống '' thì không hiện bong bóng. */
    done: 'Chính thức tốt nghiệp rồi!'
  }
  /* ===== CÁC TÍNH NĂNG ĐÁNG YÊU THÊM (kết thúc) ===== */
};
