import type { LocationGuide } from './guide-content.ts';

export const GUIDES_PART2: Record<string, { el: LocationGuide; bg: LocationGuide; sr: LocationGuide; tr: LocationGuide }> = {

  // ── GUIDE 1: skala-potamias ────────────────────────────────────────────────
  'skala-potamias': {
    el: {
      intro: 'Η Σκάλα Ποταμιάς είναι το κύριο χωριό στην Χρυσή Αμμουδιά — η καλύτερη οικογενειακή παραλία της Ελλάδας εκτείνεται από εδώ προς τα βόρεια. Ένα ζωντανό παραλιακό μέτωπο με εξαιρετικές ταβέρνες και όλες τις ανέσεις.',
      bestTime: 'Ιούνιος και αρχές Σεπτεμβρίου για την καλύτερη εμπειρία.',
      activities: [
        {
          name: 'Χρυσή Αμμουδιά',
          description: 'Το κεντρικό αξιοθέατο — 1,5 χλμ. βραβευμένης αμμώδους παραλίας με ρηχά κρυστάλλινα νερά. Μία από τις καλύτερες παραλίες της Ελλάδας.',
          category: 'beach',
        },
        {
          name: 'Θαλάσσια Σπορ',
          description: 'Κανό, ποδήλατο θαλάσσης, σανίδα SUP και ενοικίαση jet ski από την παραλία.',
          category: 'watersport',
          priceRange: '€€',
        },
        {
          name: 'Χωριό Παναγία',
          description: 'Οδηγήστε 10 λεπτά ανηφορικά προς το πιο όμορφο ενδοχωρικό χωριό της Θάσου. Καλντερίμια, πέτρινα σπίτια, φυσική πηγή.',
          category: 'culture',
        },
        {
          name: 'Χωριό Ποταμιά & Μουσείο',
          description: 'Καταπράσινο χωριό 3 χλμ. στο εσωτερικό. Εδώ βρίσκεται το γλυπτικό μουσείο Πολύγνωτου Βάγη.',
          category: 'culture',
          priceRange: '€',
        },
      ],
      dining: [
        {
          name: 'Παραλιακές ταβέρνες',
          description: 'Εξαιρετικό φρέσκο ψάρι και ελληνικές γεύσεις σε τραπέζια ουσιαστικά στην άμμο.',
          type: 'taverna',
          priceRange: '€€',
        },
        {
          name: 'Εστιατόριο Μώλος',
          description: 'Δημοφιλές παραλιακό εστιατόριο για φρέσκο ψάρι και θαλασσινά.',
          type: 'restaurant',
          priceRange: '€€',
        },
      ],
      gettingAround: [
        'Η παραλία και το κέντρο του χωριού είναι όλα σε κοντινή απόσταση με τα πόδια.',
        'Αυτοκίνητο χρειάζεται για το χωριό Παναγία, το Λιμένα (20 λεπτά) ή τη νότια ακτή.',
        'Περιορισμένη λεωφορειακή σύνδεση — συνιστάται ιδιαίτερα να έχετε δικό σας όχημα.',
      ],
      tips: [
        'Η Σκάλα Ποταμιάς έχει τις περισσότερες ανέσεις (σούπερ μάρκετ, ΑΤΜ, φαρμακείο) σε σύγκριση με το βόρειο άκρο.',
        'Ο Αύγουστος είναι εξαιρετικά πολυσύχναστος — σκεφτείτε να επισκεφθείτε τον Ιούνιο ή τον Σεπτέμβριο.',
      ],
    },
    bg: {
      intro: 'Скала Потамия е главното село на Златен плаж — най-добрият семеен плаж в Гърция се простира оттук на север. Оживен крайбрежен фронт с отлични таверни и всички удобства.',
      bestTime: 'Юни и началото на септември за най-добро изживяване.',
      activities: [
        {
          name: 'Златен плаж',
          description: 'Главната атракция — 1,5 км. отличен пясъчен плаж с плитка кристална вода. Един от най-добрите плажове в Гърция.',
          category: 'beach',
        },
        {
          name: 'Водни спортове',
          description: 'Каяк, педало, съп борд и случайно отдаване под наем на джет ски от плажа.',
          category: 'watersport',
          priceRange: '€€',
        },
        {
          name: 'Село Панагия',
          description: 'Карайте 10 минути нагоре до най-красивото вътрешно село в Тасос. Калдъръмени улици, каменни къщи, природен извор.',
          category: 'culture',
        },
        {
          name: 'Село Потамия и музей',
          description: 'Зелено село на 3 км навътре. Дом на скулптурния музей "Полигнотос Вагис".',
          category: 'culture',
          priceRange: '€',
        },
      ],
      dining: [
        {
          name: 'Плажни таверни',
          description: 'Отлична прясна риба и гръцка кухня на маси практически върху пясъка.',
          type: 'taverna',
          priceRange: '€€',
        },
        {
          name: 'Ресторант Молос',
          description: 'Популярно крайбрежно място за прясна риба и морски дарове.',
          type: 'restaurant',
          priceRange: '€€',
        },
      ],
      gettingAround: [
        'Плажът и центърът на селото са достъпни пеша.',
        'Необходима е кола за село Панагия, Лименас (20 мин.) или южното крайбрежие.',
        'Ограничено автобусно обслужване — силно се препоръчва собствено превозно средство.',
      ],
      tips: [
        'Скала Потамия има най-много удобства (супермаркет, банкомат, аптека) в сравнение с северния край.',
        'Август е изключително натоварен — помислете за посещение през юни или септември.',
      ],
    },
    sr: {
      intro: 'Скала Потамија је главно село на Златној плажи — најбоља породична плажа у Грчкој протеже се одавде ка северу. Живахан приобални фронт са одличним кафанама и свим садржајима.',
      bestTime: 'Јун и почетак септембра за најбоље искуство.',
      activities: [
        {
          name: 'Златна плажа',
          description: 'Главна атракција — 1,5 km награђиване пешчане плаже са плитком кристалном водом. Једна од најбољих плажа у Грчкој.',
          category: 'beach',
        },
        {
          name: 'Водени спортови',
          description: 'Кајак, педало, сап борд и повремено изнајмљивање џет скија са плаже.',
          category: 'watersport',
          priceRange: '€€',
        },
        {
          name: 'Село Панагија',
          description: 'Возите 10 минута узбрдо до најлепшег унутрашњег села на Тасосу. Калдрма, камене куће, природни извор.',
          category: 'culture',
        },
        {
          name: 'Село Потамија и музеј',
          description: 'Зелено село 3 km у унутрашњости. Дом скулптурног музеја Полигнотоса Вагиса.',
          category: 'culture',
          priceRange: '€',
        },
      ],
      dining: [
        {
          name: 'Плажне кафане',
          description: 'Одлична свежа риба и грчке специјалитети за столовима практично на песку.',
          type: 'taverna',
          priceRange: '€€',
        },
        {
          name: 'Ресторан Молос',
          description: 'Популарно приобално место за свежу рибу и морске плодове.',
          type: 'restaurant',
          priceRange: '€€',
        },
      ],
      gettingAround: [
        'Плажа и центар села су на пешачкој удаљености.',
        'Потребан је ауто за село Панагија, Лименас (20 мин.) или јужну обалу.',
        'Ограничена аутобусна услуга — власништво возила је веома препоручљиво.',
      ],
      tips: [
        'Скала Потамија има највише садржаја (супермаркет, банкомат, апотека) у поређењу са северним крајем.',
        'Август је изузетно промет — размислите о посети у јуну или септембру.',
      ],
    },
    tr: {
      intro: "Skala Potamias, Altın Plaj'ın ana köyüdür — Yunanistan'ın en güzel aile plajı buradan kuzeye doğru uzanmaktadır. Mükemmel tavernalar ve tüm olanaklarıyla canlı bir sahil cephesi.",
      bestTime: 'En iyi deneyim için Haziran ve Eylül başı.',
      activities: [
        {
          name: 'Altın Plaj',
          description: "Ana etkinlik — sığ kristal suyu olan 1,5 km'lik ödüllü kumlu plaj. Yunanistan'ın en iyilerinden biri.",
          category: 'beach',
        },
        {
          name: 'Su Sporları',
          description: "Plajdan kayak, pedalo, kürek sörfü ve ara sıra jet ski kiralama.",
          category: 'watersport',
          priceRange: '€€',
        },
        {
          name: 'Panagia Köyü',
          description: "Tasos'taki en güzel iç köye gitmek için 10 dakika yokuş çıkın. Arnavut kaldırımları, taş evler, doğal kaynak.",
          category: 'culture',
        },
        {
          name: 'Potamia Köyü ve Müzesi',
          description: "İç kesimlerde 3 km uzaklıkta yemyeşil bir köy. Polygnotos Vagis heykel müzesinin evidir.",
          category: 'culture',
          priceRange: '€',
        },
      ],
      dining: [
        {
          name: 'Plaj Tavernaları',
          description: "Neredeyse kumun üzerindeki masalarda mükemmel taze balık ve Yunan klasikleri.",
          type: 'taverna',
          priceRange: '€€',
        },
        {
          name: 'Molos Restoranı',
          description: "Taze balık ve deniz ürünleri için popüler sahil mekanı.",
          type: 'restaurant',
          priceRange: '€€',
        },
      ],
      gettingAround: [
        "Plaj ve köy merkezi tamamen yürüme mesafesindedir.",
        "Panagia köyü, Limenas (20 dak.) veya güney kıyısı için araba gereklidir.",
        "Sınırlı otobüs servisi — kendi aracınızın olması kesinlikle önerilir.",
      ],
      tips: [
        "Skala Potamias köyü, kuzey uca kıyasla en fazla olanaklara (süpermarket, ATM, eczane) sahiptir.",
        "Ağustos son derece yoğundur — Haziran veya Eylül'de ziyaret etmeyi düşünün.",
      ],
    },
  },

  // ── GUIDE 2: panagia-thassos ───────────────────────────────────────────────
  'panagia-thassos': {
    el: {
      intro: 'Η Παναγία είναι το πιο όμορφο ενδοχωρικό χωριό της Θάσου — πέτρινα σπίτια, καλντερίμια, κεντρική πλατεία με φυσική πηγή και τα πιο εντυπωσιακά θέα κοιλάδας στο νησί. Σε απόσταση 10 λεπτών οδήγησης πάνω από την Χρυσή Αμμουδιά.',
      bestTime: 'Όλο το χρόνο. Η άνοιξη και το φθινόπωρο είναι ιδιαίτερα όμορφα με αγριολούλουδα ή φθινοπωρινά χρώματα.',
      activities: [
        {
          name: 'Κεντρική Πλατεία & Κρήνη',
          description: 'Η καρδιά της Παναγίας — τρεχούμενο νερό πηγής, πλατάνια, παραδοσιακά καφενεία. Το πιο αυθεντικό ελληνικό χωριό της Θάσου.',
          tip: 'Το νερό της πηγής είναι κρύο και νόστιμο — γεμίστε το μπουκάλι σας εδώ.',
          category: 'culture',
        },
        {
          name: 'Βόλτα στα Καλντερίμια',
          description: 'Περιπλανηθείτε στα στενά πέτρινα σοκάκια, ανάμεσα σε ανθισμένα μπαλκόνια και παραδοσιακά σπίτια. Αφιερώστε 45–60 λεπτά.',
          category: 'culture',
        },
        {
          name: 'Ηλιοβασίλεμα με Θέα Κοιλάδας',
          description: 'Η ταράτσα πάνω από το χωριό κοιτά κάτω στη Χρυσή Αμμουδιά και ολόκληρη την ανατολική ακτή. Το καλύτερο σημείο για ηλιοβασίλεμα στην ανατολική Θάσο.',
          tip: 'Φτάστε 30 λεπτά πριν το ηλιοβασίλεμα.',
          category: 'nature',
        },
        {
          name: 'Μονοπάτι Πεζοπορίας προς Χρυσή Αμμουδιά',
          description: 'Ένα σηματοδοτημένο μονοπάτι κατεβαίνει μέσα από πευκοδάσος στην παραλία (1,5 χλμ., 30 λεπτά). Κατεβείτε πεζοπορώντας, κολυμπήστε, γυρίστε με ταξί ή με οτοστόπ.',
          category: 'hike',
        },
        {
          name: 'Τοπικά Καταστήματα Χειροτεχνίας',
          description: 'Μικρά μαγαζιά που πωλούν τοπικό μέλι, ελαιόλαδο, βότανα και χειροποίητη κεραμική — εξαιρετικά για δώρα.',
          category: 'shopping',
          priceRange: '€',
        },
      ],
      dining: [
        {
          name: 'Ταβέρνες βουνού',
          description: 'Αρκετές παραδοσιακές ταβέρνες με θέα κοιλάδας και θάλασσας. Ψητά κρέατα, τοπικό κρασί, απλή ελληνική κουζίνα στο καλύτερό της.',
          type: 'taverna',
          priceRange: '€',
        },
        {
          name: 'Καφενείο χωριού',
          description: 'Παραδοσιακό καφενείο στην κεντρική πλατεία — η πιο αυθεντική ελληνική εμπειρία στο νησί.',
          type: 'cafe',
          priceRange: '€',
        },
      ],
      gettingAround: [
        'Η Παναγία απέχει 10 λεπτά με αυτοκίνητο από τη Χρυσή Αμμουδιά (απότομος ανηφορικός δρόμος).',
        'Το χωριό εξερευνάται αποκλειστικά πεζή — δεν υπάρχουν αυτοκίνητα στα στενά σοκάκια.',
        'Ένα μονοπάτι πεζοπορίας συνδέει με τη Χρυσή Αμμουδιά (1,5 χλμ. κατηφόρα).',
      ],
      tips: [
        'Επισκεφθείτε το βράδυ όταν οι ημερήσιοι επισκέπτες έχουν φύγει — η ατμόσφαιρα μεταμορφώνεται.',
        'Η κρήνη ρέει αδιάκοπα εδώ και αιώνες — φέρτε ένα μπουκάλι νερό.',
        'Το τοπικό μέλι από το χωριό Παναγία είναι εξαιρετικό — αγοράστε ένα βαζάκι από οποιοδήποτε μικρό κατάστημα.',
        'Μερικά σοκάκια είναι πολύ ανηφορικά — απαραίτητα άνετα παπούτσια.',
      ],
    },
    bg: {
      intro: 'Панагия е най-красивото вътрешно село на Тасос — каменни къщи, калдъръмени алеи, централен площад с природен извор и най-зашеметяващите гледки към долината на острова. На 10 минути с кола над Златен плаж.',
      bestTime: 'През цялата година. Пролетта и есента са особено красиви с диви цветя или есенни цветове.',
      activities: [
        {
          name: 'Централен площад и фонтан с извор',
          description: 'Сърцето на Панагия — течаща изворна вода, чинари, традиционни кафенета. Най-характерната гръцка картина на острова.',
          tip: 'Изворната вода е студена и вкусна — напълнете бутилката тук.',
          category: 'culture',
        },
        {
          name: 'Разходка по калдъръмените алеи',
          description: 'Разходете се по тесните каменни улички покрай цъфтящи балкони и традиционни къщи. Отделете 45–60 минути.',
          category: 'culture',
        },
        {
          name: 'Залез с гледка към долината',
          description: 'Терасата над селото гледа надолу към Златен плаж и цялото източно крайбрежие. Най-доброто място за залез в източен Тасос.',
          tip: 'Пристигнете 30 минути преди залеза.',
          category: 'nature',
        },
        {
          name: 'Туристическа пътека до Златен плаж',
          description: 'Маркирана пътека слиза през борова гора до плажа (1,5 км, 30 мин.). Слезте пеша, поплувайте, върнете се с такси или автостоп.',
          category: 'hike',
        },
        {
          name: 'Местни занаятчийски магазини',
          description: 'Малки магазинчета с местен мед, зехтин, билки и ръчно изработена керамика — отлични за подаръци.',
          category: 'shopping',
          priceRange: '€',
        },
      ],
      dining: [
        {
          name: 'Планински таверни',
          description: 'Няколко традиционни таверни с гледка към долината и морето. Скара, местно вино, проста гръцка кухня в най-добрия си вид.',
          type: 'taverna',
          priceRange: '€',
        },
        {
          name: 'Селско кафене',
          description: 'Традиционно кафене на централния площад — най-автентичното гръцко преживяване на острова.',
          type: 'cafe',
          priceRange: '€',
        },
      ],
      gettingAround: [
        'Панагия е на 10 минути с кола от Златен плаж (стръмен нагорнищ път).',
        'Самото село е изцяло пешеходно — няма коли в тесните алеи.',
        'Туристическа пътека свързва с Златен плаж (1,5 км надолу).',
      ],
      tips: [
        'Посетете вечерта, когато еднодневните туристи са тръгнали — атмосферата се преобразява.',
        'Фонтанът с извор тече непрекъснато от векове — вземете си бутилка вода.',
        'Местният мед от село Панагия е отличен — купете буркан от някой малък магазин.',
        'Някои алеи са много стръмни — удобните обувки са задължителни.',
      ],
    },
    sr: {
      intro: 'Панагија је најлепше унутрашње село Тасоса — камене куће, калдрмисане алеје, централни трг са природним извором и најдраматичнији поглед на долину на острву. Десет минута вожње изнад Златне плаже.',
      bestTime: 'Током целе године. Пролеће и јесен су посебно лепи са дивљим цвећем или јесењим бојама.',
      activities: [
        {
          name: 'Централни трг и чесма',
          description: 'Срце Панагије — текућа изворска вода, платани, традиционалне кафане. Најтипичнија грчка слика на острву.',
          tip: 'Изворска вода је хладна и укусна — напуните боцу овде.',
          category: 'culture',
        },
        {
          name: 'Шетња калдрмисаним алејама',
          description: 'Лутајте уским каменим улицама, поред цветних балкона и традиционалних кућа. Издвојите 45–60 минута.',
          category: 'culture',
        },
        {
          name: 'Залазак сунца са погледом на долину',
          description: 'Тераса изнад села гледа доле на Златну плажу и целу источну обалу. Најбоља тачка за залазак сунца у источном Тасосу.',
          tip: 'Стигните 30 минута пре заласка.',
          category: 'nature',
        },
        {
          name: 'Пешачка стаза до Златне плаже',
          description: 'Означена стаза спушта се кроз борову шуму до плаже (1,5 km, 30 мин.). Сиђите пешке, купајте се, вратите се таксијем или аутостопом.',
          category: 'hike',
        },
        {
          name: 'Локалне занатске радње',
          description: 'Мале продавнице са локалним медом, маслиновим уљем, биљем и ручно израђеном керамиком — одлично за поклоне.',
          category: 'shopping',
          priceRange: '€',
        },
      ],
      dining: [
        {
          name: 'Планинске кафане',
          description: 'Неколико традиционалних кафана са погледом на долину и море. Роштиљ, локално вино, једноставна грчка кухиња у најбољем издању.',
          type: 'taverna',
          priceRange: '€',
        },
        {
          name: 'Сеоска кафана',
          description: 'Традиционална кафана на централном тргу — најаутентичније грчко искуство на острву.',
          type: 'cafe',
          priceRange: '€',
        },
      ],
      gettingAround: [
        'Панагија је 10 минута аутом од Златне плаже (стрм узбрдни пут).',
        'Само село је потпуно пешачко — нема аутомобила у уским алејама.',
        'Пешачка стаза повезује са Златном плажом (1,5 km низбрдо).',
      ],
      tips: [
        'Посетите увече када дневни туристи оду — атмосфера се потпуно мења.',
        'Чесма непрекидно тече вековима — понесите боцу воде.',
        'Локални мед из села Панагија је одличан — купите теглицу у некој малој продавници.',
        'Неке алеје су веома стрме — удобна обућа је неопходна.',
      ],
    },
    tr: {
      intro: "Panagia, Tasos'un en güzel iç köyüdür — taş evler, taş kaldırımlı yollar, doğal kaynaklı merkezi meydan ve adanın en dramatik vadi manzaraları. Altın Plaj'ın 10 dakika yukarısında.",
      bestTime: "Tüm yıl boyunca. İlkbahar ve sonbahar, yabani çiçekler veya sonbahar renkleriyle özellikle güzeldir.",
      activities: [
        {
          name: 'Merkezi Meydan ve Kaynak Çeşmesi',
          description: "Panagia'nın kalbi — akan kaynak suyu, çınar ağaçları, geleneksel kahvehaneler. Tasos'taki en özgün Yunan köyü manzarası.",
          tip: 'Kaynak suyu soğuk ve lezzetlidir — şişenizi buradan doldurun.',
          category: 'culture',
        },
        {
          name: 'Taş Kaldırım Yürüyüşü',
          description: 'Çiçekli balkonlar ve geleneksel evlerin arasındaki dar taş yolları dolaşın. 45–60 dakika ayırın.',
          category: 'culture',
        },
        {
          name: 'Vadi Manzaralı Gün Batımı',
          description: "Köyün üzerindeki teras, Altın Plaj ve tüm doğu kıyısına bakar. Doğu Tasos'taki en iyi gün batımı noktası.",
          tip: 'Günbatımından 30 dakika önce gelin.',
          category: 'nature',
        },
        {
          name: "Altın Plaj'a Yürüyüş Parkuru",
          description: 'İşaretli bir parkur çam ormanı içinden plaja iner (1,5 km, 30 dak.). Yürüyerek inin, yüzün, taksiyle veya otostopla geri dönün.',
          category: 'hike',
        },
        {
          name: 'Yerel El Sanatları Dükkanları',
          description: 'Yerel bal, zeytinyağı, otlar ve el yapımı seramik satan küçük dükkanlar — hediye için mükemmel.',
          category: 'shopping',
          priceRange: '€',
        },
      ],
      dining: [
        {
          name: 'Dağ Tavernaları',
          description: 'Vadi ve deniz manzaralı çeşitli geleneksel tavernalar. Izgara etler, yerel şarap, en saf haliyle basit Yunan yemeği.',
          type: 'taverna',
          priceRange: '€',
        },
        {
          name: 'Köy Kahvehanesi',
          description: "Merkezi meydandaki eski usul kahvehane — adanın en özgün Yunan deneyimi.",
          type: 'cafe',
          priceRange: '€',
        },
      ],
      gettingAround: [
        "Panagia, Altın Plaj'dan 10 dakika arabayla uzaktadır (dik yokuş yol).",
        "Köyün kendisi tamamen yayaya aittir — dar yollarda araba yoktur.",
        "Altın Plaj'a bir yürüyüş parkuru bağlanmaktadır (1,5 km aşağı).",
      ],
      tips: [
        "Günübirlikçiler gittikten sonra akşamüstü ziyaret edin — atmosfer değişir.",
        "Kaynak çeşmesi yüzyıllardır kesintisiz akmaktadır — su şişesi getirin.",
        "Panagia köyünden yerel bal mükemmeldir — herhangi bir küçük dükkandan bir kavanoz alın.",
        "Bazı yollar çok diktir — rahat ayakkabı şarttır.",
      ],
    },
  },

  // ── GUIDE 3: theologos ────────────────────────────────────────────────────
  'theologos': {
    el: {
      intro: 'Ο Θεολόγος ήταν η παλιά πρωτεύουσα της Θάσου — ένα καλοδιατηρημένο ορεινό χωριό με αρχιτεκτονική της Οθωμανικής εποχής, εργαστήρια χειροτεχνίας, παραγωγή μελιού και ελαιολάδου. Μια συναρπαστική πολιτιστική στάση μακριά από τις παραλίες.',
      bestTime: 'Μάιος–Οκτώβριος. Η άνοιξη και το πρώτο καλοκαίρι είναι τα πιο ατμοσφαιρικά.',
      activities: [
        {
          name: 'Εξερεύνηση Χωριού',
          description: 'Περπατήστε τον κεντρικό δρόμο με τα παλιά αρχοντικά, τα καταστήματα χειροτεχνίας και τις μικρές εκκλησίες. Αφιερώστε 1–2 ώρες.',
          category: 'culture',
        },
        {
          name: 'Γευσιγνωσία Μελιού & Ελαιολάδου',
          description: 'Αρκετοί μικροί παραγωγοί προσφέρουν γευστικές δοκιμές και πωλούν απευθείας τα προϊόντα τους. Το καλύτερο ποιοτικό μέλι στο νησί.',
          category: 'food',
          priceRange: '€',
        },
        {
          name: 'Ορεινή Πεζοπορία',
          description: 'Μονοπάτια οδηγούν στα πευκοδάση πάνω από το χωριό. Ρωτήστε στο καφενείο για τις τρέχουσες συνθήκες των μονοπατιών.',
          category: 'hike',
        },
        {
          name: 'Παραδοσιακές Χειροτεχνίες',
          description: 'Εργαστήρια ξυλογλυπτικής, υφαντικής και κεραμικής εξακολουθούν να λειτουργούν στο χωριό.',
          category: 'shopping',
        },
      ],
      dining: [
        {
          name: 'Ταβέρνες βουνού',
          description: 'Απλό, χορταστικό ελληνικό ορεινό φαγητό — ψητό αρνί, χωριάτικη σαλάτα, τοπικό κρασί. Πολύ προσιτές τιμές.',
          type: 'taverna',
          priceRange: '€',
        },
        {
          name: 'Καφενείο χωριού',
          description: 'Παραδοσιακό ελληνικό καφενείο στην κεντρική πλατεία — το κοινωνικό κέντρο του χωριού.',
          type: 'cafe',
          priceRange: '€',
        },
      ],
      gettingAround: [
        'Ο Θεολόγος απέχει 30 λεπτά με αυτοκίνητο από το Πόρτο, στο εσωτερικό της νότιας ακτής.',
        'Αυτοκίνητο είναι απαραίτητο — δεν υπάρχει τακτική λεωφορειακή σύνδεση.',
      ],
      tips: [
        'Αγοράστε τοπικό θυμαρίσιο μέλι εδώ — σαφώς καλύτερο από οτιδήποτε θα βρείτε στα σούπερ μάρκετ.',
        'Το χωριό είναι πιο δροσερό από την ακτή το καλοκαίρι — ιδανική απόδραση τις μεσημεριανές ώρες.',
        'Τα περισσότερα καταστήματα χειροτεχνίας και ταβέρνες κλείνουν για μεσημεριανό διάλειμμα (14:00–17:30).',
      ],
    },
    bg: {
      intro: 'Теологос е бившата столица на Тасос — добре запазено планинско село с архитектура от османската епоха, занаятчийски работилници, производство на мед и зехтин. Вълнуващо културно спиране далеч от плажовете.',
      bestTime: 'Май–октомври. Пролетта и началото на лятото са най-атмосферни.',
      activities: [
        {
          name: 'Разглеждане на селото',
          description: 'Разходете се по главната улица, наредена с стари особняци, занаятчийски магазини и малки църкви. Отделете 1–2 часа.',
          category: 'culture',
        },
        {
          name: 'Дегустация на мед и зехтин',
          description: 'Няколко малки производители предлагат дегустации и продават продуктите си директно. Най-качественият мед на острова.',
          category: 'food',
          priceRange: '€',
        },
        {
          name: 'Планински туризъм',
          description: 'Пътеки водят в боровите гори над селото. Попитайте в кафенето за текущото състояние на пътеките.',
          category: 'hike',
        },
        {
          name: 'Традиционни занаяти',
          description: 'Работилници за дърворезба, тъкачество и грънчарство все още действат в селото.',
          category: 'shopping',
        },
      ],
      dining: [
        {
          name: 'Планински таверни',
          description: 'Проста, засищаща гръцка планинска храна — агнешко на скара, селска салата, местно вино. Много достъпни цени.',
          type: 'taverna',
          priceRange: '€',
        },
        {
          name: 'Селско кафене',
          description: 'Традиционно гръцко кафене на централния площад — социалният център на селото.',
          type: 'cafe',
          priceRange: '€',
        },
      ],
      gettingAround: [
        'Теологос е на 30 минути с кола от Потос, навътре от южното крайбрежие.',
        'Колата е задължителна — няма редовна автобусна услуга.',
      ],
      tips: [
        'Купете тук местен мед от мащерка — значително по-добър от всичко, което ще намерите в супермаркетите.',
        'Селото е по-хладно от крайбрежието през лятото — добро бягство по обяд.',
        'Повечето занаятчийски магазини и таверни затварят за следобедна почивка (14:00–17:30).',
      ],
    },
    sr: {
      intro: 'Теологос је био стара престоница Тасоса — добро очувано планинско село са архитектуром из osmanskog доба, занатским радионицама, производњом меда и маслиновог уља. Занимљива културна станица далеко од плажа.',
      bestTime: 'Мај–октобар. Пролеће и рано лето су најатмосфернији.',
      activities: [
        {
          name: 'Истраживање села',
          description: 'Прошетајте главном улицом са старим дворцима, занатским радњама и малим црквама. Издвојите 1–2 сата.',
          category: 'culture',
        },
        {
          name: 'Дегустација меда и маслиновог уља',
          description: 'Неколико малих произвођача нуди дегустације и продаје своје производе директно. Најквалитетнији мед на острву.',
          category: 'food',
          priceRange: '€',
        },
        {
          name: 'Планинско пешачење',
          description: 'Стазе воде у борове шуме изнад села. Питајте у кафани за тренутно стање стаза.',
          category: 'hike',
        },
        {
          name: 'Традиционални занати',
          description: 'Радионице резбарења, ткања и грнчарства и даље раде у селу.',
          category: 'shopping',
        },
      ],
      dining: [
        {
          name: 'Планинске кафане',
          description: 'Једноставна, издашна грчка планинска храна — јагњетина на роштиљу, сеоска салата, локално вино. Веома приступачне цене.',
          type: 'taverna',
          priceRange: '€',
        },
        {
          name: 'Сеоска кафана',
          description: 'Традиционална грчка кафана на централном тргу — друштвени центар села.',
          type: 'cafe',
          priceRange: '€',
        },
      ],
      gettingAround: [
        'Теологос је 30 минута аутом од Потоса, у унутрашњости од јужне обале.',
        'Ауто је неопходан — нема редовне аутобусне линије.',
      ],
      tips: [
        'Купите овде локални мед од мајчине душице — знатно бољи од свега што ћете наћи у супермаркетима.',
        'Село је хладније од обале лети — добро подневно уточиште.',
        'Већина занатских радњи и кафана затвара за поподневну паузу (14:00–17:30).',
      ],
    },
    tr: {
      intro: "Theologos, Tasos'un eski başkentiydi — Osmanlı dönemi mimarisi, zanaat atölyeleri, bal ve zeytinyağı üretimiyle iyi korunmuş bir dağ köyü. Plajlardan uzakta büyüleyici bir kültür durağı.",
      bestTime: "Mayıs–Ekim. İlkbahar ve yaz başı en atmosferik dönemlerdir.",
      activities: [
        {
          name: 'Köy Keşfi',
          description: 'Eski konaklar, zanaat dükkanları ve küçük kiliselerle kaplı ana caddeyi yürüyün. 1–2 saat ayırın.',
          category: 'culture',
        },
        {
          name: 'Bal ve Zeytinyağı Tadımı',
          description: 'Birkaç küçük üretici tadım sunar ve ürünlerini doğrudan satar. Adadaki en kaliteli bal.',
          category: 'food',
          priceRange: '€',
        },
        {
          name: 'Dağ Yürüyüşü',
          description: "Köyün üzerindeki çam ormanlarına yürüyüş parkurları uzanmaktadır. Mevcut parkur koşulları için kahvehanede sorun.",
          category: 'hike',
        },
        {
          name: 'Geleneksel El Sanatları',
          description: 'Köyde hâlâ aktif olan ahşap oyma, dokuma ve çömlek atölyeleri.',
          category: 'shopping',
        },
      ],
      dining: [
        {
          name: 'Dağ Tavernaları',
          description: 'Sade, doyurucu Yunan dağ yemeği — ızgara kuzu, köy salatası, yerel şarap. Çok uygun fiyatlı.',
          type: 'taverna',
          priceRange: '€',
        },
        {
          name: 'Köy Kahvehanesi',
          description: "Merkezi meydandaki geleneksel Yunan kahvehanesi — köyün sosyal merkezi.",
          type: 'cafe',
          priceRange: '€',
        },
      ],
      gettingAround: [
        "Theologos, güney kıyısından iç kesimlerde Potos'tan 30 dakika arabayla uzaktadır.",
        "Araba şarttır — düzenli otobüs servisi yoktur.",
      ],
      tips: [
        "Buradan yerel kekik balı alın — süpermarketlerde bulacaklarınızdan çok daha iyidir.",
        "Köy yazın kıyıdan daha serindir — öğleden sonra kaçmak için iyi bir yer.",
        "Çoğu zanaat dükkanı ve taverna öğleden sonra kapanır (14:00–17:30).",
      ],
    },
  },

  // ── GUIDE 4: alyki ────────────────────────────────────────────────────────
  'alyki': {
    el: {
      intro: 'Η Αλυκή είναι ένα από τα πιο μοναδικά μέρη της Θάσου — δύο κόλποι με κρυστάλλινα νερά με τα ερείπια ενός αρχαίου μαρμαρόλατομου να υψώνονται από τα βράχια ανάμεσά τους. Η κολύμβηση ανάμεσα σε αρχαία τμήματα κιόνων είναι μια εξαιρετική εμπειρία.',
      bestTime: 'Μάιος–Ιούνιος και Σεπτέμβριος — πιο δροσερά, λιγότερο πολυσύχναστα, πιο εύκολη στάθμευση.',
      activities: [
        {
          name: 'Κολύμβηση στους Διπλούς Κόλπους',
          description: 'Δύο κόλποι δίπλα δίπλα με κρυστάλλινο νερό. Ο αριστερός έχει περισσότερη σκιά, ο δεξιός είναι πιο εντυπωσιακός.',
          tip: 'Ο δεξιός κόλπος (βόρειος) έχει τα ερείπια του αρχαίου λατομείου — κολυμπήστε εκεί.',
          category: 'beach',
        },
        {
          name: 'Κατάδυση με Αναπνευστήρα',
          description: 'Το νερό είναι εντυπωσιακά διαυγές. Αρχαία μαρμάρινα τεμάχια βρίσκονται ακριβώς κάτω από την επιφάνεια κοντά στα ερείπια του λατομείου.',
          category: 'watersport',
        },
        {
          name: 'Αρχαίο Μαρμαρόλατομο',
          description: 'Δωρεάν εξερεύνηση των ερειπίων ενός λατομείου του 5ου αι. π.Χ. — κίονες, σκαλιστά τεμάχια, το αρχαίο τείχος του λιμανιού.',
          category: 'culture',
        },
        {
          name: 'Βόλτα Ηλιοβασιλέματος',
          description: 'Περπατήστε τον βραχώδη ακρωτήριο ανάμεσα στους δύο κόλπους κατά το ηλιοβασίλεμα — ένα από τα πιο ρομαντικά σημεία της Θάσου.',
          category: 'nature',
        },
      ],
      dining: [
        {
          name: 'Ταβέρνα παραλίας Αλυκής',
          description: 'Μοναδική ταβέρνα στην παραλία — φρέσκο ψάρι και κρύα ποτά. Γεμίζει το μεσημέρι.',
          type: 'taverna',
          priceRange: '€€',
        },
      ],
      gettingAround: [
        'Μόνο με αυτοκίνητο — η Αλυκή βρίσκεται 25 χλμ. από τη Λιμενάρια στον νότιο παράκτιο δρόμο.',
        'Η στάθμευση είναι περιορισμένη — φτάστε πριν τις 10 π.μ. τον Ιούλιο/Αύγουστο.',
      ],
      tips: [
        'Πηγαίνετε νωρίς το πρωί ή αργά το απόγευμα — το μεσημέρι έχει μεγάλη ζέστη και λίγη σκιά.',
        'Φέρτε το δικό σας αναπνευστήρα και μάσκα αν τα έχετε.',
        'Τα ερείπια είναι ελεύθερης πρόσβασης και αφύλακτα — η σεβαστή εξερεύνηση είναι ευπρόσδεκτη.',
        'Δεν υπάρχει σκιά στα βράχια — φέρτε καπέλο και αντηλιακό.',
      ],
    },
    bg: {
      intro: 'Алики е едно от най-уникалните места в Тасос — два залива с кристална вода, между които се издигат руините на древна мраморна кариера. Плуването сред древни колонни фрагменти е изключително преживяване.',
      bestTime: 'Май–юни и септември — по-хладно, по-малко натоварено, по-лесно паркиране.',
      activities: [
        {
          name: 'Плуване в двата залива',
          description: 'Два залива един до друг с кристално чиста вода. Левият има повече сянка, десният е по-впечатляващ.',
          tip: 'Десният залив (северен) има руините на древната кариера — плувайте там.',
          category: 'beach',
        },
        {
          name: 'Гмуркане с шнорхел',
          description: 'Водата е невероятно бистра. Древни мраморни блокове лежат точно под повърхността близо до руините на кариерата.',
          category: 'watersport',
        },
        {
          name: 'Древна мраморна кариера',
          description: 'Разгледайте безплатно руините на кариера от 5 в. пр. Хр. — колони, издялани блокове, древната пристанищна стена.',
          category: 'culture',
        },
        {
          name: 'Разходка при залез',
          description: 'Разходете се по скалистия нос между двата залива при залез — едно от най-романтичните места в Тасос.',
          category: 'nature',
        },
      ],
      dining: [
        {
          name: 'Плажна таверна Алики',
          description: 'Единствена таверна на плажа — добра прясна риба и студени напитки. Натоварена по обяд.',
          type: 'taverna',
          priceRange: '€€',
        },
      ],
      gettingAround: [
        'Само с кола — Алики е на 25 км от Лимонария по южното крайбрежно шосе.',
        'Паркингът е ограничен — пристигнете преди 10 ч. сутринта през юли/август.',
      ],
      tips: [
        'Отидете рано сутринта или късно следобед — по обяд е много горещо с малко сянка.',
        'Носете собствен шнорхел и маска, ако имате.',
        'Руините са безплатни и без надзор — уважителното изследване е добре дошло.',
        'Върху скалите няма сянка — носете шапка и слънцезащитен крем.',
      ],
    },
    sr: {
      intro: 'Алики је једно од најјединственијих места на Тасосу — два залива са кристалном водом са рушевинама античког мермерног каменолома које се уздижу из стена између њих. Пливање међу древним фрагментима стубова је изванредно искуство.',
      bestTime: 'Мај–јун и септембар — хладније, мање гужве, лакше паркирање.',
      activities: [
        {
          name: 'Пливање у двоструким залијевима',
          description: 'Два залива један поред другог са кристално чистом водом. Леви има више хладовине, десни је драматичнији.',
          tip: 'Десни залив (севerni) има рушевине античког каменолома — пливајте тамо.',
          category: 'beach',
        },
        {
          name: 'Роњење са шнорклом',
          description: 'Вода је невероватно бистра. Антички мермерни блокови леже тик испод површине близу рушевина каменолома.',
          category: 'watersport',
        },
        {
          name: 'Античкi мермерни каменолом',
          description: 'Бесплатно истражите рушевине каменолома из 5. в. пре н.е. — стубови, клесани блокови, античкa лучка зид.',
          category: 'culture',
        },
        {
          name: 'Шетња при заласку сунца',
          description: 'Прошетајте стеновитим ртом између два залива при заласку сунца — једно од најромантичнијих места на Тасосу.',
          category: 'nature',
        },
      ],
      dining: [
        {
          name: 'Плажна кафана Алики',
          description: 'Једина кафана на плажи — добра свежа риба и хладна пића. Гужва у ручак.',
          type: 'taverna',
          priceRange: '€€',
        },
      ],
      gettingAround: [
        'Само аутом — Алики је 25 km од Лименарије на јужном приобалном путу.',
        'Паркинг је ограничен — стигните пре 10 ч. у јулу/августу.',
      ],
      tips: [
        'Идите рано ујутру или касно поподне — подне је веома вруће са мало хладовине.',
        'Понесите сопствени шнorkл и маску ако их имате.',
        'Рушевине су бесплатне и без надзора — поштовано истраживање је добродошло.',
        'На стенама нема хладовине — понесите шешир и крему за сунчање.',
      ],
    },
    tr: {
      intro: "Alyki, Tasos'un en özgün noktalarından biridir — iki kristal su koyu arasındaki kayalardan yükselen antik bir mermer taş ocağının kalıntılarıyla. Antik sütun parçaları arasında yüzmek olağanüstü bir deneyimdir.",
      bestTime: "Mayıs–Haziran ve Eylül — daha serin, daha az kalabalık, park etmesi daha kolay.",
      activities: [
        {
          name: 'İkiz Koylarda Yüzme',
          description: 'Kristal berraklığında suyla yan yana iki koy. Sol koyda daha fazla gölge var, sağ koy daha dramatik.',
          tip: 'Sağ koy (kuzey) antik taş ocağı kalıntılarını barındırıyor — oraya gidin.',
          category: 'beach',
        },
        {
          name: 'Şnorkelle Dalış',
          description: "Su inanılmaz derecede berrak. Antik mermer bloklar, taş ocağı kalıntılarının yakınında hemen yüzeyin altında yatıyor.",
          category: 'watersport',
        },
        {
          name: 'Antik Mermer Taş Ocağı',
          description: "MÖ 5. yüzyıldan kalma taş ocağı kalıntılarını ücretsiz keşfedin — sütunlar, oyma bloklar, antik liman duvarı.",
          category: 'culture',
        },
        {
          name: 'Gün Batımı Yürüyüşü',
          description: "Gün batımında iki koy arasındaki kayalık burnu yürüyün — Tasos'un en romantik noktalarından biri.",
          category: 'nature',
        },
      ],
      dining: [
        {
          name: 'Alyki Plaj Tavernası',
          description: 'Plajdaki tek taverna — iyi taze balık ve soğuk içecekler. Öğle saatlerinde kalabalık.',
          type: 'taverna',
          priceRange: '€€',
        },
      ],
      gettingAround: [
        "Sadece arabayla — Alyki, güney kıyı yolunda Limenaria'dan 25 km uzaktadır.",
        "Park yeri sınırlıdır — Temmuz/Ağustos'ta saat 10'dan önce gelin.",
      ],
      tips: [
        "Sabah erken veya öğleden sonra geç saatlerde gidin — öğlen az gölgeyle çok sıcak olur.",
        "Varsa kendi şnorkelinizi ve maskenizi getirin.",
        "Kalıntılar ücretsiz ve denetimsizdir — saygılı keşif memnuniyetle karşılanır.",
        "Kayalarda gölge yok — şapka ve güneş kremi getirin.",
      ],
    },
  },

  // ── GUIDE 5: marble-beach ─────────────────────────────────────────────────
  'marble-beach': {
    el: {
      intro: 'Η Παραλία Μάρμαρο (Σαλιάρα) είναι προσβάσιμη μόνο με πλοίο — καθαρά λευκά μαρμάρινα βράχια χύνονται σε έναν κόλπο με αδύνατο να φανταστεί κανείς τιρκουάζ νερό. Μία από τις πιο φωτογραφημένες παραλίες στην Ελλάδα και απολύτως αξίζει το ταξίδι με πλοίο.',
      bestTime: 'Ιούνιος και Σεπτέμβριος — πιο ήρεμη θάλασσα, λιγότερος κόσμος, καλύτερη ορατότητα νερού.',
      activities: [
        {
          name: 'Εκδρομή Πλοίου από Λιμένα',
          description: 'Ημερήσιες εκδρομές στην Παραλία Μάρμαρο αναχωρούν από το λιμάνι Λιμένα — κρατήστε θέση στα περίπτερα του λιμανιού. Συνήθως συνδυάζονται με άλλες στάσεις.',
          tip: 'Οι πρωινές αναχωρήσεις έχουν καλύτερο φως για φωτογραφία.',
          category: 'boat',
          priceRange: '€€',
        },
        {
          name: 'Εκδρομή Πλοίου από Σκάλα Ραχωνίου',
          description: 'Μικρότερο ταξίδι πλοίου από το χωριό της βόρειας ακτής (15 λεπτά έναντι 45 από τον Λιμένα).',
          category: 'boat',
          priceRange: '€€',
        },
        {
          name: 'Κολύμβηση',
          description: 'Το νερό ανάμεσα στα μαρμάρινα βράχια είναι εκπληκτικό — κρυστάλλινο πάνω από λευκό μαρμάρινο πυθμένα.',
          category: 'beach',
        },
        {
          name: 'Φωτογραφία',
          description: 'Το λευκό μάρμαρο ενάντια στο τιρκουάζ νερό δημιουργεί μοναδικές εικόνες που δεν υπάρχουν πουθενά αλλού στην Ελλάδα.',
          category: 'tour',
        },
      ],
      dining: [
        {
          name: 'Πάρτε πικνίκ μαζί σας',
          description: 'Δεν υπάρχει ταβέρνα στην παραλία — φέρτε φαγητό και ποτά από το πλοίο ή πάρτε ψυγειοτσάντα.',
          type: 'grill',
          priceRange: '€',
        },
      ],
      gettingAround: [
        'Δεν υπάρχει πρόσβαση με δρόμο. Μόνο με πλοίο.',
        'Εκδρομές αναχωρούν από Λιμένα και Σκάλα Ραχωνίου.',
        'Μερικοί επισκέπτες φτάνουν με ιδιωτικό σκάφος ή μισθωμένη βάρκα από τη Σκάλα Ραχωνίου.',
      ],
      tips: [
        'Τα μαρμάρινα βράχια ζεσταίνονται πάρα πολύ τις μεσημεριανές ώρες — σχεδόν απαραίτητα παπούτσια νερού.',
        'Οι πρωινές επισκέψεις έχουν πιο ήρεμα νερά και καλύτερο φως για φωτογραφία.',
        'Συνδυάστε με άλλες στάσεις της βόρειας ακτής στην εκδρομή με πλοίο.',
      ],
    },
    bg: {
      intro: 'Мраморен плаж (Салиара) е достъпен само с лодка — чисто бели мраморни скали се сипят в залив с невероятно тюркоазена вода. Един от най-фотографираните плажове в Гърция и определено си заслужава пътуването с лодка.',
      bestTime: 'Юни и септември — по-спокойно море, по-малко хора, по-добра видимост на водата.',
      activities: [
        {
          name: 'Лодъчна екскурзия от Лименас',
          description: 'Еднодневни обиколки до Мраморен плаж тръгват от пристанището на Лименас — резервирайте на киоските на кея. Обикновено се комбинират с други спирки.',
          tip: 'Сутрешните заминавания имат по-добра светлина за снимки.',
          category: 'boat',
          priceRange: '€€',
        },
        {
          name: 'Лодъчна екскурзия от Скала Рахони',
          description: 'По-кратко пътуване с лодка от северното крайбрежно село (15 минути спрямо 45 от Лименас).',
          category: 'boat',
          priceRange: '€€',
        },
        {
          name: 'Плуване',
          description: 'Водата между мраморните скали е невероятна — кристално чиста над бял мраморен дъл.',
          category: 'beach',
        },
        {
          name: 'Фотография',
          description: 'Белият мрамор срещу тюркоазената вода създава уникални образи, каквито няма никъде другаде в Гърция.',
          category: 'tour',
        },
      ],
      dining: [
        {
          name: 'Вземете пикник',
          description: 'На плажа няма таверна — носете храна и напитки от лодката или вземете хладилна чанта.',
          type: 'grill',
          priceRange: '€',
        },
      ],
      gettingAround: [
        'Няма достъп с кола. Само с лодка.',
        'Екскурзиите тръгват от Лименас и Скала Рахони.',
        'Някои посетители пристигат с частна яхта или наета моторна лодка от Скала Рахони.',
      ],
      tips: [
        'Мраморните скали се нагряват изключително много по обяд — силно препоръчват се обувки за вода.',
        'Сутрешните посещения имат по-спокойна вода и по-добра светлина за снимки.',
        'Комбинирайте с други спирки по северното крайбрежие в лодъчната обиколка.',
      ],
    },
    sr: {
      intro: 'Мермерна плажа (Салијара) је доступна само бродом — чисто беле мермерне стене сипају се у залив са невероватно тиркизном водом. Једна од најфотографисанијих плажа у Грчкој и апсолутно вреди бродске вожње.',
      bestTime: 'Јун и септембар — мирније море, мање гужве, боља видљивост воде.',
      activities: [
        {
          name: 'Бродска екскурзија из Лименаса',
          description: 'Дневне турнеје до Мермерне плаже полазе из луке Лименас — резервишите у киосцима на кеју. Обично се комбинују са другим заустављањима.',
          tip: 'Јутарња одлазишта имају боље светло за фотографисање.',
          category: 'boat',
          priceRange: '€€',
        },
        {
          name: 'Бродска екскурзија из Скале Рахонија',
          description: 'Краћа бродска вожња из северног приобалног насеља (15 минута наспрам 45 из Лименаса).',
          category: 'boat',
          priceRange: '€€',
        },
        {
          name: 'Пливање',
          description: 'Вода међу мермерним стенама је изванредна — кристално бистра над белим мермерним дном.',
          category: 'beach',
        },
        {
          name: 'Фотографисање',
          description: 'Бели мермер насупрот тиркизне воде ствара јединствене слике каквих нема нигде другде у Грчкој.',
          category: 'tour',
        },
      ],
      dining: [
        {
          name: 'Понесите пикник',
          description: 'На плажи нема кафане — донесите храну и пиће са брода или понесите хладњак.',
          type: 'grill',
          priceRange: '€',
        },
      ],
      gettingAround: [
        'Нема приступа путем. Само бродом.',
        'Екскурзије полазе из Лименаса и Скале Рахонија.',
        'Неки посетиоци стижу приватним бродом или изнајмљеним моторним чамцем из Скале Рахонија.',
      ],
      tips: [
        'Мермерне стене се изузетно загревају у подне — водене ципеле су веома препоручљиве.',
        'Јутарње посете имају мирнију воду и боље светло за фотографисање.',
        'Комбинујте са другим заустављањима на северној обали током бродске турнеје.',
      ],
    },
    tr: {
      intro: "Mermer Plajı (Saliara) yalnızca tekneyle ulaşılabilir — saf beyaz mermer kayalar, inanılmaz turkuaz sulardan oluşan bir koya dökülür. Yunanistan'ın en çok fotoğraflanan plajlarından biri ve tekne yolculuğuna kesinlikle değer.",
      bestTime: "Haziran ve Eylül — daha sakin deniz, daha az kalabalık, daha net su görünürlüğü.",
      activities: [
        {
          name: "Limenas'tan Tekne Turu",
          description: "Mermer Plaj'a günübirlik turlar Limenas limanından hareket eder — iskele kiosklarından rezervasyon yapın. Genellikle diğer duraklar ile birleştirilir.",
          tip: 'Sabah hareket saatleri fotoğrafçılık için daha iyi ışık sunar.',
          category: 'boat',
          priceRange: '€€',
        },
        {
          name: "Skala Rachoni'den Tekne Turu",
          description: "Kuzey kıyısı köyünden daha kısa tekne yolculuğu (Limenas'tan 45 dakika yerine 15 dakika).",
          category: 'boat',
          priceRange: '€€',
        },
        {
          name: 'Yüzme',
          description: 'Mermer kayalar arasındaki su olağanüstüdür — beyaz mermer zemin üzerinde kristal berraklığında.',
          category: 'beach',
        },
        {
          name: 'Fotoğrafçılık',
          description: "Turkuaz suya karşı beyaz mermer, Yunanistan'ın başka hiçbir yerinde olmayan eşsiz görüntüler yaratır.",
          category: 'tour',
        },
      ],
      dining: [
        {
          name: 'Piknik Hazırlayın',
          description: 'Plajda taverna yok — teknenizden yiyecek ve içecek getirin ya da soğutucu çanta hazırlayın.',
          type: 'grill',
          priceRange: '€',
        },
      ],
      gettingAround: [
        "Karayolu erişimi yok. Yalnızca tekneyle.",
        "Turlar Limenas ve Skala Rachoni'den hareket eder.",
        "Bazı ziyaretçiler özel tekne veya Skala Rachoni'den kiralık motorlu tekneyle gelir.",
      ],
      tips: [
        "Mermer kayalar öğlen güneşinde son derece ısınır — su ayakkabısı kesinlikle tavsiye edilir.",
        "Sabah ziyaretleri daha sakin su ve daha iyi fotoğrafçılık ışığı sunar.",
        "Tekne turunun diğer kuzey kıyısı durakları ile birleştirin.",
      ],
    },
  },

  // ── GUIDE 6: giola ────────────────────────────────────────────────────────
  'giola': {
    el: {
      intro: 'Η Γιόλα είναι μια φυσική βραχολίμνη λαξευμένη από αιώνες κυμάτων κοντά στο χωριό Αστρίς. Συνδέεται με τη θάλασσα μέσα από υποβρύχιο τούνελ και έχει γίνει ένα από τα πιο εμβληματικά φυσικά σημεία κολύμβησης στην Ελλάδα.',
      bestTime: 'Ιούνιος και Σεπτέμβριος. Ιούλιος–Αύγουστος έχει επικίνδυνα μεγάλη πληρότητα κόσμου.',
      activities: [
        {
          name: 'Φυσική Πισίνα Γιόλα',
          description: 'Κυκλική βραχολίμνη γεμάτη θαλασσινό νερό, συνδεδεμένη με την ανοιχτή θάλασσα. Πηδήξτε από τα βράχια ή κολυμπήστε μέσα από το τούνελ.',
          tip: 'Πηγαίνετε πριν τις 9 π.μ. — γίνεται επικίνδυνα πολυσύχναστο μέχρι τις 10:30 π.μ.',
          category: 'nature',
        },
        {
          name: 'Άλμα από Βράχους',
          description: 'Διάφορα ύψη γύρω από τη λίμνη (2μ. έως 6μ.). Αξιολογήστε τις συνθήκες πριν πηδήξετε — ελέγξτε για πλοία και άλλους κολυμβητές.',
          tip: 'Πηδήξτε μόνο αν μπορείτε να δείτε τον πυθμένα ξεκάθαρα.',
          category: 'watersport',
        },
        {
          name: 'Πεζοπορικό Μονοπάτι',
          description: 'Βραχώδες μονοπάτι 20 λεπτών από τον χώρο στάθμευσης. Φέρτε νερό και φορέστε κατάλληλα παπούτσια.',
          tip: 'Το μονοπάτι είναι αδιευκρίνιστο σε ορισμένα σημεία — ακολουθήστε άλλους ανθρώπους ή χρησιμοποιήστε Google Maps offline.',
          category: 'hike',
        },
      ],
      dining: [
        {
          name: 'Ταβέρνες Ποτού & Αστρίδος',
          description: 'Δεν υπάρχουν εγκαταστάσεις στη Γιόλα — τα πλησιέστερα εστιατόρια βρίσκονται στην Αστρίδα (10 λεπτά) ή στον Ποτό (15 λεπτά).',
          type: 'taverna',
          priceRange: '€€',
        },
      ],
      gettingAround: [
        'Οδηγήστε μέχρι τον χώρο στάθμευσης κοντά στο χωριό Αστρίς (σηματοδοτημένο από τον κεντρικό δρόμο).',
        'Στη συνέχεια 20 λεπτά πεζοπορία μέχρι τη λίμνη.',
        'Ο Ποτός απέχει 15 λεπτά με αυτοκίνητο.',
      ],
      tips: [
        'Πηγαίνετε οπωσδήποτε πριν τις 9 π.μ. Μετά τις 10 π.μ. το μονοπάτι και η λίμνη είναι επικίνδυνα γεμάτα.',
        'Φορέστε παπούτσια με λαστιχένια σόλα — τα βράχια είναι ολισθηρά όταν είναι βρεγμένα.',
        'Φέρτε το δικό σας νερό και σνακ — δεν υπάρχει τίποτα στο χώρο.',
        'Το υποβρύχιο τούνελ προς τη θάλασσα μπορεί να διανυθεί κολυμπώντας με ήρεμες συνθήκες και αυτοπεποίθηση.',
      ],
    },
    bg: {
      intro: 'Гиола е естествена скална лагуна, издялана от вековни вълни близо до село Астрис. Свързана е с морето чрез подводен тунел и се е превърнала в едно от най-емблематичните природни места за плуване в Гърция.',
      bestTime: 'Юни и септември. Юли–август е опасно препълнен.',
      activities: [
        {
          name: 'Естествен басейн Гиола',
          description: 'Кръгъл скален басейн, пълен с морска вода, свързан с открито море. Скочете от скалите или плувайте през тунела.',
          tip: 'Идете преди 9 ч. сутринта — към 10:30 ч. е опасно препълнен.',
          category: 'nature',
        },
        {
          name: 'Скачане от скали',
          description: 'Различни височини около басейна (от 2 м до 6 м). Преценете условията преди скачане — проверете за лодки и други плувци.',
          tip: 'Скачайте само ако виждате дъното ясно.',
          category: 'watersport',
        },
        {
          name: 'Туристическа пътека',
          description: 'Скалиста пътека от 20 минути от паркинга. Носете вода и обувайте подходящи обувки.',
          tip: 'Пътят е неотбелязан на места — следвайте хора или използвайте Google Maps офлайн.',
          category: 'hike',
        },
      ],
      dining: [
        {
          name: 'Таверни в Потос и Астрис',
          description: 'Няма удобства при Гиола — най-близките ресторанти са в Астрис (10 мин.) или Потос (15 мин.).',
          type: 'taverna',
          priceRange: '€€',
        },
      ],
      gettingAround: [
        'Карайте до паркинга близо до село Астрис (обозначен от главния път).',
        'След това 20-минутна разходка до басейна.',
        'Потос е на 15 минути с кола.',
      ],
      tips: [
        'Задължително идете преди 9 ч. сутринта. След 10 ч. пътеката и басейнът са опасно претъпкани.',
        'Обувайте обувки с грип — скалите са хлъзгави, когато са мокри.',
        'Носете собствена вода и закуски — на място няма нищо.',
        'Подводният тунел към морето може да бъде преплуван при спокойни условия и самоувереност.',
      ],
    },
    sr: {
      intro: 'Ђола је природна стеновита лагуна исклесана вековима таласа близу села Астрис. Повезана је са морем кроз подводни тунел и постала је једно од најиконичнијих природних места за пливање у Грчкој.',
      bestTime: 'Јун и септембар. Јул–август је опасно препун.',
      activities: [
        {
          name: 'Природни базен Ђола',
          description: 'Кружни стеновити базен пун морске воде, повезан са отвореним морем. Скочите са стена или пливајте кроз тунел.',
          tip: 'Идите пре 9 ч. — до 10:30 ч. је опасно препун.',
          category: 'nature',
        },
        {
          name: 'Скакање са стена',
          description: 'Различите висине около базена (2м до 6м). Процените услове пре скакања — проверите да нема бродова и других пливача.',
          tip: 'Скачите само ако можете јасно да видите дно.',
          category: 'watersport',
        },
        {
          name: 'Пешачка стаза',
          description: 'Стеновита стаза од 20 минута од паркинга. Понесите воду и носите одговарајућу обућу.',
          tip: 'Пут је местимично неозначен — пратите друге људе или користите Google Maps офлајн.',
          category: 'hike',
        },
      ],
      dining: [
        {
          name: 'Кафане у Потосу и Астрису',
          description: 'Нема садржаја код Ђоле — најближи ресторани су у Астрису (10 мин.) или Потосу (15 мин.).',
          type: 'taverna',
          priceRange: '€€',
        },
      ],
      gettingAround: [
        'Возите до паркинга близу села Астрис (означено са главног пута).',
        'Затим 20-минутна шетња до базена.',
        'Потос је 15 минута аутом.',
      ],
      tips: [
        'Апсолутно идите пре 9 ч. После 10 ч. стаза и базен су опасно препуни.',
        'Носите обућу са добрим гепом — стене су клизаве кад су мокре.',
        'Понесите своју воду и грицкалице — на лицу места ништа није доступно.',
        'Подводни тунел ка мору може се препливати при мирним условима и самопоуздању.',
      ],
    },
    tr: {
      intro: "Giola, Astris köyü yakınlarında yüzyıllarca süren dalgaların oyduğu doğal bir kaya lagünüdür. Denizle su altı tüneli aracılığıyla bağlantılıdır ve Yunanistan'ın en ikonik doğal yüzme noktalarından biri haline gelmiştir.",
      bestTime: "Haziran ve Eylül. Temmuz–Ağustos tehlikeli derecede kalabalık olur.",
      activities: [
        {
          name: 'Giola Doğal Havuzu',
          description: 'Açık denizle bağlantılı, deniz suyu dolu dairesel bir kaya havuzu. Kayalardan atlayın veya tünel içinden yüzün.',
          tip: "Saat 9'dan önce gidin — 10:30'a kadar tehlikeli derecede kalabalıklaşıyor.",
          category: 'nature',
        },
        {
          name: 'Kayadan Atlama',
          description: "Havuzun çevresinde çeşitli yükseklikler (2m ile 6m arası). Atlamadan önce koşulları değerlendirin — tekneleri ve diğer yüzücüleri kontrol edin.",
          tip: 'Yalnızca dibi açıkça görebiliyorsanız atlayın.',
          category: 'watersport',
        },
        {
          name: 'Yürüyüş Parkuru',
          description: 'Park alanından 20 dakikalık kayalık yol. Su getirin ve uygun ayakkabı giyin.',
          tip: "Yol bazı yerlerde işaretsiz — diğer insanları takip edin veya Google Maps'i çevrimdışı kullanın.",
          category: 'hike',
        },
      ],
      dining: [
        {
          name: "Potos ve Astris Tavernaları",
          description: "Giola'da tesis yok — en yakın restoranlar Astris'te (10 dak.) veya Potos'ta (15 dak.).",
          type: 'taverna',
          priceRange: '€€',
        },
      ],
      gettingAround: [
        "Astris köyü yakınındaki park alanına arabayla gidin (ana yoldan işaretlenmiş).",
        "Ardından havuza 20 dakika yürüyüş.",
        "Potos arabayla 15 dakika uzakta.",
      ],
      tips: [
        "Kesinlikle saat 9'dan önce gidin. Saat 10'dan sonra yol ve havuz tehlikeli derecede kalabalık olur.",
        "Kavrama özellikli ayakkabı giyin — kayalar ıslakken kaygan olur.",
        "Kendi su ve atıştırmalıklarınızı getirin — alanda hiçbir şey yok.",
        "Denize açılan su altı tüneli, sakin koşullarda ve özgüvenle yüzülerek geçilebilir.",
      ],
    },
  },

  // ── GUIDE 7: philippi ─────────────────────────────────────────────────────
  'philippi': {
    el: {
      intro: 'Οι Αρχαίοι Φίλιπποι είναι Μνημείο Παγκόσμιας Κληρονομιάς UNESCO και ένας από τους σημαντικότερους αρχαιολογικούς χώρους στη Βόρεια Ελλάδα — εδώ ο Άγιος Παύλος κήρυξε πρώτη φορά το Ευαγγέλιο στην Ευρώπη, και εδώ διεξήχθησαν αποφασιστικές ρωμαϊκές μάχες.',
      bestTime: 'Απρίλιος–Ιούνιος και Σεπτέμβριος–Οκτώβριος — πιο δροσερά για τη μεγάλη έκταση του χώρου.',
      activities: [
        {
          name: 'Αρχαιολογικός Χώρος Φιλίππων',
          description: 'Εκτεταμένα ερείπια που περιλαμβάνουν ρωμαϊκή αγορά, ελληνιστικό θέατρο, βασιλικές και τη φυλακή όπου κρατήθηκε ο Απόστολος Παύλος. Αφιερώστε 2–3 ώρες.',
          tip: 'Το ενιαίο εισιτήριο καλύπτει μουσείο και χώρο. Πηγαίνετε νωρίς το πρωί το καλοκαίρι.',
          category: 'culture',
          priceRange: '€',
        },
        {
          name: 'Μουσείο Φιλίππων',
          description: 'Καλά οργανωμένη έκθεση ευρημάτων από τον χώρο — αγάλματα, νομίσματα, ψηφιδωτά.',
          category: 'culture',
          priceRange: '€',
        },
        {
          name: 'Αρχαίο Θέατρο',
          description: 'Ένα από τα καλύτερα διατηρημένα αρχαία θέατρα στη Βόρεια Ελλάδα. Χρησιμοποιείται για καλοκαιρινές παραστάσεις.',
          category: 'culture',
        },
        {
          name: 'Βαπτιστήριο της Λυδίας',
          description: 'Παραποτάμιος χώρος όπου ο Απόστολος Παύλος βάπτισε τη Λυδία, την πρώτη του Ευρωπαία κατηχούμενη. 3 χλμ. από τον κύριο χώρο.',
          category: 'culture',
        },
      ],
      dining: [
        {
          name: 'Εστιατόρια πόλης Καβάλας',
          description: 'Οι Φίλιπποι βρίσκονται 15 χλμ. από την Καβάλα — καλύτερα να φάτε στην πόλη πριν ή μετά την επίσκεψή σας.',
          type: 'restaurant',
          priceRange: '€€',
        },
      ],
      gettingAround: [
        'Οι Φίλιπποι βρίσκονται 15 χλμ. δυτικά της Καβάλας, εύκολα προσβάσιμοι με αυτοκίνητο (20 λεπτά).',
        'Τοπικά λεωφορεία εκκινούν από τον σταθμό λεωφορείων Καβάλας.',
      ],
      tips: [
        'Συνδυάστε με πρωινή επίσκεψη στην πόλη Καβάλα — σε απόσταση 20 λεπτών.',
        'Ο χώρος είναι μεγάλος και εκτεθειμένος — φέρτε νερό, καπέλο και αντηλιακό.',
        'Ελεύθερη είσοδος την πρώτη Κυριακή κάθε μήνα.',
        'Το Φεστιβάλ Φιλίππων φιλοξενεί παραστάσεις αρχαίου δράματος στο θέατρο τον Ιούλιο/Αύγουστο.',
      ],
    },
    bg: {
      intro: 'Древни Филипи е обект на световното наследство на ЮНЕСКО и един от най-важните археологически обекти в Северна Гърция — тук Свети Павел за пръв път е проповядвал Евангелието в Европа и тук са се водили решителни римски битки.',
      bestTime: 'Април–юни и септември–октомври — по-хладно за разходка из обширния обект.',
      activities: [
        {
          name: 'Обект на древни Филипи',
          description: 'Обширни руини, включително римски форум, елинистически театър, базилики и затворът, в който е бил задържан Свети Павел. Отделете 2–3 часа.',
          tip: 'Комбинираният билет покрива музея и обекта. Идете рано сутринта през лятото.',
          category: 'culture',
          priceRange: '€',
        },
        {
          name: 'Музей на Филипи',
          description: 'Добре организирана изложба на находки от обекта — статуи, монети, мозайки.',
          category: 'culture',
          priceRange: '€',
        },
        {
          name: 'Античен театър',
          description: 'Един от най-добре запазените антични театри в Северна Гърция. Използва се за летни представления.',
          category: 'culture',
        },
        {
          name: 'Баптистерий на Лидия',
          description: 'Крайречно място, където Свети Павел е кръстил Лидия — първата му европейска приемница. На 3 км от главния обект.',
          category: 'culture',
        },
      ],
      dining: [
        {
          name: 'Ресторанти в Кавала',
          description: 'Филипи е на 15 км от Кавала — по-добре яжте в града преди или след посещението.',
          type: 'restaurant',
          priceRange: '€€',
        },
      ],
      gettingAround: [
        'Филипи е на 15 км западно от Кавала, лесно достижим с кола (20 минути).',
        'Местни автобуси тръгват от автогарата на Кавала.',
      ],
      tips: [
        'Комбинирайте с престой в град Кавала — на 20 минути разстояние.',
        'Обектът е голям и открит — носете вода, шапка и слънцезащитен крем.',
        'Безплатен вход в първата неделя на всеки месец.',
        'Фестивалът на Филипи организира представления на антична драма в театъра през юли/август.',
      ],
    },
    sr: {
      intro: 'Антички Филипи је локалитет Унеско светске баштине и једно од најважнијих археолошких налазишта у Северној Грчкој — где је Свети Павле први пут проповедао Јеванђеље у Европи и где су вожене одлучујуће римске битке.',
      bestTime: 'Април–јун и септембар–октобар — хладније за обилазак обимног налазишта.',
      activities: [
        {
          name: 'Локалитет античких Филипа',
          description: 'Обимне рушевине укључујући римски форум, хеленистички театар, базилике и затвор у ком је држан Свети Павле. Издвојите 2–3 сата.',
          tip: 'Комбинована карта покрива музеј и налазиште. Идите рано ујутру лети.',
          category: 'culture',
          priceRange: '€',
        },
        {
          name: 'Музеј Филипа',
          description: 'Добро постављена изложба налаза са локалитета — статуе, новчићи, мозаици.',
          category: 'culture',
          priceRange: '€',
        },
        {
          name: 'Античко позориште',
          description: 'Једно од најбоље очуваних античких позоришта у Северној Грчкој. Користи се за летње представе.',
          category: 'culture',
        },
        {
          name: 'Баптистеријум Лидије',
          description: 'Приобално место где је Свети Павле крстио Лидију, своју прву европску приврженицу. 3 km од главног налазишта.',
          category: 'culture',
        },
      ],
      dining: [
        {
          name: 'Ресторани у граду Кавала',
          description: 'Филипи је 15 km од Кавале — боље је јести у граду пре или после посете.',
          type: 'restaurant',
          priceRange: '€€',
        },
      ],
      gettingAround: [
        'Филипи је 15 km западно од Кавале, лако доступан аутом (20 минута).',
        'Локални аутобуси полазе из аутобуске станице у Кавали.',
      ],
      tips: [
        'Комбинујте са јутарњим боравком у граду Кавала — удаљеност 20 минута.',
        'Налазиште је велико и изложено — понесите воду, шешир и крему за сунчање.',
        'Бесплатан улаз прве недеље сваког месеца.',
        'Фестивал Филипа приређује представе античке драме у позоришту у јулу/августу.',
      ],
    },
    tr: {
      intro: "Antik Philippi, UNESCO Dünya Mirası Alanı ve Kuzey Yunanistan'ın en önemli arkeoloji sitelerinden biridir — Aziz Pavlus'un Avrupa'da İncil'i ilk kez vaaz ettiği ve belirleyici Roma savaşlarının yapıldığı yer.",
      bestTime: "Nisan–Haziran ve Eylül–Ekim — geniş alanı yürümek için daha serin.",
      activities: [
        {
          name: 'Antik Philippi Alanı',
          description: "Roma forumu, Helenistik tiyatro, bazilikalar ve Aziz Pavlus'un tutulduğu zindanı içeren geniş kalıntılar. 2–3 saat ayırın.",
          tip: 'Kombine bilet müze ve alanı kapsar. Yazın sabah erken gidin.',
          category: 'culture',
          priceRange: '€',
        },
        {
          name: 'Philippi Müzesi',
          description: 'Alandaki bulgulardan oluşan iyi düzenlenmiş sergi — heykeller, sikkeler, mozaikler.',
          category: 'culture',
          priceRange: '€',
        },
        {
          name: 'Antik Tiyatro',
          description: "Kuzey Yunanistan'ın en iyi korunmuş antik tiyatrolarından biri. Yaz gösterileri için kullanılmaktadır.",
          category: 'culture',
        },
        {
          name: 'Lydia Vaftizhanesi',
          description: "Aziz Pavlus'un Avrupalı ilk din değiştireni Lydia'yı vaftiz ettiği nehir kenarı alan. Ana alandan 3 km uzakta.",
          category: 'culture',
        },
      ],
      dining: [
        {
          name: 'Kefalonia Şehir Restoranları',
          description: "Philippi, Kefalonia'dan 15 km uzaktadır — ziyaretinizden önce veya sonra şehirde yemek yemek daha iyidir.",
          type: 'restaurant',
          priceRange: '€€',
        },
      ],
      gettingAround: [
        "Philippi, Kefalonia'nın 15 km batısında, arabayla kolayca ulaşılabilir (20 dakika).",
        "Yerel otobüsler Kefalonia otobüs terminalinden hareket eder.",
      ],
      tips: [
        "Kefalonia şehriyle birleştirin — 20 dakika uzakta.",
        "Alan geniş ve açıktadır — su, şapka ve güneş kremi getirin.",
        "Her ayın ilk Pazar günü ücretsiz giriş.",
        "Philippi Festivali, tiyatroda Temmuz/Ağustos aylarında antik drama gösterileri düzenler.",
      ],
    },
  },

  // ── GUIDE 8: kefalonia-old-town ──────────────────────────────────────────────
  'kefalonia-old-town': {
    el: {
      intro: 'Η συνοικία της Παναγίας είναι η ιστορική καρδιά της Καβάλας — μια μεσαιωνική γειτονιά εντός βυζαντινών τειχών με καλντερίμια, οθωμανικά αρχοντικά, θέα στο κάστρο και μια τελείως διαφορετική ατμόσφαιρα από τη σύγχρονη πόλη από κάτω.',
      bestTime: 'Όλο το χρόνο. Τα βράδια της άνοιξης και του φθινοπώρου είναι τα πιο ατμοσφαιρικά.',
      activities: [
        {
          name: 'Βόλτα στο Βυζαντινό Κάστρο',
          description: 'Ανεβείτε μέσα στα τείχη του βυζαντινού κάστρου για πανοραμική θέα 360° στην πόλη, το λιμάνι και το νησί της Θάσου. Ελεύθερη είσοδος στις περισσότερες περιοχές.',
          tip: 'Επισκεφθείτε στο σούρουπο για χρυσό φως στη θάλασσα.',
          category: 'culture',
        },
        {
          name: 'Βόλτα στα Σοκάκια της Παναγίας',
          description: 'Περιπλανηθείτε στα στενά καλντερίμια που καταλήγουν σε οθωμανικά σπίτια, μικρές εκκλησίες και ανθισμένα μπαλκόνια.',
          tip: 'Χαθείτε σκόπιμα — κάθε δρόμος αποκαλύπτει κάτι ενδιαφέρον.',
          category: 'culture',
        },
        {
          name: 'Γενέτειρα Μωχάμεντ Άλι',
          description: 'Το διατηρημένο αρχοντικό του 18ου αιώνα όπου γεννήθηκε ο μεγάλος μεταρρυθμιστής της Αιγύπτου. Συναρπαστικά εσωτερικά.',
          category: 'culture',
        },
        {
          name: 'Ιμαρέτ (εξωτερικό)',
          description: 'Μεγαλοπρεπές οθωμανικό ιμαρέτ (πτωχοκομείο) μετατραπέν σε πολυτελές ξενοδοχείο. Κάντε μια βόλτα έξω — ένα από τα ωραιότερα οθωμανικά κτίρια στην Ελλάδα.',
          category: 'culture',
        },
      ],
      dining: [
        {
          name: 'Τα Φανάρια',
          description: 'Παραδοσιακή ελληνική κουζίνα σε ένα υπέροχα αναπαλαιωμένο κτίριο της Παναγίας. Κράτηση εκ των προτέρων.',
          type: 'restaurant',
          priceRange: '€€',
        },
        {
          name: 'Καφέ Ξενοδοχείου Ιμαρέτ',
          description: 'Καφές στην οθωμανική αυλή αυτού του εξαιρετικού κτιρίου. Μια ξεχωριστή εμπειρία.',
          type: 'cafe',
          priceRange: '€€',
        },
      ],
      gettingAround: [
        'Πεζοπορία από το λιμάνι (15 λεπτά ανηφόρα) ή ταξί μέχρι την είσοδο του κάστρου.',
        'Όλα στην παλιά πόλη γίνονται πεζοπορώντας — δεν υπάρχουν αυτοκίνητα στα στενά σοκάκια.',
        'Παντού απότομα καλντερίμια — φορέστε κατάλληλα παπούτσια.',
      ],
      tips: [
        'Επισκεφθείτε το βράδυ όταν οι ημερήσιοι επισκέπτες φεύγουν και το φως είναι μαγευτικό.',
        'Τα καλντερίμια είναι ανώμαλα και απότομα — δεν είναι κατάλληλα για αναπηρικά καροτσάκια.',
        'Δωρεάν πάρκινγκ στη βάση του λόφου το βράδυ.',
      ],
    },
    bg: {
      intro: 'Квартал Панагия е историческото сърце на Кавала — средновековен квартал в рамките на византийски стени с калдъръмени алеи, османски особняци, гледки към замъка и напълно различна атмосфера от съвременния град по-долу.',
      bestTime: 'През цялата година. Пролетните и есенните вечери са най-атмосферни.',
      activities: [
        {
          name: 'Разходка по Византийския замък',
          description: 'Изкачете се вътре в стените на византийския замък за панорамна гледка 360° над града, пристанището и остров Тасос. Безплатен вход за повечето зони.',
          tip: 'Посетете при здрач за златна светлина върху морето.',
          category: 'culture',
        },
        {
          name: 'Разходка по алеите на Панагия',
          description: 'Разходете се по тесните калдъръмени улички, наредени с османски къщи, малки църкви и цъфтящи балкони.',
          tip: 'Заблудете се нарочно — всяка уличка разкрива нещо интересно.',
          category: 'culture',
        },
        {
          name: 'Родна къща на Мохамед Али',
          description: 'Запазеният особняк от 18 век, където е роден великият реформатор на Египет. Завладяващи интериори.',
          category: 'culture',
        },
        {
          name: 'Имарет (екстериор)',
          description: 'Великолепен османски имарет (hospice), превърнат в луксозен хотел. Разходете се около екстериора — една от най-изящните османски сгради в Гърция.',
          category: 'culture',
        },
      ],
      dining: [
        {
          name: 'Та Фанария',
          description: 'Традиционна гръцка кухня в красиво реставрирана сграда в квартал Панагия. Резервирайте предварително.',
          type: 'restaurant',
          priceRange: '€€',
        },
        {
          name: 'Кафе на хотел Имарет',
          description: 'Кафе в османския двор на тази забележителна сграда. Специално преживяване.',
          type: 'cafe',
          priceRange: '€€',
        },
      ],
      gettingAround: [
        'Пешеходен достъп от пристанището (15 минути нагоре) или такси до входа на замъка.',
        'Всичко в стария град е пеша — няма коли в тесните алеи.',
        'Навсякъде стръмни калдъръми — обувайте подходящи обувки.',
      ],
      tips: [
        'Посетете вечерта, когато еднодневните туристи са тръгнали и светлината е вълшебна.',
        'Калдъръмите са неравни и стръмни — не подходящи за инвалидни колички или бебешки колички.',
        'Безплатен паркинг в подножието на хълма вечер.',
      ],
    },
    sr: {
      intro: 'Четврт Панагија је историјско срце Кавале — средњовековна четврт унутар византијских зидина са калдрмисаним алејама, османским дворцима, погледом на тврђаву и потпуно другачијом атмосфером од модерног града испод.',
      bestTime: 'Током целе године. Пролећне и јесење вечери су најатмосфернише.',
      activities: [
        {
          name: 'Шетња по Византијској тврђави',
          description: 'Попните се унутар зидина византијске тврђаве ради панорамског погледа 360° на град, луку и острво Тасос. Бесплатан улаз у већину зона.',
          tip: 'Посетите у сумрак за златно светло над морем.',
          category: 'culture',
        },
        {
          name: 'Шетња алејама Панагије',
          description: 'Лутајте уским калдрмисаним улицама обложеним османским кућама, малим црквама и цветним балконима.',
          tip: 'Намерно се изгубите — свака улица открива нешто занимљиво.',
          category: 'culture',
        },
        {
          name: 'Родна кућа Мухамеда Алија',
          description: 'Очувани дворац из 18. века где се родио велики реформатор Египта. Фасцинантни ентеријери.',
          category: 'culture',
        },
        {
          name: 'Имарет (екстеријер)',
          description: 'Величанствени османски имарет претворен у луксузни хотел. Прошетајте около екстеријера — једна од најлепших османских грађевина у Грчкој.',
          category: 'culture',
        },
      ],
      dining: [
        {
          name: 'Та Фанарија',
          description: 'Традиционална грчка кухиња у лепо реновираној кући у четврти Панагија. Резервишите унапред.',
          type: 'restaurant',
          priceRange: '€€',
        },
        {
          name: 'Кафе хотела Имарет',
          description: 'Кафа у османском дворишту овог изузетног здања. Посебно искуство.',
          type: 'cafe',
          priceRange: '€€',
        },
      ],
      gettingAround: [
        'Пешке из луке (15 минута узбрдо) или таксијем до улаза у тврђаву.',
        'Све у старом граду је пешачко — нема аутомобила у уским улицама.',
        'Свуда стрме калдрме — носите одговарајућу обућу.',
      ],
      tips: [
        'Посетите увече када дневни туристи оду и светлост је чаробна.',
        'Калдрма је неравна и стрма — није погодна за инвалидска или дечија колица.',
        'Бесплатан паркинг у подножју брда увече.',
      ],
    },
    tr: {
      intro: "Panagia semti, Kefalonia'nın tarihi kalbidir — Bizans surlarının içinde, taş kaldırımlı sokakları, Osmanlı konakları, kale manzaraları ve aşağıdaki modern şehirden tamamen farklı bir atmosfere sahip ortaçağ mahallesi.",
      bestTime: "Tüm yıl boyunca. İlkbahar ve sonbahar akşamları en atmosferik dönemlerdir.",
      activities: [
        {
          name: 'Bizans Kalesi Yürüyüşü',
          description: "Şehir, liman ve Tasos Adası üzerinde 360° manzara için Bizans kale surlarının içine çıkın. Çoğu alana ücretsiz giriş.",
          tip: 'Denizde altın ışık için alacakaranlıkta ziyaret edin.',
          category: 'culture',
        },
        {
          name: 'Panagia Sokak Yürüyüşü',
          description: "Osmanlı dönemi evleri, küçük kiliseler ve çiçekli balkonlarla kaplı dar taş kaldırımlı sokakları dolaşın.",
          tip: 'Kasıtlı olarak kaybolun — her sokak ilginç bir şey ortaya çıkarır.',
          category: 'culture',
        },
        {
          name: "Mehmed Ali'nin Doğduğu Ev",
          description: "Mısır'ın büyük reformcusunun doğduğu korunmuş 18. yüzyıl konağı. Büyüleyici iç mekanlar.",
          category: 'culture',
        },
        {
          name: 'İmaret (dış cephe)',
          description: "Lüks otele dönüştürülmüş görkemli Osmanlı imareti. Dış cepheyi dolaşın — Yunanistan'ın en güzel Osmanlı yapılarından biri.",
          category: 'culture',
        },
      ],
      dining: [
        {
          name: 'Ta Fanaria',
          description: "Panagia semtinde güzelce restore edilmiş bir evde geleneksel Yunan mutfağı. Önceden rezervasyon yapın.",
          type: 'restaurant',
          priceRange: '€€',
        },
        {
          name: 'İmaret Oteli Kafe',
          description: "Bu olağanüstü yapının Osmanlı avlusunda kahve. Özel bir deneyim.",
          type: 'cafe',
          priceRange: '€€',
        },
      ],
      gettingAround: [
        "Limandan yürüyün (15 dakika yokuş yukarı) veya kale girişine taksiyle gidin.",
        "Eski şehirdeki her şey yayaya aittir — dar sokaklarda araba yoktur.",
        "Her yerde dik taş kaldırımlar — uygun ayakkabı giyin.",
      ],
      tips: [
        "Günübirlikçiler gidip ışığın büyülü olduğu akşam saatinde ziyaret edin.",
        "Kaldırımlar engebeli ve diktir — tekerlekli sandalye veya bebek arabası için uygun değildir.",
        "Tepenin eteklerinde akşam ücretsiz park yeri var.",
      ],
    },
  },
};
