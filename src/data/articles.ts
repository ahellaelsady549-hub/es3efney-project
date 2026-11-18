export interface Article {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  category: string;
  readMinutes: number;
  updated: string;
  sections: { heading: string; body: string[] }[];
  faq: { q: string; a: string }[];
  sources?: { title: string; url: string }[];
}

export interface LocalizedArticle extends Article {}

export const articles: Article[] = [
  {
    slug: 'first-aid-basics',
    title: 'الإسعافات الأولية: الخطوات الصحيحة قبل وصول الإسعاف',
    description:
      'دليل عملي للإسعافات الأولية في مصر: الحروق، الجروح، الإغماء، الاختناق، والكسور، مع أرقام الطوارئ والخطوات الآمنة قبل وصول الإسعاف 123.',
    keywords: ['الإسعافات الأولية', 'إسعاف مصر 123', 'حروق', 'اختناق', 'إنعاش قلبي رئوي', 'جروح'],
    category: 'إسعافات أولية',
    readMinutes: 7,
    updated: '2026-08-02',
    sections: [
      {
        heading: 'قبل أي شيء: أمّن المكان واتصل بالإسعاف',
        body: [
          'أول خطوة في أي حالة طارئة هي التأكد من أن المكان آمن لك وللمصاب، ثم الاتصال بالإسعاف على 123 (الشرطة 122، الإطفاء 180).',
          'أخبر عامل الاستقبال بالعنوان بدقة، عدد المصابين، وحالة الوعي والتنفس. لا تُغلق الخط قبل أن يُطلب منك ذلك.',
        ],
      },
      {
        heading: 'فقدان الوعي والتنفس',
        body: [
          'نادِ على المصاب وربّت على كتفه. إذا لم يستجب ولا يتنفس طبيعياً، ابدأ ضغطات الصدر في منتصف الصدر بمعدل ثابت وسريع وعمق كافٍ حتى وصول الإسعاف.',
          'إذا كان يتنفس ولكنه فاقد للوعي، ضعه على جانبه (وضع الإفاقة) مع إبقاء مجرى الهواء مفتوحاً ومتابعة تنفسه.',
        ],
      },
      {
        heading: 'الحروق',
        body: [
          'برّد الحرق بماء جارٍ فاتر لمدة 10–20 دقيقة. لا تستخدم الثلج ولا معجون الأسنان ولا الزيوت.',
          'غطِّ الحرق بشاش نظيف غير لاصق، ولا تفقأ الفقاعات. الحروق الواسعة أو حروق الوجه واليدين والأعضاء الحساسة تستدعي مستشفى فوراً.',
        ],
      },
      {
        heading: 'الجروح والنزيف',
        body: [
          'اضغط على الجرح بشاش نظيف ضغطاً مباشراً ومستمراً وارفع الطرف المصاب إن أمكن.',
          'لا تُزل الأجسام الغائرة في الجرح، وثبّتها كما هي حتى وصول الإسعاف.',
        ],
      },
      {
        heading: 'الاختناق بجسم غريب',
        body: [
          'إذا كان الشخص يستطيع الكحّ، شجّعه على الكحّ. إذا لم يستطع التنفس أو الكلام، طبّق خمس ضربات بين الكتفين ثم ضغطات بطنية بالتبادل.',
          'مع الأطفال أقل من سنة، تُستخدم ضربات الظهر وضغطات الصدر وليس الضغطات البطنية.',
        ],
      },
    ],
    faq: [
      { q: 'ما رقم الإسعاف في مصر؟', a: 'رقم الإسعاف 123، الشرطة 122، والإطفاء 180.' },
      { q: 'هل أعطي المصاب فاقد الوعي ماء؟', a: 'لا. إعطاء السوائل لفاقد الوعي قد يسبب دخولها للرئة.' },
    ],
  },
  {
    slug: 'protein-guide',
    title: 'دليل البروتين: كم تحتاج يومياً وأفضل المصادر المتوفرة في مصر',
    description:
      'كم جرام بروتين تحتاج يومياً حسب وزنك ونشاطك، وأفضل مصادر البروتين المتوفرة والاقتصادية في مصر، وكيف توزّعه على وجبات اليوم.',
    keywords: ['البروتين', 'مصادر بروتين', 'تغذية رياضية', 'كمال أجسام', 'بروتين للعضلات', 'دايت'],
    category: 'تغذية',
    readMinutes: 6,
    updated: '2026-08-02',
    sections: [
      {
        heading: 'ما هو البروتين ولماذا يهم؟',
        body: [
          'البروتين هو المادة الأساسية لبناء وإصلاح العضلات، وهو أيضاً العنصر الأكثر إشباعاً بين العناصر الغذائية، مما يجعله محورياً في أي نظام لخسارة الدهون أو بناء العضل.',
        ],
      },
      {
        heading: 'الاحتياج اليومي',
        body: [
          'المدى الشائع في المراجع الرياضية هو 1.6–2.2 جرام لكل كيلوجرام من وزن الجسم لمن يتدرب بالأثقال، والأقل من ذلك لمن لا يتدرب.',
          'اضبط رقمك الشخصي من صفحة أهدافي الغذائية، وسيتم بناء اقتراحات الوجبات وتحليلها على أساس الرقم الذي أدخلته أنت.',
        ],
      },
      {
        heading: 'أفضل المصادر المتوفرة في مصر',
        body: [
          'صدور الفراخ، البيض، التونة، السمك البلطي، اللبن الرايب والزبادي، الجبن القريش، اللحمة الحمراء قليلة الدهن.',
          'مصادر نباتية: العدس، الفول، الحمص، الفاصوليا، والطحينة (مع مراعاة سعراتها العالية).',
        ],
      },
      {
        heading: 'كيف توزّعه على اليوم؟',
        body: [
          'توزيع البروتين على 3–4 وجبات يساعد على الالتزام والشبع، مع وجبة تحتوي بروتين بعد التمرين.',
        ],
      },
    ],
    faq: [
      { q: 'هل الجبن القريش مصدر بروتين جيد؟', a: 'نعم، وهو من أرخص مصادر البروتين عالية الجودة المتوفرة في مصر.' },
      { q: 'هل أحتاج مكملات البروتين؟', a: 'المكملات وسيلة راحة فقط؛ يمكن الوصول للهدف بالطعام العادي.' },
    ],
  },
  {
    slug: 'gym-programs-comparison',
    title: 'مقارنة جداول التمارين: فُل بودي وأبر لوَر وبوش بول ليج وأرنولد سبليت وPHUL وPHAT',
    description:
      'مقارنة عملية بين أشهر أنظمة التدريب لاختيار الأنسب لعدد أيامك ومستواك: فُل بودي، أبر/لوَر، برو سبليت، بوش بول ليج، أرنولد سبليت، PHUL، PHAT.',
    keywords: ['جدول تمارين', 'بوش بول ليج', 'أرنولد سبليت', 'PHUL', 'PHAT', 'فل بودي', 'أبر لوَر', 'برو سبليت'],
    category: 'تدريب',
    readMinutes: 8,
    updated: '2026-08-02',
    sections: [
      {
        heading: 'ابدأ من عدد أيامك المتاحة',
        body: [
          'ثلاثة أيام: فُل بودي هو الأنسب لأنه يوزّع كل عضلة ثلاث مرات أسبوعياً.',
          'أربعة أيام: أبر/لوَر أو PHUL يوفّران توازناً ممتازاً بين القوة والتضخيم.',
          'خمسة إلى ستة أيام: بوش بول ليج، أرنولد سبليت، أو PHAT لمن لديه خبرة وقدرة على الاستشفاء.',
        ],
      },
      {
        heading: 'القوة أم التضخيم؟',
        body: [
          'أنظمة PHUL وPHAT تدمج أيام قوة بتكرارات منخفضة وأيام تضخيم بتكرارات أعلى، وهي مناسبة لمن يريد الاثنين معاً.',
          'برو سبليت يمنح حجم عمل عالياً للعضلة الواحدة في اليوم، لكنه يقلل تكرار تدريب العضلة أسبوعياً.',
        ],
      },
      {
        heading: 'التقدّم التدريجي هو المفتاح',
        body: [
          'أي نظام يفشل بدون تقدّم تدريجي: زيادة الوزن أو التكرارات تدريجياً. سجّل وزنك وتكراراتك لكل تمرين في صفحة الجيم لتظهر لك اقتراحات التقدّم بناءً على أرقامك المسجّلة فعلياً.',
        ],
      },
    ],
    faq: [
      { q: 'ما أفضل نظام للمبتدئ؟', a: 'فُل بودي ثلاث مرات أسبوعياً لأنه يسمح بتكرار الحركات وتعلم الأداء الصحيح.' },
      { q: 'هل أستطيع تغيير النظام؟', a: 'نعم، ويمكنك اختيار نظام جديد في أي وقت من صفحة الجيم والتغذية.' },
    ],
  },
  {
    slug: 'calories-and-weight-loss',
    title: 'السعرات الحرارية وخسارة الوزن: كيف تحسب احتياجك وتتابعه',
    description:
      'اشرح لك ببساطة معنى السعرات وعجز السعرات، وكيف تحسب احتياجك اليومي، وكيف تتابع وجباتك وسعراتها وبروتينها ومستوى خطورتها على الدايت.',
    keywords: ['السعرات الحرارية', 'عجز السعرات', 'خسارة الوزن', 'حساب السعرات', 'مؤشر كتلة الجسم', 'BMR'],
    category: 'تغذية',
    readMinutes: 6,
    updated: '2026-08-02',
    sections: [
      {
        heading: 'الأساس: ميزان الطاقة',
        body: [
          'خسارة الوزن تحدث عندما يكون ما تستهلكه من طعام أقل من ما يحرقه جسمك على مدى أسابيع، والعكس لزيادة الوزن.',
        ],
      },
      {
        heading: 'كيف تحسب احتياجك؟',
        body: [
          'يُحسب معدل الأيض الأساسي من الوزن والطول والعمر والجنس، ثم يُضرب في معامل النشاط للحصول على إجمالي الحرق اليومي.',
          'صفحة النظام الغذائي في الموقع تحسب هذه الأرقام من بياناتك التي تدخلها وتحفظها لك، ثم تستخدمها صفحة أهدافي الغذائية.',
        ],
      },
      {
        heading: 'المتابعة اليومية',
        body: [
          'سجّل وجباتك في قسم الأكل بصفحة الجيم لتظهر لك السعرات والبروتين والكارب والدهون ومستوى خطورة الوجبة على أهدافك، ويمكنك تصدير السجل كـ PDF أو CSV.',
        ],
      },
    ],
    faq: [
      { q: 'هل يجب أن أزن كل طعامي؟', a: 'الوزن الدقيق مفيد في البداية لتعلم الأحجام، ثم يمكن الاعتماد على التقدير مع مراجعة النتائج.' },
      { q: 'كم كيلو أخسر في الأسبوع؟', a: 'المعدل المستدام عادة نصف كيلو إلى كيلو أسبوعياً حسب وزن البداية والالتزام.' },
    ],
  },
  {
    slug: 'mental-health-when-to-seek-help',
    title: 'الصحة النفسية: علامات تستوجب طلب مساعدة متخصصة',
    description:
      'متى تكون الأعراض النفسية أكثر من ضغط عادي؟ علامات القلق والاكتئاب واضطرابات النوم التي تستوجب زيارة مختص، وأماكن الدعم في مصر.',
    keywords: ['الصحة النفسية', 'الاكتئاب', 'القلق', 'اضطراب النوم', 'طبيب نفسي', 'دعم نفسي'],
    category: 'صحة نفسية',
    readMinutes: 5,
    updated: '2026-08-02',
    sections: [
      {
        heading: 'الفرق بين الضغط العادي والاضطراب',
        body: [
          'الحزن أو القلق مشاعر طبيعية مؤقتة. تصبح مشكلة تستوجب التقييم عندما تستمر لأسابيع وتؤثر على النوم والعمل والعلاقات.',
        ],
      },
      {
        heading: 'علامات تستوجب زيارة مختص',
        body: [
          'فقدان الاهتمام بكل الأنشطة، اضطراب نوم أو شهية مستمر، نوبات هلع متكررة، أو أفكار إيذاء الذات.',
          'وجود أفكار لإيذاء النفس يستوجب طلب المساعدة فوراً والاتصال بالإسعاف 123 أو التوجه لأقرب مستشفى.',
        ],
      },
      {
        heading: 'أين تجد الدعم؟',
        body: [
          'استخدم قسم أقرب المرافق الصحية للوصول لأقرب مركز أو مستشفى، وقسم ابحث عن طبيب للتواصل مع مختص.',
        ],
      },
    ],
    faq: [
      { q: 'هل الاختبارات على الموقع تشخيص؟', a: 'لا. أدوات الموقع للتوعية والفرز المبدئي ولا تُغني عن تقييم مختص.' },
      { q: 'هل العلاج النفسي دائماً بأدوية؟', a: 'لا، كثير من الحالات تُدار بالعلاج النفسي وتعديل نمط الحياة حسب تقييم المختص.' },
    ],
  },
  {
    slug: 'early-cancer-detection',
    title: 'الكشف المبكر عن السرطان: متى تراجع الطبيب؟',
    description: 'كيف يساعد الانتباه للأعراض والفحوص المناسبة للعمر وعوامل الخطورة على اكتشاف بعض أنواع السرطان مبكرًا، دون فحوص عشوائية أو تشخيص ذاتي.',
    keywords: ['الكشف المبكر', 'السرطان', 'الفحوص الدورية', 'الوقاية'],
    category: 'كشف مبكر', readMinutes: 4, updated: '2026-11-18',
    sections: [
      { heading: 'راقب التغيرات المستمرة', body: ['اطلب تقييمًا طبيًا إذا استمر تغير غير معتاد مثل كتلة جديدة، نزيف غير مفسر، تغير في التبرز، سعال مستمر أو نقص وزن غير مقصود. هذه العلامات لها أسباب كثيرة ولا تعني وحدها وجود سرطان.', 'اذكر للطبيب متى بدأت الأعراض، وما الذي يزيدها أو يخففها، وأي تاريخ عائلي مهم.'] },
      { heading: 'الفحص المناسب يعتمد على الشخص', body: ['برامج الفحص تختلف حسب نوع السرطان والعمر والجنس والتاريخ الصحي وعوامل الخطورة. اسأل طبيبك عن الفحوص المناسبة لك وتوقيتها؛ الفحص غير المناسب قد يسبب نتائج مضللة أو إجراءات غير لازمة.', 'لا تنتظر موعد الفحص الدوري إذا ظهرت أعراض جديدة أو مستمرة.'] },
    ],
    faq: [{ q: 'هل الفحص المبكر يمنع كل أنواع السرطان؟', a: 'لا، لكنه قد يساعد على اكتشاف أنواع محددة في مرحلة أبكر. لا يوجد فحص واحد مناسب للجميع.' }, { q: 'هل وجود عرض يعني الإصابة بالسرطان؟', a: 'لا. للأعراض أسباب عديدة، ويحدد الطبيب الحاجة للفحص بعد التقييم.' }],
    sources: [{ title: 'منظمة الصحة العالمية: السرطان والكشف المبكر', url: 'https://www.who.int/news-room/fact-sheets/detail/cancer' }],
  },
  {
    slug: 'heart-attack-warning-signs',
    title: 'علامات الأزمة القلبية: لا تنتظر زوال الألم',
    description: 'تعرف على العلامات المحتملة للأزمة القلبية، وكيف تطلب الإسعاف بسرعة وتساعد المصاب بأمان.',
    keywords: ['أزمة قلبية', 'ألم الصدر', 'أعراض القلب', 'إسعاف 123'],
    category: 'صحة القلب', readMinutes: 3, updated: '2026-11-18',
    sections: [
      { heading: 'علامات تستدعي التصرف العاجل', body: ['قد يظهر ضغط أو ألم بمنتصف الصدر، أو انزعاج يمتد للذراع أو الظهر أو الرقبة أو الفك، مع ضيق نفس أو عرق بارد أو غثيان أو دوخة. قد تختلف العلامات من شخص لآخر.', 'اتصل بالإسعاف المصري 123 فورًا عند الاشتباه. لا تقد السيارة بنفسك ولا تنتظر لترى إن كانت الأعراض ستزول.'] },
      { heading: 'ساعد دون تأخير', body: ['أوقف المجهود، ساعد المصاب على الراحة في وضع مريح، وراقب وعيه وتنفسه حتى وصول الإسعاف. اتبع تعليمات موظف الطوارئ ولا تعطِ دواءً من نفسك.', 'إذا فقد الوعي ولم يعد يتنفس طبيعيًا، اطلب من شخص إحضار جهاز إزالة الرجفان إن توفر وابدأ الإنعاش إذا كنت مدربًا أو اتبع تعليمات الطوارئ.'] },
    ],
    faq: [{ q: 'هل يجب أن يكون ألم الصدر شديدًا؟', a: 'ليس بالضرورة؛ قد يكون ضغطًا أو انزعاجًا خفيفًا، وقد تبرز أعراض أخرى.' }, { q: 'هل أنتظر وأحجز موعدًا؟', a: 'لا عند وجود علامات أزمة قلبية محتملة؛ اتصل بالإسعاف 123 فورًا.' }],
    sources: [{ title: 'جمعية القلب الأمريكية: علامات التحذير من الأزمة القلبية', url: 'https://www.heart.org/en/health-topics/heart-attack/warning-signs-of-a-heart-attack' }],
  },
  {
    slug: 'stroke-fast-signs',
    title: 'السكتة الدماغية: تذكّر الوجه والذراع والكلام والوقت',
    description: 'طريقة سريعة لملاحظة علامات السكتة الدماغية والتصرف فورًا لأن الوقت مهم.',
    keywords: ['السكتة الدماغية', 'الجلطة', 'ضعف مفاجئ', 'إسعاف'],
    category: 'طوارئ', readMinutes: 3, updated: '2026-11-18',
    sections: [
      { heading: 'اختبر العلامات المفاجئة', body: ['اطلب من الشخص أن يبتسم: هل تدلّى جانب من الوجه؟ اطلب منه رفع الذراعين: هل تهبط واحدة؟ استمع لكلامه: هل أصبح متثاقلًا أو غير واضح؟ قد تظهر أيضًا مشكلة مفاجئة في الرؤية أو التوازن أو صداع شديد غير معتاد.', 'حتى لو اختفت العلامات بعد دقائق، تظل الحالة طارئة وتحتاج تقييمًا عاجلًا.'] },
      { heading: 'الوقت مهم', body: ['سجّل وقت بدء الأعراض واتصل بالإسعاف 123 فورًا. لا تعطِ المصاب طعامًا أو شرابًا أو دواءً، ولا تنقله بسيارتك إذا كان الإسعاف متاحًا.', 'ساعده على الجلوس أو الاستلقاء بأمان وراقب تنفسه ووعيه حتى وصول المساعدة.'] },
    ],
    faq: [{ q: 'ماذا أفعل إذا تحسنت الأعراض؟', a: 'اتصل بالإسعاف رغم التحسن؛ قد تكون الأعراض المؤقتة إنذارًا يحتاج تقييمًا عاجلًا.' }, { q: 'هل أعطيه أسبرين؟', a: 'لا تعطِ أدوية من نفسك؛ سبب الأعراض لا يمكن تمييزه بأمان دون تقييم طبي.' }],
    sources: [{ title: 'مراكز مكافحة الأمراض: علامات وأعراض السكتة الدماغية', url: 'https://www.cdc.gov/stroke/signs-symptoms/' }],
  },
  {
    slug: 'hands-only-cpr',
    title: 'الإنعاش القلبي الرئوي باليدين: خطوات قد تنقذ حياة',
    description: 'ماذا تفعل إذا انهار شخص بالغ فجأة ولم يستجب؟ اطلب الطوارئ وابدأ ضغطات الصدر إذا لم يكن يتنفس طبيعيًا.',
    keywords: ['إنعاش قلبي رئوي', 'ضغطات الصدر', 'CPR', 'إسعاف'],
    category: 'إسعافات أولية', readMinutes: 4, updated: '2026-11-18',
    sections: [
      { heading: 'تأكد واطلب المساعدة', body: ['تأكد أن المكان آمن، ونادِ المصاب وربّت على كتفه. إذا لم يستجب ولا يتنفس طبيعيًا أو كان يلهث فقط، اطلب من شخص الاتصال بالإسعاف 123 وإحضار جهاز إزالة الرجفان إن توفر.', 'ابدأ ضغطات الصدر للبالغ المنهار فجأة إذا كنت قادرًا، واستمر حتى وصول المساعدة أو عودة التنفس الطبيعي أو عدم قدرتك على المتابعة.'] },
      { heading: 'ضغطات ثابتة في منتصف الصدر', body: ['ضع كعب اليد في منتصف الصدر واليد الأخرى فوقها، واجعل الذراعين مستقيمين واضغط بقوة وبسرعة منتظمة، بمعدل 100–120 ضغطة في الدقيقة، مع السماح للصدر بالارتداد بين الضغطات.', 'هذه إرشادات تعليمية للبالغين. الأطفال والرضع والحالات الخاصة تحتاج تدريبًا مناسبًا؛ اتبع تعليمات موظف الطوارئ، وخذ تدريبًا عمليًا معتمدًا.'] },
    ],
    faq: [{ q: 'هل أحتاج التأكد من النبض؟', a: 'لا تؤخر طلب المساعدة والضغطات بمحاولة فحص النبض إذا لم تكن مختصًا.' }, { q: 'هل المقال يغني عن التدريب؟', a: 'لا. التدريب العملي على دمية ومتابعة تعليمات الطوارئ مهمان.' }],
    sources: [{ title: 'جمعية القلب الأمريكية: إرشادات الإنعاش باليدين', url: 'https://www.heart.org/en/news/2023/02/01/11-things-to-know-to-save-a-life-with-cpr' }],
  },
  {
    slug: 'severe-bleeding-first-aid',
    title: 'الإسعاف الأولي للنزيف الشديد',
    description: 'إجراءات آمنة للسيطرة على النزيف الخارجي الشديد إلى أن تصل المساعدة الطبية.',
    keywords: ['نزيف شديد', 'إسعاف الجروح', 'ضغط مباشر', 'إسعافات أولية'],
    category: 'إسعافات أولية', readMinutes: 3, updated: '2026-11-18',
    sections: [
      { heading: 'اتصل بالإسعاف واضغط مباشرة', body: ['إذا كان النزيف غزيرًا أو لا يتوقف، اتصل بالإسعاف 123. ارتدِ قفازات إن توفرت، وضع شاشًا أو قطعة قماش نظيفة واضغط بقوة وثبات على موضع النزيف.', 'إذا تشبعت الضمادة، لا ترفعها لفحص الجرح؛ أضف طبقات أخرى واستمر بالضغط. ساعد المصاب على الاستلقاء وابقه دافئًا وراقب تنفسه.'] },
      { heading: 'تجنب هذه التصرفات', body: ['لا تنزع جسمًا مغروسًا في الجرح؛ اضغط حوله وثبّته. لا تغسل جرحًا ينزف بشدة ولا تستخدم مسحوقًا أو مادة منزلية داخله.', 'الرباط الضاغط المخصص للنزيف الشديد يستخدمه من تدرب عليه أو وفق توجيه الطوارئ.'] },
    ],
    faq: [{ q: 'هل أرفع الطرف المصاب؟', a: 'الأولوية للضغط المباشر وطلب الإسعاف؛ لا تحرك طرفًا قد يكون مكسورًا.' }, { q: 'متى أتصل بالإسعاف؟', a: 'فورًا عند النزيف الغزير أو المستمر أو وجود جرح عميق أو جسم مغروس أو علامات ضعف ودوخة.' }],
    sources: [{ title: 'الصليب الأحمر الأمريكي: الإسعاف الأولي للنزيف المهدد للحياة', url: 'https://www.redcross.org/take-a-class/resources/learn-first-aid/bleeding-life-threatening-external' }],
  },
  {
    slug: 'burn-first-aid',
    title: 'إسعاف الحروق: التبريد أولًا',
    description: 'خطوات أولية للحروق الحرارية ومتى يحتاج المصاب إلى تقييم طبي عاجل.',
    keywords: ['حروق', 'إسعاف الحروق', 'ماء جارٍ', 'إسعافات أولية'],
    category: 'إسعافات أولية', readMinutes: 3, updated: '2026-11-18',
    sections: [
      { heading: 'برّد الحرق بماء جارٍ', body: ['أبعد المصاب عن مصدر الحرارة بأمان، وبرّد المنطقة بماء جارٍ بارد أو فاتر لمدة 20 دقيقة. انزع الخواتم أو الملابس القريبة إذا لم تكن ملتصقة بالجلد.', 'بعد التبريد، غطِّ المنطقة بغطاء نظيف غير لاصق. لا تضع الثلج أو الزيوت أو معجون الأسنان، ولا تفقأ الفقاعات.'] },
      { heading: 'اطلب الرعاية عند الحروق الخطيرة', body: ['اتصل بالإسعاف 123 أو اذهب للطوارئ إذا كان الحرق كبيرًا أو عميقًا، أو أصاب الوجه أو اليدين أو الأعضاء الحساسة، أو نتج عن كهرباء أو مادة كيميائية، أو صاحبه صعوبة تنفس.', 'لا تنزع قماشًا ملتصقًا بالجلد ولا تضع كريمًا على حرق كبير قبل التقييم الطبي.'] },
    ],
    faq: [{ q: 'كم مدة تبريد الحرق؟', a: 'يوصي مصدر NHS بتبريده تحت ماء جارٍ بارد لمدة 20 دقيقة.' }, { q: 'هل أضع ثلجًا أو معجون أسنان؟', a: 'لا؛ استخدم الماء الجاري فقط للتبريد الأولي.' }],
    sources: [{ title: 'هيئة الخدمات الصحية البريطانية: الحروق والسلق', url: 'https://www.nhs.uk/conditions/burns-and-scalds/' }],
  },
  {
    slug: 'blood-pressure-checks',
    title: 'ضغط الدم: لماذا تحتاج إلى قياسه؟',
    description: 'ارتفاع ضغط الدم قد لا يسبب أعراضًا واضحة؛ تعرف على أهمية القياس والمتابعة الطبية المنتظمة.',
    keywords: ['ضغط الدم', 'ارتفاع الضغط', 'قياس الضغط', 'كشف مبكر'],
    category: 'صحة القلب', readMinutes: 3, updated: '2026-11-18',
    sections: [
      { heading: 'قد يكون بلا أعراض', body: ['قد يعيش الشخص مع ارتفاع ضغط الدم دون أن يشعر بشيء. لذلك لا يكفي الاعتماد على الصداع أو الدوخة لمعرفة الضغط؛ القياس هو الطريقة لمعرفة القراءة.', 'إذا ظهرت قراءة مرتفعة، أعد القياس بالطريقة الصحيحة وناقش النتائج مع مختص بدل تشخيص نفسك من قراءة واحدة.'] },
      { heading: 'اجعل المتابعة جزءًا من الرعاية الوقائية', body: ['اطلب من مقدم الرعاية تحديد عدد مرات القياس المناسبة لك، خاصة إذا كان لديك تاريخ عائلي أو عوامل خطورة أو كنت تتناول علاجًا.', 'لا توقف دواء الضغط أو تغيّر جرعته دون الطبيب. ألم الصدر أو ضيق النفس الشديد أو أعراض عصبية مفاجئة تستدعي الطوارئ 123.'] },
    ],
    faq: [{ q: 'هل أعرف ارتفاع الضغط من الأعراض؟', a: 'غالبًا لا؛ قد لا تظهر أعراض واضحة، لذا يلزم القياس.' }, { q: 'هل أوقف العلاج عندما تتحسن القراءة؟', a: 'لا توقف العلاج ولا تعدّل الجرعة دون مراجعة الطبيب.' }],
    sources: [{ title: 'منظمة الصحة العالمية: ارتفاع ضغط الدم', url: 'https://www.who.int/news-room/fact-sheets/detail/hypertension' }],
  },
  {
    slug: 'diabetes-early-screening',
    title: 'السكري: الأعراض والفحص المبكر',
    description: 'تعرّف على أعراض السكري الشائعة ولماذا قد يكون الفحص مهمًا حتى عند غياب الأعراض.',
    keywords: ['السكري', 'أعراض السكري', 'فحص السكر', 'كشف مبكر'],
    category: 'صحة عامة', readMinutes: 3, updated: '2026-11-18',
    sections: [
      { heading: 'أعراض تستحق التقييم', body: ['من العلامات المحتملة العطش وكثرة التبول، الجوع، الإرهاق، تشوش الرؤية، بطء التئام الجروح أو فقدان وزن غير مقصود. هذه الأعراض لا تثبت التشخيص وحدها.', 'قد لا تسبب مقدمات السكري وبعض حالات النوع الثاني أعراضًا واضحة؛ اسأل الطبيب عن الفحص إذا كانت لديك عوامل خطورة.'] },
      { heading: 'الفحص والتصرف', body: ['يُشخّص السكري بفحوص مخبرية يختارها الطبيب، وقد يلزم تكرار الفحص لتأكيد النتيجة. ناقش النتيجة وخطة المتابعة مع مقدم الرعاية.', 'إذا صاحب الأعراض قيء أو صعوبة تنفس أو ارتباك شديد، اطلب الإسعاف 123 فورًا.'] },
    ],
    faq: [{ q: 'هل غياب الأعراض يعني أن السكر طبيعي؟', a: 'لا دائمًا؛ بعض الحالات لا تظهر عليها أعراض واضحة، والفحص يحدد الحاجة للتقييم.' }, { q: 'هل جهاز المنزل يكفي للتشخيص؟', a: 'لا تعتمد على قراءة منزلية منفردة للتشخيص؛ راجع الطبيب والفحوص المناسبة.' }],
    sources: [
      { title: 'مراكز مكافحة الأمراض: أعراض السكري', url: 'https://www.cdc.gov/diabetes/signs-symptoms/' },
      { title: 'مراكز مكافحة الأمراض: فحوص السكري', url: 'https://www.cdc.gov/diabetes/diabetes-testing/index.html' },
    ],
  },
  {
    slug: 'infection-outbreak-prevention',
    title: 'الوقاية من العدوى وانتشار الأمراض التنفسية',
    description: 'عادات يومية بسيطة تقلل انتقال العدوى التنفسية داخل المنزل والعمل والأماكن المزدحمة.',
    keywords: ['العدوى', 'انتشار الأمراض', 'تهوية', 'نظافة اليدين', 'الوقاية'],
    category: 'صحة عامة', readMinutes: 3, updated: '2026-11-18',
    sections: [
      { heading: 'قلل فرص انتقال العدوى', body: ['اغسل يديك بالماء والصابون بانتظام، وغطِّ الفم والأنف عند السعال أو العطس، وتخلص من المناديل بأمان. تجنب لمس الوجه بيدين غير نظيفتين.', 'حسّن تهوية الأماكن المغلقة، وقلل مخالطة الآخرين عندما تكون مريضًا. الكمامة قد تساعد في الأماكن المزدحمة أو عند مخالطة شخص أكثر عرضة للمضاعفات.'] },
      { heading: 'تابع الإرشادات واطلب الرعاية', body: ['تختلف الإجراءات حسب المرض ومكان انتشاره؛ تابع إرشادات وزارة الصحة والجهات الصحية الموثوقة، ولا تستخدم المضادات الحيوية دون وصفة.', 'اطلب مساعدة عاجلة عند صعوبة التنفس أو تدهور الوعي، واتصل بالإسعاف 123 في الحالات الحرجة.'] },
    ],
    faq: [{ q: 'هل المضاد الحيوي يعالج نزلات البرد؟', a: 'المضادات الحيوية لا تعالج الفيروسات؛ لا تستخدمها إلا بوصفة وتقييم طبي.' }, { q: 'ما أهم خطوة في الأماكن المغلقة؟', a: 'التهوية الجيدة مع نظافة اليدين وتقليل المخالطة أثناء المرض.' }],
    sources: [{ title: 'منظمة الصحة العالمية: كيف أتجنب الإنفلونزا؟', url: 'https://www.who.int/news-room/questions-and-answers/item/how-can-i-avoid-getting-the-flu' }],
  },
  {
    slug: 'flu-vaccination-prevention',
    title: 'الإنفلونزا الموسمية: اللقاح والوقاية',
    description: 'معلومات توعوية عن لقاح الإنفلونزا الموسمية وعادات الوقاية، مع أهمية استشارة مقدم الرعاية للفئات الأكثر عرضة للمضاعفات.',
    keywords: ['إنفلونزا موسمية', 'لقاح الإنفلونزا', 'الوقاية من العدوى', 'تطعيم'],
    category: 'صحة عامة', readMinutes: 3, updated: '2026-11-18',
    sections: [
      { heading: 'اللقاح وسيلة وقاية مهمة', body: ['توصي الجهات الصحية بالتطعيم الموسمي وفق الإرشادات المحلية، خصوصًا للفئات الأكثر عرضة لمضاعفات الإنفلونزا. اسأل الطبيب أو الصيدلي عن التوقيت والملاءمة لحالتك الصحية.', 'قد يتغير اللقاح الموصى به من موسم لآخر، لذلك اعتمد على الإرشادات الحالية من الجهات الصحية.'] },
      { heading: 'عادات تحميك وتحمي الآخرين', body: ['اغسل يديك، وغطِّ السعال والعطس، وحسّن تهوية الغرف. إذا مرضت فقلل مخالطة الآخرين واطلب المشورة الطبية إذا كنت من الفئات الأكثر عرضة أو ساءت الأعراض.', 'ضيق النفس أو ألم الصدر أو الارتباك أو التدهور السريع علامات تستدعي الرعاية العاجلة؛ اتصل بالإسعاف 123 عند الحاجة.'] },
    ],
    faq: [{ q: 'هل اللقاح يضمن عدم الإصابة؟', a: 'لا يوجد لقاح يضمن منع كل إصابة، لكنه وسيلة وقاية موصى بها وقد يقلل خطر المرض ومضاعفاته.' }, { q: 'هل أحتاج استشارة قبل التطعيم؟', a: 'استشر مقدم الرعاية إذا لديك حساسية شديدة سابقة أو حالة صحية خاصة أو سؤال عن الملاءمة.' }],
    sources: [{ title: 'منظمة الصحة العالمية: الوقاية من الإنفلونزا', url: 'https://www.who.int/news-room/questions-and-answers/item/how-can-i-avoid-getting-the-flu' }],
  },
];

export const getArticle = (slug: string) => articles.find((a) => a.slug === slug);

const englishArticles: Record<string, Omit<Article, 'slug' | 'readMinutes' | 'updated'>> = {
  'first-aid-basics': {
    title: 'First Aid: The Right Steps Before the Ambulance Arrives',
    description: 'A practical first-aid guide for Egypt covering burns, wounds, fainting, choking and fractures, with emergency numbers and safe steps before ambulance 123 arrives.',
    keywords: ['first aid', 'Egypt ambulance 123', 'burns', 'choking', 'CPR', 'wounds'], category: 'First Aid',
    sections: [
      { heading: 'First: secure the scene and call an ambulance', body: ['Make sure the scene is safe for you and the injured person, then call ambulance 123 (police 122, fire 180).', 'Give the operator the exact address, number of casualties, and their breathing and consciousness status. Do not hang up until instructed.'] },
      { heading: 'Unconsciousness and breathing', body: ['Call to the person and tap their shoulder. If they do not respond or breathe normally, begin firm, rapid chest compressions in the center of the chest until help arrives.', 'If they are breathing but unconscious, place them on their side in the recovery position, keep the airway open and monitor breathing.'] },
      { heading: 'Burns', body: ['Cool the burn under cool running water for 10–20 minutes. Do not use ice, toothpaste or oils.', 'Cover it with clean non-stick gauze and do not burst blisters. Large burns, or burns to the face, hands or sensitive areas, need immediate hospital care.'] },
      { heading: 'Wounds and bleeding', body: ['Apply steady direct pressure with clean gauze and raise the injured limb if possible.', 'Do not remove embedded objects; stabilize them in place until help arrives.'] },
      { heading: 'Choking on a foreign object', body: ['If the person can cough, encourage them. If they cannot breathe or speak, alternate five back blows with abdominal thrusts.', 'For infants under one year, use back blows and chest thrusts, not abdominal thrusts.'] },
    ],
    faq: [{ q: 'What is the ambulance number in Egypt?', a: 'Ambulance is 123, police is 122, and fire is 180.' }, { q: 'Should I give water to an unconscious person?', a: 'No. Fluids can enter the lungs and cause serious harm.' }],
  },
  'protein-guide': {
    title: 'Protein Guide: Daily Needs and the Best Sources in Egypt',
    description: 'Learn how many grams of protein you need based on your weight and activity, affordable sources in Egypt, and how to spread them across your day.',
    keywords: ['protein', 'protein sources', 'sports nutrition', 'bodybuilding', 'muscle building', 'diet'], category: 'Nutrition',
    sections: [
      { heading: 'What is protein and why does it matter?', body: ['Protein builds and repairs muscle. It is also the most filling macronutrient, making it central to fat-loss and muscle-building plans.'] },
      { heading: 'Daily requirements', body: ['A common evidence-based range for resistance trainees is 1.6–2.2 grams per kilogram of body weight, with lower needs for inactive people.', 'Set your personal target on the Nutrition Goals page so meal suggestions and analyses use your chosen amount.'] },
      { heading: 'Good sources available in Egypt', body: ['Chicken breast, eggs, tuna, tilapia, laban rayeb, yogurt, cottage cheese and lean red meat.', 'Plant sources include lentils, fava beans, chickpeas, beans and tahini, while accounting for its higher calories.'] },
      { heading: 'How should you spread it through the day?', body: ['Spreading protein across 3–4 meals supports fullness and consistency, including a protein-rich meal after training.'] },
    ],
    faq: [{ q: 'Is cottage cheese a good protein source?', a: 'Yes. It is one of the most affordable, high-quality protein sources available in Egypt.' }, { q: 'Do I need protein supplements?', a: 'Supplements are only a convenience; you can reach your target with regular food.' }],
  },
  'gym-programs-comparison': {
    title: 'Workout Split Comparison: Full Body, Upper/Lower, PPL, Arnold, PHUL and PHAT',
    description: 'A practical comparison of popular training systems to match your available days and experience level.',
    keywords: ['workout plan', 'push pull legs', 'Arnold split', 'PHUL', 'PHAT', 'full body', 'upper lower', 'bro split'], category: 'Training',
    sections: [
      { heading: 'Start with your available training days', body: ['Three days: Full Body works best because each muscle is trained three times per week.', 'Four days: Upper/Lower or PHUL offer an excellent balance between strength and hypertrophy.', 'Five or six days: PPL, Arnold Split or PHAT suit experienced trainees with strong recovery.'] },
      { heading: 'Strength or hypertrophy?', body: ['PHUL and PHAT combine low-repetition strength days with higher-repetition hypertrophy days, making them suitable for both goals.', 'Bro Split provides high volume for one muscle group per day but lowers weekly training frequency.'] },
      { heading: 'Progressive overload is the key', body: ['Any plan fails without gradual progress in weight or repetitions. Log your performance on the Gym page to receive suggestions based on your actual records.'] },
    ],
    faq: [{ q: 'What is the best plan for a beginner?', a: 'Full Body three times a week supports frequent practice and proper technique.' }, { q: 'Can I change my program?', a: 'Yes. You can select a new program at any time from the Gym & Nutrition page.' }],
  },
  'calories-and-weight-loss': {
    title: 'Calories and Weight Loss: Calculate and Track Your Needs',
    description: 'A simple explanation of calories, calorie deficits, daily needs, and tracking meals, protein and diet risk.',
    keywords: ['calories', 'calorie deficit', 'weight loss', 'calorie tracking', 'BMI', 'BMR'], category: 'Nutrition',
    sections: [
      { heading: 'The foundation: energy balance', body: ['Weight loss occurs when food energy intake stays below the energy your body uses over several weeks; the reverse supports weight gain.'] },
      { heading: 'How do you calculate your needs?', body: ['Basal metabolic rate uses weight, height, age and sex, then an activity factor estimates total daily expenditure.', 'The Diet Plan page calculates these values from your details and connects them with your Nutrition Goals.'] },
      { heading: 'Daily tracking', body: ['Log meals in the Gym food section to review calories, protein, carbohydrates, fat and diet risk, then export your history as PDF or CSV.'] },
    ],
    faq: [{ q: 'Do I need to weigh all my food?', a: 'Accurate weighing helps you learn portions at first; later, estimates can work when checked against results.' }, { q: 'How much weight should I lose each week?', a: 'A sustainable pace is commonly 0.5–1 kilogram weekly, depending on starting weight and consistency.' }],
  },
  'mental-health-when-to-seek-help': {
    title: 'Mental Health: Signs That You Should Seek Professional Help',
    description: 'Learn when symptoms are more than everyday stress, warning signs involving anxiety, depression and sleep, and where to find support in Egypt.',
    keywords: ['mental health', 'depression', 'anxiety', 'sleep disorder', 'psychiatrist', 'mental health support'], category: 'Mental Health',
    sections: [
      { heading: 'Everyday stress versus a disorder', body: ['Sadness and anxiety can be temporary, normal emotions. Assessment is important when they last for weeks and affect sleep, work or relationships.'] },
      { heading: 'Signs that need professional support', body: ['Loss of interest in all activities, persistent sleep or appetite changes, repeated panic attacks, or thoughts of self-harm.', 'Thoughts of self-harm require immediate help: call ambulance 123 or go to the nearest hospital.'] },
      { heading: 'Where can you find support?', body: ['Use Nearby Facilities to locate the closest center or hospital, and Find a Doctor to contact a specialist.'] },
    ],
    faq: [{ q: 'Are the site tests a diagnosis?', a: 'No. They support awareness and initial screening but do not replace professional assessment.' }, { q: 'Does mental health treatment always require medication?', a: 'No. Many conditions are managed through therapy and lifestyle changes according to a professional assessment.' }],
  },
  'early-cancer-detection': {
    title: 'Early Cancer Detection: When to Seek Medical Advice',
    description: 'How symptom awareness and screening suited to your age and risk can help detect some cancers earlier, without self-diagnosis or unnecessary tests.',
    keywords: ['early detection', 'cancer', 'screening', 'prevention'], category: 'Early Detection',
    sections: [
      { heading: 'Notice persistent changes', body: ['Seek medical advice for a persistent unusual change such as a new lump, unexplained bleeding, bowel changes, a lasting cough or unintended weight loss. These signs have many possible causes and do not by themselves mean cancer.', 'Tell your clinician when symptoms began, what changes them, and any relevant family history.'] },
      { heading: 'Screening should fit the person', body: ['Recommended screening varies by cancer type, age, sex, medical history and risk factors. Ask a clinician which tests are right for you and when; unsuitable screening can lead to misleading results or unnecessary procedures.', 'Do not wait for a routine screening appointment if you develop new or persistent symptoms.'] },
    ],
    faq: [{ q: 'Does screening prevent every cancer?', a: 'No. It can help detect certain cancers earlier, and no single test is right for everyone.' }, { q: 'Does a symptom mean cancer?', a: 'No. Symptoms have many causes; a clinician can assess whether testing is needed.' }],
    sources: [{ title: 'WHO: Cancer and early detection', url: 'https://www.who.int/news-room/fact-sheets/detail/cancer' }],
  },
  'heart-attack-warning-signs': {
    title: 'Heart Attack Warning Signs: Do Not Wait for the Pain to Pass',
    description: 'Learn possible heart attack signs and how to call for help and support someone safely.',
    keywords: ['heart attack', 'chest pain', 'heart symptoms', 'ambulance'], category: 'Heart Health',
    sections: [
      { heading: 'Signs that need urgent action', body: ['Possible signs include chest pressure or pain, discomfort in an arm, back, neck or jaw, shortness of breath, cold sweat, nausea or dizziness. Symptoms vary from person to person.', 'Call Egypt ambulance 123 immediately if a heart attack is possible. Do not drive yourself or wait to see whether symptoms pass.'] },
      { heading: 'Help without delay', body: ['Stop exertion, help the person rest comfortably, and monitor their awareness and breathing until help arrives. Follow emergency staff instructions and do not give medicine on your own.', 'If they become unresponsive and are not breathing normally, ask someone to get an AED if available and begin CPR if trained or follow dispatcher instructions.'] },
    ],
    faq: [{ q: 'Does chest pain have to be severe?', a: 'No. It may feel like pressure or mild discomfort, and other symptoms may be more noticeable.' }, { q: 'Can I wait and book an appointment?', a: 'Not with possible heart attack signs; call ambulance 123 immediately.' }],
    sources: [{ title: 'American Heart Association: Heart Attack Warning Signs', url: 'https://www.heart.org/en/health-topics/heart-attack/warning-signs-of-a-heart-attack' }],
  },
  'stroke-fast-signs': {
    title: 'Stroke: Remember Face, Arm, Speech and Time',
    description: 'A quick way to spot possible stroke signs and act immediately because time matters.',
    keywords: ['stroke', 'sudden weakness', 'FAST', 'emergency'], category: 'Emergency',
    sections: [
      { heading: 'Check for sudden signs', body: ['Ask the person to smile: is one side drooping? Ask them to raise both arms: does one drift down? Listen to their speech: is it slurred or unclear? Sudden vision or balance problems, or a severe unusual headache, can also occur.', 'Even if signs disappear after a few minutes, this remains an emergency and needs urgent assessment.'] },
      { heading: 'Time matters', body: ['Note when symptoms started and call Egypt ambulance 123 immediately. Do not give food, drink or medicine, and do not drive them if an ambulance is available.', 'Help them sit or lie safely and monitor breathing and awareness until help arrives.'] },
    ],
    faq: [{ q: 'What if the symptoms improve?', a: 'Still call an ambulance. Temporary symptoms can be a warning that needs urgent assessment.' }, { q: 'Should I give aspirin?', a: 'Do not give medicine on your own; the cause cannot be safely determined without assessment.' }],
    sources: [{ title: 'CDC: Stroke Signs and Symptoms', url: 'https://www.cdc.gov/stroke/signs-symptoms/' }],
  },
  'hands-only-cpr': {
    title: 'Hands-Only CPR: Steps That May Save a Life',
    description: 'What to do if an adult suddenly collapses and does not respond. Call emergency services and start chest compressions if they are not breathing normally.',
    keywords: ['CPR', 'chest compressions', 'first aid', 'emergency'], category: 'First Aid',
    sections: [
      { heading: 'Check and call for help', body: ['Make sure the scene is safe, call to the person and tap their shoulder. If they do not respond and are not breathing normally or are only gasping, ask someone to call 123 and get an AED if available.', 'Start chest compressions for an adult who suddenly collapses if you can, and continue until help arrives, normal breathing returns or you cannot continue.'] },
      { heading: 'Steady compressions in the center of the chest', body: ['Place the heel of one hand in the center of the chest and the other hand on top. Keep your arms straight, push hard and fast at 100–120 compressions per minute, and let the chest recoil between compressions.', 'This is educational guidance for adults. Children, infants and special situations need appropriate training; follow dispatcher instructions and take accredited hands-on training.'] },
    ],
    faq: [{ q: 'Should I check for a pulse?', a: 'Do not delay calling for help and starting compressions by trying to check a pulse if you are not a clinician.' }, { q: 'Does this replace training?', a: 'No. Practice on a manikin and emergency dispatcher guidance are important.' }],
    sources: [{ title: 'American Heart Association: Hands-Only CPR', url: 'https://www.heart.org/en/news/2023/02/01/11-things-to-know-to-save-a-life-with-cpr' }],
  },
  'severe-bleeding-first-aid': {
    title: 'First Aid for Severe Bleeding',
    description: 'Safe steps to control severe external bleeding until medical help arrives.',
    keywords: ['severe bleeding', 'wound first aid', 'direct pressure'], category: 'First Aid',
    sections: [
      { heading: 'Call emergency services and apply direct pressure', body: ['If bleeding is heavy or will not stop, call Egypt ambulance 123. Wear gloves if available, place gauze or a clean cloth over the wound, and press firmly and steadily.', 'If the dressing becomes soaked, do not lift it to inspect the wound. Add more layers and keep pressing. Help the person lie down, keep them warm and monitor their breathing.'] },
      { heading: 'Avoid these actions', body: ['Do not remove an object embedded in the wound; press around it and stabilize it. Do not wash a heavily bleeding wound or place powders or household products inside it.', 'A tourniquet designed for severe bleeding should be used by someone trained or as directed by emergency services.'] },
    ],
    faq: [{ q: 'Should I raise the injured limb?', a: 'Direct pressure and calling for help come first; do not move a limb that may be broken.' }, { q: 'When should I call an ambulance?', a: 'Immediately for heavy or persistent bleeding, a deep wound, an embedded object, weakness or dizziness.' }],
    sources: [{ title: 'American Red Cross: Life-Threatening External Bleeding', url: 'https://www.redcross.org/take-a-class/resources/learn-first-aid/bleeding-life-threatening-external' }],
  },
  'burn-first-aid': {
    title: 'Burn First Aid: Cool It First',
    description: 'First steps for thermal burns and when urgent medical assessment is needed.',
    keywords: ['burns', 'burn first aid', 'running water'], category: 'First Aid',
    sections: [
      { heading: 'Cool the burn under running water', body: ['Move the person away from the heat source safely and cool the area under cool or lukewarm running water for 20 minutes. Remove nearby jewelry or clothing only if it is not stuck to the skin.', 'After cooling, cover the area with a clean, non-stick covering. Do not use ice, oils or toothpaste, and do not burst blisters.'] },
      { heading: 'Get care for serious burns', body: ['Call 123 or go to emergency care if the burn is large or deep, affects the face, hands or sensitive areas, was caused by electricity or chemicals, or causes breathing difficulty.', 'Do not remove fabric stuck to the skin or apply cream to a large burn before medical assessment.'] },
    ],
    faq: [{ q: 'How long should I cool a burn?', a: 'NHS guidance recommends cooling it under cool running water for 20 minutes.' }, { q: 'Should I apply ice or toothpaste?', a: 'No. Use running water for initial cooling.' }],
    sources: [{ title: 'NHS: Burns and Scalds', url: 'https://www.nhs.uk/conditions/burns-and-scalds/' }],
  },
  'blood-pressure-checks': {
    title: 'Blood Pressure: Why You Need to Check It',
    description: 'High blood pressure may not cause obvious symptoms. Learn why measurement and regular medical follow-up matter.',
    keywords: ['blood pressure', 'hypertension', 'screening', 'heart health'], category: 'Heart Health',
    sections: [
      { heading: 'It may have no symptoms', body: ['A person may have high blood pressure without feeling anything. Headache or dizziness alone cannot tell you your blood pressure; measurement is needed.', 'If a reading is high, repeat it correctly and discuss the results with a clinician instead of diagnosing yourself from one reading.'] },
      { heading: 'Make follow-up part of preventive care', body: ['Ask a health professional how often you should check, especially if you have a family history, risk factors or take treatment.', 'Do not stop or change blood pressure medicine without your clinician. Chest pain, severe shortness of breath or sudden neurological symptoms require emergency care; call 123.'] },
    ],
    faq: [{ q: 'Can symptoms tell me if my pressure is high?', a: 'Often not; there may be no obvious symptoms, so measurement is needed.' }, { q: 'Can I stop treatment when a reading improves?', a: 'Do not stop treatment or adjust the dose without consulting your clinician.' }],
    sources: [{ title: 'WHO: Hypertension', url: 'https://www.who.int/news-room/fact-sheets/detail/hypertension' }],
  },
  'diabetes-early-screening': {
    title: 'Diabetes: Symptoms and Early Testing',
    description: 'Learn common diabetes symptoms and why testing may matter even when symptoms are absent.',
    keywords: ['diabetes', 'diabetes symptoms', 'blood sugar test', 'early detection'], category: 'General Health',
    sections: [
      { heading: 'Symptoms that deserve assessment', body: ['Possible signs include thirst, frequent urination, hunger, fatigue, blurred vision, slow-healing wounds or unintended weight loss. These symptoms alone do not confirm a diagnosis.', 'Prediabetes and some type 2 diabetes may have no obvious symptoms; ask a clinician about testing if you have risk factors.'] },
      { heading: 'Testing and next steps', body: ['Clinicians diagnose diabetes using laboratory tests and may repeat a test to confirm results. Discuss results and follow-up with a health professional.', 'If symptoms come with vomiting, difficulty breathing or severe confusion, call ambulance 123 immediately.'] },
    ],
    faq: [{ q: 'Does having no symptoms mean my glucose is normal?', a: 'Not always. Some people have no obvious symptoms, and testing can clarify whether assessment is needed.' }, { q: 'Is one home meter reading enough to diagnose diabetes?', a: 'Do not rely on a single home reading for diagnosis; consult a clinician about appropriate tests.' }],
    sources: [{ title: 'CDC: Diabetes Symptoms', url: 'https://www.cdc.gov/diabetes/signs-symptoms/' }, { title: 'CDC: Diabetes Testing', url: 'https://www.cdc.gov/diabetes/diabetes-testing/index.html' }],
  },
  'infection-outbreak-prevention': {
    title: 'Preventing Infection and the Spread of Respiratory Illness',
    description: 'Simple daily habits that reduce the spread of respiratory infections at home, work and in crowded places.',
    keywords: ['infection', 'disease spread', 'ventilation', 'hand hygiene', 'prevention'], category: 'General Health',
    sections: [
      { heading: 'Reduce opportunities for transmission', body: ['Wash your hands regularly, cover your mouth and nose when coughing or sneezing, and dispose of tissues safely. Avoid touching your face with unwashed hands.', 'Improve ventilation indoors and limit close contact when you are sick. A mask may help in crowded places or when around someone at higher risk of complications.'] },
      { heading: 'Follow current guidance and seek care', body: ['Precautions vary by illness and local spread. Follow guidance from the Egyptian Ministry of Health and trusted health agencies, and do not use antibiotics without a prescription.', 'Seek urgent help for breathing difficulty or reduced awareness; call ambulance 123 in a critical emergency.'] },
    ],
    faq: [{ q: 'Do antibiotics treat common colds?', a: 'Antibiotics do not treat viruses; use them only when prescribed after medical assessment.' }, { q: 'What is a key step in enclosed spaces?', a: 'Good ventilation, hand hygiene and limiting contact while sick all help.' }],
    sources: [{ title: 'WHO: How Can I Avoid Getting the Flu?', url: 'https://www.who.int/news-room/questions-and-answers/item/how-can-i-avoid-getting-the-flu' }],
  },
  'flu-vaccination-prevention': {
    title: 'Seasonal Influenza: Vaccination and Prevention',
    description: 'Awareness about seasonal influenza vaccination and prevention habits, with advice to consult a health professional if you are at higher risk.',
    keywords: ['seasonal influenza', 'flu vaccine', 'infection prevention', 'vaccination'], category: 'General Health',
    sections: [
      { heading: 'Vaccination is an important prevention measure', body: ['Health agencies recommend seasonal vaccination according to local guidance, especially for people at higher risk of complications. Ask a clinician or pharmacist about timing and suitability for your health.', 'Recommended vaccines can change from season to season, so use current guidance from health authorities.'] },
      { heading: 'Habits that protect you and others', body: ['Wash your hands, cover coughs and sneezes, and improve room ventilation. If you become ill, limit contact and seek medical advice if you are at higher risk or symptoms worsen.', 'Shortness of breath, chest pain, confusion or rapid deterioration need urgent care; call ambulance 123 when needed.'] },
    ],
    faq: [{ q: 'Does the vaccine guarantee I will not get sick?', a: 'No vaccine guarantees that every infection will be prevented; it is a recommended prevention measure that may reduce illness and complications.' }, { q: 'Should I ask a clinician before vaccination?', a: 'Ask a health professional if you have had a severe allergy, a specific health condition or questions about suitability.' }],
    sources: [{ title: 'WHO: How Can I Avoid Getting the Flu?', url: 'https://www.who.int/news-room/questions-and-answers/item/how-can-i-avoid-getting-the-flu' }],
  },
};

export const localizeArticle = (article: Article, language: 'ar' | 'en'): Article => {
  if (language === 'ar') return article;
  const english = englishArticles[article.slug];
  return english ? { ...article, ...english } : article;
};
