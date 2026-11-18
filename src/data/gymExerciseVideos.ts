export interface GymExerciseVideo {
  url: string;
  direct: boolean;
  source: string;
}

const videos: Array<{ aliases: string[]; url: string; source: string }> = [
  { aliases: ['dumbbell incline bench press', 'incline dumbbell bench press', 'incline dumbbell press'], url: 'https://youtu.be/wLfIJPW-fuA', source: 'University of Wyoming Recreation' },
  { aliases: ['dumbbell flat bench press', 'dumbbell bench press'], url: 'https://youtu.be/EYKZyUM5jNI', source: 'University of Wyoming Recreation' },
  { aliases: ['barbell flat bench press', 'barbell bench press', 'flat bench press', 'bench press'], url: 'https://www.youtube.com/watch?v=IdFD4wF0MoM', source: 'Exercise Is Medicine — University of Arkansas' },
  { aliases: ['barbell incline bench press', 'incline barbell press'], url: 'https://www.youtube.com/results?search_query=barbell+incline+bench+press+proper+form', source: 'Exact exercise video search' },
  { aliases: ['decline barbell press', 'decline bench press'], url: 'https://www.youtube.com/results?search_query=barbell+decline+bench+press+proper+form', source: 'Exact exercise video search' },
  { aliases: ['barbell back squat', 'back squat', 'barbell squat', 'squat'], url: 'https://youtu.be/6_714nCAYjU', source: 'University of Wyoming Recreation' },
  { aliases: ['front squat'], url: 'https://youtu.be/R2pKOKAfciE', source: 'University of Wyoming Recreation' },
  { aliases: ['goblet squat'], url: 'https://youtu.be/P5a5dgbHm_s', source: 'University of Wyoming Recreation' },
  { aliases: ['bulgarian split squat'], url: 'https://www.youtube.com/results?search_query=bulgarian+split+squat+proper+form', source: 'Exact exercise video search' },
  { aliases: ['sumo squat', 'barbell sumo squat'], url: 'https://youtu.be/xE2plOkdFF4', source: 'University of Wyoming Recreation' },
  { aliases: ['barbell deadlift', 'deadlift'], url: 'https://youtu.be/mwFvvvdK7uI', source: 'University of Wyoming Recreation' },
  { aliases: ['romanian deadlift', 'rdl'], url: 'https://www.acefitness.org/continuing-education/certified/may-2025/8865/the-ace-do-it-better-series-the-romanian-deadlift/', source: 'ACE — Romanian deadlift technique' },
  { aliases: ['leg press'], url: 'https://youtu.be/zr_Abx30hfE', source: 'University of Wyoming Recreation' },
  { aliases: ['seated leg curl', 'lying leg curl', 'leg curl'], url: 'https://youtu.be/nDk7KPzqZ4I', source: 'University of Wyoming Recreation' },
  { aliases: ['leg extension'], url: 'https://youtu.be/CKGphCbvHgc', source: 'University of Wyoming Recreation' },
  { aliases: ['standing calf raise'], url: 'https://www.youtube.com/results?search_query=standing+calf+raise+proper+form', source: 'Exact exercise video search' },
  { aliases: ['seated cable row', 'cable row', 'seated row'], url: 'https://youtu.be/Niq7g0qD_9k', source: 'Vanderbilt Recreation and Wellness Center' },
  { aliases: ['barbell bent over row', 'barbell row', 'bent over row'], url: 'https://youtu.be/aaDimGO_KYE', source: 'University of Wyoming Recreation' },
  { aliases: ['single arm dumbbell row', 'single-arm dumbbell row', 'dumbbell row', 'one arm row'], url: 'https://youtu.be/LIOwNQJj818', source: 'University of Wyoming Recreation' },
  { aliases: ['wide grip lat pulldown', 'close grip lat pulldown', 'neutral grip lat pulldown', 'lat pulldown', 'pulldown'], url: 'https://www.youtube.com/watch?v=qYFf4nA50ls', source: 'University of Wyoming Recreation' },
  { aliases: ['pull up', 'pull-up', 'chin up', 'chin-up'], url: 'https://www.youtube.com/results?search_query=pull+up+proper+form+exercise+demonstration', source: 'Exact exercise video search' },
  { aliases: ['machine chest press', 'cybex chest press', 'keiser biaxial chest press'], url: 'https://youtu.be/GBUr4-nAcf8', source: 'University of Wyoming Recreation' },
  { aliases: ['dumbbell chest fly', 'chest fly', 'dumbbell fly', 'fly'], url: 'https://youtu.be/NboDKJO4UBI', source: 'University of Wyoming Recreation' },
  { aliases: ['cybex chest fly', 'cable chest fly', 'cable fly', 'machine chest fly'], url: 'https://youtu.be/aIsOnLGtHBA', source: 'University of Wyoming Recreation' },
  { aliases: ['chest dip', 'triceps dip', 'dip'], url: 'https://www.youtube.com/results?search_query=chest+dips+proper+form+exercise+demonstration', source: 'Exact exercise video search' },
  { aliases: ['push up', 'push-up'], url: 'https://youtu.be/2T3xyvDUKIk', source: 'University of Wyoming Recreation' },
  { aliases: ['barbell overhead press', 'standing barbell military press', 'military press', 'barbell shoulder press'], url: 'https://youtu.be/pKVnjDcn-bc', source: 'University of Wyoming Recreation' },
  { aliases: ['dumbbell overhead press', 'dumbbell shoulder press'], url: 'https://youtu.be/EGH0Qm-SDGw', source: 'University of Wyoming Recreation' },
  { aliases: ['machine shoulder press', 'cybex overhead press'], url: 'https://youtu.be/dT_NS6S3UyY', source: 'University of Wyoming Recreation' },
  { aliases: ['lateral raise', 'side raise'], url: 'https://youtu.be/o310o8_aucY', source: 'University of Wyoming Recreation' },
  { aliases: ['rear delt fly', 'reverse fly', 'reverse pec deck'], url: 'https://youtu.be/PPFWcENk84k', source: 'University of Wyoming Recreation' },
  { aliases: ['face pull'], url: 'https://www.youtube.com/results?search_query=cable+face+pull+proper+form', source: 'Exact exercise video search' },
  { aliases: ['barbell bicep curl', 'bicep curl', 'biceps curl'], url: 'https://youtu.be/iOmCoDXj6jg', source: 'University of Wyoming Recreation' },
  { aliases: ['hammer curl'], url: 'https://www.youtube.com/results?search_query=dumbbell+hammer+curl+proper+form', source: 'Exact exercise video search' },
  { aliases: ['triceps pushdown', 'triceps push down', 'rope triceps', 'cable triceps pushdown'], url: 'https://www.youtube.com/watch?v=KnS34QyBWks', source: 'University of Wyoming Recreation' },
  { aliases: ['overhead triceps extension', 'triceps extension', 'french press', 'skull crusher'], url: 'https://youtu.be/K4qVeOcxdFE', source: 'University of Wyoming Recreation' },
  { aliases: ['triceps kickback'], url: 'https://youtu.be/gVUFaVmqR98', source: 'University of Wyoming Recreation' },
  { aliases: ['hip thrust'], url: 'https://www.youtube.com/results?search_query=barbell+hip+thrust+proper+form', source: 'Exact exercise video search' },
  { aliases: ['glute bridge', 'hip bridge'], url: 'https://www.youtube.com/results?search_query=glute+bridge+proper+form', source: 'Exact exercise video search' },
  { aliases: ['shrug'], url: 'https://youtu.be/cROFHxhOjE8', source: 'University of Wyoming Recreation' },
  { aliases: ['crunch'], url: 'https://youtu.be/5uiKrMxaXFA', source: 'University of Wyoming Recreation' },
  { aliases: ['plank'], url: 'https://www.youtube.com/results?search_query=plank+exercise+proper+form', source: 'Exact exercise video search' },
];

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const orderedVideos = videos.flatMap((video) => video.aliases.map((alias) => ({ ...video, alias })))
  .sort((a, b) => normalize(b.alias).length - normalize(a.alias).length);

/** Direct demos link to the matching movement; remaining custom movements open a name-specific video search. */
export const getGymExerciseVideo = (exerciseName: string): GymExerciseVideo => {
  const normalized = normalize(exerciseName);
  const match = orderedVideos.find(({ alias }) => normalized.includes(normalize(alias)));
  return match
    ? { url: match.url, direct: !match.url.includes('/results?'), source: match.source }
    : {
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exerciseName} proper form exercise demonstration`)}`,
        direct: false,
        source: 'Exact exercise video search',
      };
};

export const getGymExerciseInstructions = (exerciseName: string, english: boolean) => {
  const name = normalize(exerciseName);
  const rawName = exerciseName.toLowerCase();
  const matches = (pattern: RegExp, arabicPattern?: RegExp) => pattern.test(name) || Boolean(arabicPattern?.test(rawName));

  if (matches(/leg curl/, /ثني.*(?:ركبة|ساق)|خلفية.*(?:جهاز|فخذ)/)) return english
    ? 'Adjust the pad just above your heels and keep your hips against the bench. Curl until your hamstrings contract without lifting your hips, then lower slowly until your knees are nearly straight; do not force a locked position.'
    : 'اضبط الوسادة فوق الكعبين قليلًا وثبّت الحوض على المقعد. اثنِ الركبتين حتى تنقبض العضلة الخلفية دون رفع الحوض، ثم ارجع ببطء حتى تقترب الركبتان من الاستقامة دون قفلهما بالقوة.';
  if (matches(/leg extension/, /فرد.*(?:ركبة|ساق)|أمامية.*(?:جهاز|فخذ)/)) return english
    ? 'Sit with your back supported and the roller just above the ankles. Extend the knees smoothly to a comfortable near-straight position, pause, then lower until the knees are bent again. Keep the hips down and avoid kicking or locking hard.'
    : 'اجلس وظهرك مسنود والوسادة فوق الكاحلين. افرد الركبتين بسلاسة حتى تقتربا من الاستقامة المريحة، ثم اخفض الوزن حتى تنثني الركبتان. ثبّت الحوض وتجنب الركل أو قفل الركبة بعنف.';
  if (matches(/leg press/, /ضغط.*(?:رجل|ساق)|دفع.*(?:رجل|ساق)/)) return english
    ? 'Set your feet about shoulder-width on the platform and keep your whole foot supported. Lower the sled until your knees bend comfortably while your lower back stays against the pad; press back without locking your knees or letting them collapse inward.'
    : 'ضع القدمين بعرض الكتفين تقريبًا واجعل القدم كاملة على المنصة. اخفض الوزن حتى تنثني الركبتان بمدى مريح مع بقاء أسفل الظهر ملاصقًا للمسند، ثم ادفع دون قفل الركبتين أو دخولهما للداخل.';
  if (matches(/calf raise/, /رفع.*(?:سمانة|كعب)|سمانة/)) return english
    ? 'Stand with the balls of your feet on the platform and hold support lightly. Lower your heels to a comfortable calf stretch, then rise as high as you can without bouncing. Keep the knees softly straight and pause briefly at the top.'
    : 'قف واجعل مقدمة القدم على المنصة وتمسك بالدعامة بخفة. اخفض الكعبين حتى شد مريح في السمانة، ثم ارفع لأعلى مدى مريح دون ارتداد. حافظ على الركبتين مستقرتين وتوقف لحظة بالأعلى.';
  if (matches(/squat|lunge|split squat/, /سكوات|قرفصاء|اندفاع|لونج/)) return english
    ? 'Stand around shoulder-width with toes turned out only as comfortable. Brace your trunk, send hips back and bend the knees in line with the toes. Descend only as far as you can keep your heels down and torso controlled; stand by pushing through the whole foot. Use a hand support if balance is limited.'
    : 'قف بعرض الكتفين تقريبًا ووجّه أصابع القدم للخارج بقدر مريح. شدّ الجذع وارجع بالورك مع ثني الركبتين في اتجاه أصابع القدم. انزل فقط للمدى الذي يبقي الكعبين ثابتين والجذع متحكمًا فيه، ثم ادفع بالقدم كاملة للوقوف. استخدم دعامة إذا كان التوازن صعبًا.';
  if (matches(/hip thrust|glute bridge|hip bridge/, /دفع الورك|جسر الورك|جسر الأرداف/)) return english
    ? 'For a hip thrust, support the upper back on a bench; for a bridge, lie on the floor. Place feet about hip-width apart, brace your trunk and drive through the whole foot. Finish when hips are extended without arching the lower back, then lower under control.'
    : 'في دفع الورك اسند أعلى الظهر على مقعد، وفي الجسر استلقِ على الأرض. ضع القدمين بعرض الحوض وشدّ الجذع وادفع بالقدم كاملة. توقف عند امتداد الورك دون تقويس أسفل الظهر، ثم انزل بتحكم.';
  if (matches(/deadlift|romanian deadlift|rdl|good morning/, /رفعة ميتة|رفعة رومانية|رومانيان|انحناء الورك/)) return english
    ? 'Stand with feet about hip-width and the load close to your legs. Soften the knees, push the hips backward and keep your spine neutral. Lower only until you feel a hamstring stretch while your back stays steady, then stand by bringing the hips forward; do not force the weight to the floor.'
    : 'قف والقدمان بعرض الحوض والوزن قريب من الساقين. اثنِ الركبتين قليلًا وارجع بالورك للخلف مع ظهر محايد. انزل حتى شد مريح في العضلة الخلفية مع ثبات الظهر، ثم قف بإرجاع الورك للأمام؛ لا تجبر الوزن على لمس الأرض.';
  if (matches(/row/, /سحب أرضي|تجديف|سحب.*(?:جالس|دمبل|بار)/)) return english
    ? 'Sit or hinge with a stable, neutral torso and feet firmly supported. Pull the handle toward your lower ribs by moving your elbows back, pause without shrugging, then reach forward slowly until your shoulder blades move naturally. Do not round your back or swing.'
    : 'اجلس أو انحنِ مع ثبات الجذع والظهر المحايد والقدمين مدعومتين. اسحب المقبض نحو أسفل الضلوع بتحريك المرفقين للخلف، توقف دون رفع الكتفين، ثم مد الذراعين ببطء حتى تتحرك لوحتا الكتف طبيعيًا. لا تدوّر الظهر ولا تتأرجح.';
  if (matches(/pulldown|pull up|chin up|lat pull/, /سحب عالي|عقلة|سحب لات/)) return english
    ? 'Anchor your thighs on the seat and keep a slight, steady lean. Pull the bar in front toward the upper chest by bringing elbows down; never pull behind the neck. Return overhead slowly until the arms lengthen comfortably without losing control.'
    : 'ثبّت الفخذين أسفل الوسادة وحافظ على ميل بسيط وثابت. اسحب البار أمام الجسم نحو أعلى الصدر مع إنزال المرفقين؛ لا تسحبه خلف الرقبة. أعد الذراعين لأعلى ببطء حتى يتمددان بمدى مريح مع التحكم.';
  if (matches(/chest fly|pec deck|reverse fly|rear delt fly|cable fly/, /تفتيح|فلاي|رفرفة خلفي/)) return english
    ? 'Set your seat so the handles align with your chest or shoulders, depending on the machine. Keep a soft bend in the elbows and shoulders relaxed. Open only to a comfortable chest or shoulder stretch, then bring the arms together smoothly; do not force a deep stretch.'
    : 'اضبط المقعد بحيث تكون المقابض بمحاذاة الصدر أو الكتفين حسب الجهاز. اترك ثنيًا بسيطًا في المرفقين واسترخِ بالكتفين. افتح الذراعين حتى شد مريح فقط ثم اجمعهما بسلاسة، دون إجبار الكتف على تمدد عميق.';
  if (matches(/bench press|chest press|push up|dip/, /بنش|ضغط صدر|ضغط أرضي|متوازي/)) return english
    ? 'Set your feet firmly and keep your shoulder blades gently back against the bench. Align wrists over forearms and lower the bar or handles toward mid-chest only as far as your shoulders stay comfortable; press smoothly without bouncing. Use a spotter for heavy barbell sets.'
    : 'ثبّت القدمين على الأرض واجمع لوحي الكتف للخلف برفق على المقعد. اجعل الرسغ فوق الساعد، وانزل بالبار أو المقابض نحو منتصف الصدر للمدى الذي يبقى فيه الكتف مرتاحًا، ثم ادفع بسلاسة دون ارتداد. استخدم مراقبًا للأوزان الثقيلة.';
  if (matches(/overhead press|shoulder press|military press/, /ضغط كتف|ضغط عسكري/)) return english
    ? 'Stand with feet stable or sit with your back supported. Keep ribs stacked over the pelvis and wrists above elbows. Press overhead only through a comfortable range without leaning back; lower slowly until hands reach about shoulder level.'
    : 'قف بقدمين ثابتتين أو اجلس مع إسناد الظهر. حافظ على الأضلاع فوق الحوض والرسغ فوق المرفق. ادفع لأعلى ضمن مدى مريح دون إرجاع الظهر للخلف، ثم انزل ببطء حتى مستوى الكتفين تقريبًا.';
  if (matches(/lateral raise|side raise|rear delt/, /رفرفة جانبي|رفع جانبي|كتف خلفي/)) return english
    ? 'Stand tall with a slight elbow bend and shoulders relaxed. Raise the arms out and slightly forward to about shoulder height, or a comfortable lower range, then lower slowly. Keep the torso still and avoid shrugging or swinging.'
    : 'قف باعتدال مع ثني بسيط للمرفقين واسترخاء الكتفين. ارفع الذراعين للجانب وقليلًا للأمام حتى مستوى الكتف تقريبًا أو مدى أقل مريح، ثم اخفضهما ببطء. ثبّت الجذع وتجنب هز الكتفين أو التأرجح.';
  if (matches(/curl|triceps extension|pushdown|kickback|skull crusher/, /بايسبس|ترايسبس|ثني الذراع|فرد الذراع/)) return english
    ? 'Keep your upper arms and torso steady, wrists neutral and elbows comfortable. Bend or extend the elbows through a pain-free range, then return slowly until the arm is nearly straight or bent as appropriate. Avoid swinging or forcing the joint to lock.'
    : 'ثبّت أعلى الذراع والجذع واجعل الرسغ محايدًا والمرفق مرتاحًا. اثنِ أو افرد المرفق في مدى خالٍ من الألم، ثم ارجع ببطء حتى يقترب الذراع من الاستقامة أو الثني حسب الحركة. تجنب التأرجح أو قفل المفصل بالقوة.';
  if (matches(/plank|crunch|sit up/, /بلانك|بلانك|كرنش|بطن/)) return english
    ? 'For a plank, keep a straight line from head to hips and brace without holding your breath. For a crunch, keep the lower back comfortable and lift the shoulder blades slightly without pulling the neck. Use a range you can control.'
    : 'في البلانك حافظ على خط مستقيم من الرأس إلى الورك وشدّ الجذع مع استمرار التنفس. في الكرنش أبقِ أسفل الظهر مرتاحًا وارفع لوحي الكتف قليلًا دون شد الرقبة. استخدم مدى تستطيع التحكم فيه.';

  return english
    ? 'Start with a light load. Set a stable stance, keep your spine and joints comfortable, and move slowly through the range you can control. Avoid momentum and stop if you feel sharp pain; ask a qualified trainer to check unfamiliar technique.'
    : 'ابدأ بوزن خفيف. ثبّت وقفتك وحافظ على راحة الظهر والمفاصل، وتحرك ببطء في مدى تستطيع التحكم فيه. تجنب الاندفاع وتوقف عند ألم حاد، واستعن بمدرب مؤهل لمراجعة الحركة غير المألوفة.';
};
